// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import "./AbiDecoder.sol";

struct TypedData {
  AbiType[] abiTypes;
  bytes32[] typeHashes;
}

contract EIP712Encoder {
  function hashTypedData(
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

  function hashStruct(
    bytes calldata data,
    TypedData calldata types
  ) public pure returns (bytes32) {
    return __entrypoint(data, types, 0);
  }

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

  function _hashDynamic(
    bytes calldata data,
    Payload memory dynamic
  ) private pure returns (bytes32) {
    uint256 left = dynamic.location + 32;
    uint256 length = uint256(bytes32(data[dynamic.location:]));
    return keccak256(data[left:left + length]);
  }

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
