// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import "./AbiDecoder.sol";

contract EIP712Hasher {
  function hash(
    bytes calldata domain,
    bytes calldata message,
    AbiParam[] calldata types
  ) public pure returns (bytes32 result) {
    bytes32 domainHash = _hashBlock(
      domain,
      AbiDecoder.inspect(domain, types, 0)
    );
    bytes32 messageHash = _hashBlock(
      message,
      AbiDecoder.inspect(message, types, 1)
    );

    assembly {
      let ptr := mload(0x40)
      mstore(ptr, hex"19_01")
      mstore(add(ptr, 0x02), domainHash)
      mstore(add(ptr, 0x22), messageHash)
      result := keccak256(ptr, 0x42)
    }
  }

  function hashStruct(
    bytes calldata data,
    AbiParam[] calldata types
  ) public pure returns (bytes32) {
    return _hashBlock(data, AbiDecoder.inspect(data, types, 0));
  }

  function _hashBlock(
    bytes calldata data,
    AbiPayload memory payload
  ) internal pure returns (bytes32) {
    bytes32[] memory result = new bytes32[](payload.children.length);
    for (uint256 i = 0; i < payload.children.length; i++) {
      result[i] = _encodeField(data, payload.children[i]);
    }

    return
      keccak256(
        payload.typeHash != bytes32(0)
          ? abi.encodePacked(payload.typeHash, result)
          : abi.encodePacked(result)
      );
  }

  function _encodeField(
    bytes calldata data,
    AbiPayload memory payload
  ) internal pure returns (bytes32) {
    if (payload._type == AbiType.Static) {
      return AbiDecoder.word(data, payload.location);
    } else if (payload._type == AbiType.Dynamic) {
      return _hashDynamic(data, payload);
    } else {
      return _hashBlock(data, payload);
    }
  }

  function _hashDynamic(
    bytes calldata data,
    AbiPayload memory payload
  ) private pure returns (bytes32) {
    uint256 left = payload.location + 32;
    uint256 length = uint256(AbiDecoder.word(data, payload.location));
    return keccak256(data[left:left + length]);
  }
}
