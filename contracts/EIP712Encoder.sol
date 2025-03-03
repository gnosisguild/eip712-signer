// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import "./AbiDecoder.sol";

contract EIP712Encoder {
    function hash(
        AbiEncoded calldata domain,
        AbiEncoded calldata message
    ) public pure returns (bytes32 result) {
        bytes32 domainHash = hashStruct(domain);
        bytes32 messageHash = hashStruct(message);

        assembly {
            let ptr := mload(0x40)
            mstore(ptr, hex"19_01")
            mstore(add(ptr, 0x02), domainHash)
            mstore(add(ptr, 0x22), messageHash)
            result := keccak256(ptr, 0x42)
        }
    }

    function hashDomain(
        AbiEncoded calldata domain
    ) public pure returns (bytes32) {
        return _hashBlock(domain.data, AbiDecoder.inspect(domain));
    }

    function hashStruct(
        AbiEncoded calldata value
    ) public pure returns (bytes32) {
        return _hashBlock(value.data, AbiDecoder.inspect(value));
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
