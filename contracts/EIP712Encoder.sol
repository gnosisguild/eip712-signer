// SPDX-License-Identifier: LGPL-3.0
pragma solidity >=0.8.21;

import "./AbiDecoder.sol";

/**
 * @title EIP712Encoder - Encodes and hashes EIP-712 structured data
 * @author gnosisguild
 */
contract EIP712Encoder {
  struct TypedData {
    AbiType[] abiTypes;
    bytes32[] typeHashes;
  }
  /**
   * @dev Computes the EIP-712 hash of a typed message
   * @param domain The domain separator data encoded according to EIP-712
   * @param message The message data encoded according to EIP-712
   * @param types Type definitions for both domain and message
   * @return result The EIP-712 hash of the typed message
   */
  function hashTypedMessage(
    bytes calldata domain,
    bytes calldata message,
    TypedData calldata types
  ) public pure returns (bytes32 result) {
    (bytes32 domainSeparator, bytes32 messageHash) = (
      __entrypoint(domain, types, 0),
      __entrypoint(message, types, 1)
    );

    assembly {
      let ptr := mload(0x40)
      mstore(ptr, hex"1901")
      mstore(add(ptr, 0x02), domainSeparator)
      mstore(add(ptr, 0x22), messageHash)
      result := keccak256(ptr, 0x42)
    }
  }

  /**
   * @dev Computes the EIP-712 hash of only the domain part
   * @param data The domain separator data encoded according to EIP-712
   * @param types Type definitions for the domain
   * @return The hash of the domain separator
   */
  function hashTypedDomain(
    bytes calldata data,
    TypedData calldata types
  ) public pure returns (bytes32) {
    return __entrypoint(data, types, 0);
  }

  /**
   * @dev Internal function to start the hashing process for either domain or message
   * @param data The encoded data to hash
   * @param types Type definitions
   * @param index Index in the types array to use (0 for domain, 1 for message)
   * @return The hash of the specified data
   */
  function __entrypoint(
    bytes calldata data,
    TypedData calldata types,
    uint256 index
  ) private pure returns (bytes32) {
    Payload memory payload = AbiDecoder
      .inspect(data, types.abiTypes, index)
      .children[0];

    return _hashBlock(data, types, payload);
  }

  /**
   * @dev Recursively hashes a structured block of data according to EIP-712
   * @param data The raw encoded data
   * @param types Type definitions
   * @param _block The payload structure describing the block's location and size
   * @return The hash of the block according to EIP-712
   */
  function _hashBlock(
    bytes calldata data,
    TypedData calldata types,
    Payload memory _block
  ) private pure returns (bytes32) {
    bytes32[] memory result = new bytes32[](_block.children.length);
    for (uint256 i = 0; i < _block.children.length; i++) {
      result[i] = _encodeField(data, types, _block.children[i]);
    }

    return
      keccak256(
        types.typeHashes[_block.index] != bytes32(0)
          ? abi.encodePacked(types.typeHashes[_block.index], result)
          : abi.encodePacked(result)
      );
  }

  /**
   * @dev Hashes a dynamic-length field according to EIP-712
   * @param data The raw encoded data
   * @param dynamic The payload structure describing the field's location and size
   * @return The hash of the dynamic field
   */
  function _hashDynamic(
    bytes calldata data,
    Payload memory dynamic
  ) private pure returns (bytes32) {
    uint256 left = dynamic.location + 32;
    uint256 length = uint256(bytes32(data[dynamic.location:]));
    return keccak256(data[left:left + length]);
  }

  /**
   * @dev Encodes a single field according to its type and the EIP-712 standard
   * @param data The raw encoded data
   * @param types Type definitions
   * @param field The payload structure describing the field's location and size
   * @return The encoded field as a bytes32 value
   */
  function _encodeField(
    bytes calldata data,
    TypedData calldata types,
    Payload memory field
  ) private pure returns (bytes32) {
    AbiTypeKey key = types.abiTypes[field.index].key;
    if (key == AbiTypeKey.Static) {
      return bytes32(data[field.location:]);
    } else if (key == AbiTypeKey.Dynamic) {
      return _hashDynamic(data, field);
    } else {
      return _hashBlock(data, types, field);
    }
  }
}
