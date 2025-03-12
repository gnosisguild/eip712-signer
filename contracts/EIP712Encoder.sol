// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import "./AbiDecoder.sol";

contract EIP712Encoder {
  function hashTypedData(
    bytes calldata domain,
    bytes calldata message,
    AbiType[] calldata types
  ) public pure returns (bytes32 result) {
    (bytes32 domainSeparator, bytes32 messageHash) = (
      _hashBlock(domain, AbiDecoder.inspect(domain, types, 0).children[0]),
      _hashBlock(message, AbiDecoder.inspect(message, types, 1).children[0])
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
    AbiType[] calldata types
  ) public pure returns (bytes32) {
    return _hashBlock(data, AbiDecoder.inspect(data, types, 0).children[0]);
  }

  function _hashBlock(
    bytes calldata data,
    Payload memory _block
  ) private pure returns (bytes32) {
    bytes32[] memory result = new bytes32[](_block.children.length);
    for (uint256 i = 0; i < _block.children.length; i++) {
      result[i] = _encodeField(data, _block.children[i]);
    }

    return
      keccak256(
        _block.typeHash != bytes32(0)
          ? abi.encodePacked(_block.typeHash, result)
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
    Payload memory field
  ) private pure returns (bytes32) {
    if (field.key == AbiTypeKey.Static) {
      return bytes32(data[field.location:]);
    } else if (field.key == AbiTypeKey.Dynamic) {
      return _hashDynamic(data, field);
    } else {
      return _hashBlock(data, field);
    }
  }
}
