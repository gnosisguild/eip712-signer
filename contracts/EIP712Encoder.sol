// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import "./AbiDecoder.sol";

contract EIP712Encoder {
    function hash(
        AbiEncoded calldata domain,
        AbiEncoded calldata message
    ) public pure returns (bytes32 result) {
        return _hashTypedData(hashStruct(domain), hashStruct(message));
    }

    function hashDomain(
        AbiEncoded calldata domain
    ) public pure returns (bytes32) {
        return _hashStruct(domain.data, AbiDecoder.inspect(domain));
    }

    function hashStruct(
        AbiEncoded calldata value
    ) public pure returns (bytes32) {
        return _hashStruct(value.data, AbiDecoder.inspect(value));
    }

    function _hashStruct(
        bytes calldata value,
        AbiPayload memory payload
    ) internal pure returns (bytes32) {
        bytes32[] memory result = new bytes32[](payload.children.length);
        for (uint256 i = 0; i < payload.children.length; i++) {
            result[i] = _field(value, payload.children[i]);
        }

        return keccak256(abi.encodePacked(payload.typeHash, result));
    }

    function _hashArray(
        bytes calldata value,
        AbiPayload memory payload
    ) private pure returns (bytes32) {
        bytes32[] memory result = new bytes32[](payload.children.length);
        for (uint256 i = 0; i < payload.children.length; ++i) {
            result[i] = _field(value, payload.children[i]);
        }

        return keccak256(abi.encodePacked(result));
    }

    function _hashDynamic(
        bytes calldata value,
        AbiPayload memory payload
    ) private pure returns (bytes32) {
        (uint256 location, uint256 length) = (
            payload.location + 32,
            uint256(AbiDecoder.word(value, payload.location))
        );
        return keccak256(AbiDecoder.pluck(value, location, length));
    }

    function _field(
        bytes calldata data,
        AbiPayload memory payload
    ) internal pure returns (bytes32) {
        if (payload._type == AbiType.Static) {
            return AbiDecoder.word(data, payload.location);
        } else if (payload._type == AbiType.Dynamic) {
            return _hashDynamic(data, payload);
        } else if (payload._type == AbiType.Array) {
            return _hashArray(data, payload);
        } else {
            return
                payload.typeHash != bytes32(0)
                    ? _hashStruct(data, payload)
                    : _hashArray(data, payload);
        }
    }

    function _hashTypedData(
        bytes32 domainHash,
        bytes32 messageHash
    ) internal pure returns (bytes32 digest) {
        /// @solidity memory-safe-assembly
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, hex"19_01")
            mstore(add(ptr, 0x02), domainHash)
            mstore(add(ptr, 0x22), messageHash)
            digest := keccak256(ptr, 0x42)
        }
    }
}
