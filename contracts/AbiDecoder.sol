// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.17 <0.9.0;

enum AbiType {
  None,
  Static,
  Dynamic,
  Array,
  Tuple
}

struct AbiParam {
  AbiType _type;
  bytes32 typeHash;
  uint256[] fields;
}

struct AbiPayload {
  AbiType _type;
  bytes32 typeHash;
  uint256 location;
  uint256 size;
  AbiPayload[] children;
}

library AbiDecoder {
  error CalldataOutOfBounds();

  /**
   * @dev Maps the location and size of each abo part in the encoded data.
   * @param data TODO
   * @param params TODO
   * @param paramIndex TODO
   * @return result The mapped location and size of parameters in the encoded transaction data.
   */
  function inspect(
    bytes calldata data,
    AbiParam[] calldata params,
    uint256 paramIndex
  ) internal pure returns (AbiPayload memory result) {
    require(params[paramIndex]._type == AbiType.Tuple);
    /*
     * The parameter encoding area contains a head region, divided into
     * 32-byte chunks. Each parameter occupies one chunk in head:
     * - Static parameters are encoded inline.
     * - Dynamic parameters store an offset pointing to the tail region,
     *   where the actual encoded data resides. Note the offset is relative
     *   to the start of each block, and not to the start of the buffer
     */
    __block__(data, 0, params, paramIndex, result);
    result.typeHash = params[paramIndex].typeHash;
  }

  /**
   * @dev Walks through a parameter encoding tree and maps their location and
   * size within calldata.
   * @param data The encoded transaction data.
   * @param location The current offset within the calldata buffer.
   * @param params TODO
   * @param paramIndex The current node being traversed within the parameter tree.
   * @param result The location and size of the parameter within calldata.
   */
  function _walk(
    bytes calldata data,
    uint256 location,
    AbiParam[] calldata params,
    uint256 paramIndex,
    AbiPayload memory result
  ) private pure {
    AbiType _type = params[paramIndex]._type;

    if (_type == AbiType.Static) {
      result.size = 32;
    } else if (_type == AbiType.Dynamic) {
      result.size = 32 + _ceil32(uint256(word(data, location)));
    } else if (_type == AbiType.Tuple) {
      __block__(data, location, params, paramIndex, result);
      result.typeHash = params[paramIndex].typeHash;
    } else {
      __block__(data, location + 32, params, paramIndex, result);
    }
    result._type = params[paramIndex]._type;
    result.location = location;
  }

  /**
   * @dev Recursively decodes a block of parameters from transaction data according to a type tree.
   * @param data The encoded transaction data (calldata for gas efficiency).
   * @param location The current position in bytes where the parameter block starts.
   * @param params The array of parameter definitions forming the type tree.
   * @param paramIndex The index of the current parameter being processed in the params array.
   * @param result The decoded payload structure where results will be stored.
   * @notice This function handles two types of blocks:
   *         1. Array blocks: Length determined by a 32-byte word preceding the data
   *         2. Struct blocks: Length determined by the number of fields in the parameter
   */
  function __block__(
    bytes calldata data,
    uint256 location,
    AbiParam[] calldata params,
    uint256 paramIndex,
    AbiPayload memory result
  ) private pure {
    AbiParam calldata param = params[paramIndex];

    // For arrays, the length is stored in the 32 bytes preceding the data
    uint256 blockLength = param._type == AbiType.Array
      ? uint256(word(data, location - 32))
      : param.fields.length;

    result.children = new AbiPayload[](blockLength);

    bool isInline;
    uint256 offset;
    for (uint256 i; i < blockLength; i++) {
      if (i == 0 || param._type == AbiType.Tuple) {
        // For structs or the first element of an array, calculate if element inline
        // For array elements after the first, they all have the same inline status
        isInline = _isInline(params, param.fields[i]);
      }

      _walk(
        data,
        _locationInBlock(data, location, offset, isInline),
        params,
        param.fields[param._type == AbiType.Array ? 0 : i],
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
   * @dev Returns the location of a block part, which may be located inline
   * within the block - at the HEAD - or at an offset relative to the start
   * of the block - at the TAIL.
   *
   * @param data The encoded transaction data.
   * @param location The location of the block within the calldata buffer.
   * @param offset The offset of the block part, relative to the start of the block.
   * @param isInline Whether the block part is located inline within the block.
   *
   * @return The location of the block part within the calldata buffer.
   */
  function _locationInBlock(
    bytes calldata data,
    uint256 location,
    uint256 offset,
    bool isInline
  ) private pure returns (uint256) {
    uint256 headLocation = location + offset;
    if (isInline) {
      return headLocation;
    } else {
      return location + uint256(word(data, headLocation));
    }
  }

  /**
   * @dev Loads a word from calldata.
   * @param data The calldata to load the word from.
   * @param location The starting location of the slice.
   * @return result 32 byte word from calldata.
   */
  function word(
    bytes calldata data,
    uint256 location
  ) internal pure returns (bytes32 result) {
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

  function _isInline(
    AbiParam[] calldata params,
    uint256 index
  ) internal pure returns (bool) {
    AbiParam calldata param = params[index];

    if (param._type == AbiType.Static) {
      return true;
    } else if (param._type == AbiType.Tuple) {
      for (uint256 i; i < param.fields.length; ++i) {
        if (!_isInline(params, param.fields[i])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }
}
