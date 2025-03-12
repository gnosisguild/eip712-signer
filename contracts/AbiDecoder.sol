// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.17 <0.9.0;

enum AbiTypeKey {
  None,
  Static,
  Dynamic,
  Tuple,
  Array,
  AbiEncodedWithSelector,
  AbiEncoded
}

struct AbiType {
  AbiTypeKey key;
  bytes32 typeHash;
  uint256[] fields;
}

struct Payload {
  AbiTypeKey key;
  bytes32 typeHash;
  uint256 location;
  uint256 size;
  Payload[] children;
}

library AbiDecoder {
  error CalldataOutOfBounds();

  /**
   * @dev Maps the location and size of each abo part in the encoded data.
   * @param data TODO
   * @param abiTypes TODO
   * @param index TODO
   * @return result The mapped location and size of parameters in the encoded transaction data.
   */
  function inspect(
    bytes calldata data,
    AbiType[] calldata abiTypes,
    uint256 index
  ) internal pure returns (Payload memory result) {
    /*
     * The parameter encoding area contains a head region, divided into
     * 32-byte chunks. Each parameter occupies one chunk in head:
     * - Static parameters are encoded inline.
     * - Dynamic parameters store an offset pointing to the tail region,
     *   where the actual encoded data resides. Note the offset is relative
     *   to the start of each block, and not to the start of the buffer
     */
    __block__(
      data,
      abiTypes[index].key == AbiTypeKey.AbiEncodedWithSelector ? 4 : 0,
      abiTypes,
      index,
      abiTypes[index].fields.length,
      result
    );
    result.key = abiTypes[index].key;
    result.location = 0;
    result.size = data.length;
  }

  /**
   * @dev Walks through a parameter encoding tree and maps their location and
   * size within calldata.
   * @param data The encoded transaction data.
   * @param location The current offset within the calldata buffer.
   * @param abiTypes TODO
   * @param index The current node being traversed within the parameter tree.
   * @param result The location and size of the parameter within calldata.
   */
  function _walk(
    bytes calldata data,
    uint256 location,
    AbiType[] calldata abiTypes,
    uint256 index,
    Payload memory result
  ) private pure {
    AbiTypeKey key = abiTypes[index].key;

    if (key == AbiTypeKey.Static) {
      result.size = 32;
    } else if (key == AbiTypeKey.Dynamic) {
      result.size = 32 + _ceil32(_uint256At(data, location));
    } else if (key == AbiTypeKey.Tuple) {
      __block__(
        data,
        location,
        abiTypes,
        index,
        abiTypes[index].fields.length,
        result
      );
      result.typeHash = abiTypes[index].typeHash;
    } else if (key == AbiTypeKey.Array) {
      __block__(
        data,
        location + 32,
        abiTypes,
        index,
        _uint256At(data, location),
        result
      );
      result.size += 32;
    } else if (
      key == AbiTypeKey.AbiEncodedWithSelector || key == AbiTypeKey.AbiEncoded
    ) {
      __block__(
        data,
        location + 32 + (key == AbiTypeKey.AbiEncodedWithSelector ? 4 : 0),
        abiTypes,
        index,
        abiTypes[index].fields.length,
        result
      );
      result.size = 32 + _ceil32(_uint256At(data, location));
    }
    result.location = location;
    result.key = key;
  }

  /**
   * @dev Recursively decodes a block of parameters from transaction data according to a type tree.
   * @param data The encoded transaction data (calldata for gas efficiency).
   * @param location The current position in bytes where the parameter block starts.
   * @param abiTypes The array of parameter definitions forming the type tree.
   * @param index The index of the current parameter being processed in the params array.
   * @param result The decoded payload structure where results will be stored.
   * @notice This function handles two types of blocks:
   *         1. Array blocks: Length determined by a 32-byte word preceding the data
   *         2. Struct blocks: Length determined by the number of fields in the parameter
   */
  function __block__(
    bytes calldata data,
    uint256 location,
    AbiType[] calldata abiTypes,
    uint256 index,
    uint256 blockLength,
    Payload memory result
  ) private pure {
    AbiType calldata param = abiTypes[index];

    result.children = new Payload[](blockLength);

    bool isInline;
    uint256 offset;
    for (uint256 i; i < blockLength; i++) {
      if (i == 0 || param.key != AbiTypeKey.Array) {
        // For structs or the first element of an array, calculate if element inline
        // For array elements after the first, they all have the same inline status
        isInline = _isInline(abiTypes, param.fields[i]);
      }

      _walk(
        data,
        _locationInBlock(data, location, offset, isInline),
        abiTypes,
        param.fields[param.key == AbiTypeKey.Array ? 0 : i],
        result.children[i]
      );

      // Update the total size and offset
      uint256 childSize = result.children[i].size;

      // For non-inline elements, we need to account for the 32-byte pointer
      result.size += childSize + (isInline ? 0 : 32);

      // Update the offset in the block for the next element
      offset += isInline ? childSize : 32;
    }
  }

  /**
   * @dev Returns the location of a block chunk, which can be either inline in
   * the HEAD region or at an offset in the TAIL region.
   *
   * @param data The encoded transaction calldata
   * @param location absolute location, points to the start of HEAD region
   * @param offset relative offset of the chunk within the HEAD region
   * @param isInline Whether chunk is encoded inline within HEAD or at the TAIL
   *
   * @return The absolute location of the block chunk
   */
  function _locationInBlock(
    bytes calldata data,
    uint256 location,
    uint256 offset,
    bool isInline
  ) private pure returns (uint256) {
    if (isInline) {
      return location + offset;
    } else {
      return location + _uint256At(data, location + offset);
    }
  }

  /**
   * @dev Recursively traverses the ABI parameter tree to check if the parameter
   * is inline. A parameter is inline if it's either a static type or a tuple
   * comprised solely of static types. Arrays and dynamic types break the inline
   * chain.
   * @param abiTypes Array of ABI parameters.
   * @param index Index of the parameter to start traversing.
   * @return bool True if the parameter is inline, false otherwise.
   */
  function _isInline(
    AbiType[] calldata abiTypes,
    uint256 index
  ) private pure returns (bool) {
    AbiType calldata abiType = abiTypes[index];

    if (abiType.key == AbiTypeKey.Tuple) {
      for (uint256 i; i < abiType.fields.length; ++i) {
        if (!_isInline(abiTypes, abiType.fields[i])) {
          return false;
        }
      }
      return true;
    }

    return abiType.key == AbiTypeKey.Static;
  }

  /**
   * @dev Loads a word from calldata.
   * @param data The calldata to load the word from.
   * @param location The starting location of the slice.
   * @return result 32 byte word from calldata.
   */
  function _uint256At(
    bytes calldata data,
    uint256 location
  ) private pure returns (uint256 result) {
    if (location + 32 > data.length) {
      revert CalldataOutOfBounds();
    }
    assembly {
      result := calldataload(add(data.offset, location))
    }
  }

  function _ceil32(uint256 size) private pure returns (uint256) {
    // pad size. Source: http://www.cs.nott.ac.uk/~psarb2/G51MPC/slides/NumberLogic.pdf
    return ((size + 32 - 1) / 32) * 32;
  }
}
