// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import "./TypedValueDecoder.sol";
import "hardhat/console.sol";

contract EIP712Encoder {
    function hashDomain(
        bytes calldata domain,
        Type[] calldata types
    ) public view returns (bytes32) {
        return hashStruct(domain, TypeValueDecoder.inspect(domain, types, 0));
    }

    function hashStruct(
        bytes calldata value,
        Payload memory payload
    ) internal view returns (bytes32) {
        require(payload.hash != bytes32(0), "oops");

        bytes32[] memory result = new bytes32[](payload.children.length);
        for (uint256 i = 0; i < payload.children.length; i++) {
            result[i] = _encodeField(value, payload.children[i]);
        }

        return keccak256(abi.encodePacked(payload.hash, result));
    }

    function hashArray(
        bytes calldata value,
        Payload memory payload
    ) internal view returns (bytes32) {
        bytes32[] memory result = new bytes32[](payload.children.length);
        for (uint256 i = 0; i < payload.children.length; i++) {
            result[i] = _encodeField(value, payload.children[i]);
        }

        return keccak256(abi.encodePacked(result));
    }

    function _encodeField(
        bytes calldata value,
        Payload memory payload
    ) internal view returns (bytes32) {
        if (payload.key == TypeKey.Atomic) {
            console.log("Atomic location %s", payload.location);
            return TypeValueDecoder.word(value, payload.location);
        } else if (payload.key == TypeKey.Dynamic) {
            uint256 location = payload.location + 32;
            uint256 length = uint256(
                TypeValueDecoder.word(value, payload.location)
            );
            console.log("Dynamic location %s length %s", location, length);
            return keccak256(TypeValueDecoder.pluck(value, location, length));
        } else if (payload.key == TypeKey.Array) {
            return hashArray(value, payload);
        } else if (payload.key == TypeKey.Struct) {
            return hashStruct(value, payload);
        } else {
            require(payload.key == TypeKey.Hash, "Failed");
            return bytes32(value);
        }
    }
}
