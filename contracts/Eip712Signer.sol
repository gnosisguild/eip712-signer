// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

contract Eip712Signer {
    address public immutable deployedAt;
    address public immutable signMessageLib;

    error InvalidAddress(address givenAddress);
    error InvalidCall();
    error InvalidDomainType();
    error InvalidPrimaryType();
    error InvalidDataType();
    error SignMessageLibCallFailed();

    enum TypeKey {
        Atomic,
        Dynamic,
        Array,
        Struct,
        Hash
    }

    struct Type {
        TypeKey key;
        string structSignature;
        uint256[] elements;
    }

    constructor(address _signMessageLib) {
        if (_signMessageLib == address(0)) {
            revert InvalidAddress(_signMessageLib);
        }
        signMessageLib = _signMessageLib;
        deployedAt = address(this);
    }

    /**
     * We make the signTypedMessage function available under any selector. This allows scoping different type trees under different
     * signTypedMessage aliases, working around the overly strict integrity checks of the Roles mod.
     */
    fallback() external {
        (bytes memory domain, bytes memory message, Type[] memory types, uint256 primaryType) = abi.decode(
            msg.data[4:],
            (bytes, bytes, Type[], uint256)
        );
        signTypedMessage(domain, message, types, primaryType);
    }

    /**
     * @notice Marks an EIP-712 typed message as signed.
     * @param domain The domain of EIP-712 message, ABI encoded according to the first `types` element.
     * @param message The EIP-712 message, ABI encoded according to the `types` element at index `primaryType`.
     * @param types An array of types used in the EIP-712 message. Struct types must be ordered alphabetically by name.
     * @param primaryType Specifies the index of the EIP-712 primary type in the `types` array.
     */
    function signTypedMessage(
        bytes memory domain,
        bytes memory message,
        Type[] memory types,
        uint256 primaryType
    ) public {
        // Make sure we're being delegatecalled
        if (address(this) == deployedAt) {
            revert InvalidCall();
        }

        // Assert that domain and message root types are structs
        if (types[0].key != TypeKey.Struct) revert InvalidDomainType();
        if (primaryType == 0 || types[primaryType].key != TypeKey.Struct) revert InvalidPrimaryType();

        // Calculate the typed data hash
        bytes32 messageHash = _toTypedDataHash(_encodeData(domain, types, 0), _encodeData(message, types, primaryType));

        // Forward to the Safe SignMessageLib in another delegatecall to mark that hash as signed
        (bool success, ) = signMessageLib.delegatecall(
            abi.encodeWithSignature("signMessage(bytes)", abi.encodePacked(messageHash))
        );

        if (!success) {
            revert SignMessageLibCallFailed();
        }
    }

    function _encodeData(bytes memory value, Type[] memory types, uint256 current) internal returns (bytes32) {
        Type memory _type = types[current];
        if (_type.key == TypeKey.Atomic) {
            return bytes32(value);
        } else if (_type.key == TypeKey.Dynamic) {
            return keccak256(abi.decode(value, (bytes)));
        } else if (_type.key == TypeKey.Array) {
            return keccak256(_encodeArray(abi.decode(value, (bytes[])), types, current));
        } else if (_type.key == TypeKey.Struct) {
            return (keccak256(_encodeStruct(abi.decode(value, (bytes[])), types, current)));
        } else if (_type.key == TypeKey.Hash) {
            return bytes32(value);
        } else {
            revert InvalidDataType();
        }
    }

    function _encodeArray(
        bytes[] memory values,
        Type[] memory types,
        uint256 current
    ) internal returns (bytes memory acc) {
        uint256 elementTypeIndex = types[current].elements[0];
        for (uint256 i; i < values.length; ) {
            acc = bytes.concat(acc, _encodeData(values[i], types, elementTypeIndex));
            unchecked {
                ++i;
            }
        }
    }

    function _encodeStruct(
        bytes[] memory values,
        Type[] memory types,
        uint256 current
    ) internal returns (bytes memory) {
        bytes memory acc;
        for (uint256 i; i < values.length; ) {
            uint256 elementTypeIndex = types[current].elements[i];
            acc = bytes.concat(acc, _encodeData(values[i], types, elementTypeIndex));
            unchecked {
                ++i;
            }
        }

        return bytes.concat(keccak256(bytes(types[current].structSignature)), acc);
    }

    /**
     * taken from: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/MessageHashUtils.sol
     * Copyright (c) 2016-2023 zOS Global Limited and contributors
     * released under MIT license
     *
     * @dev Returns the keccak256 digest of an EIP-712 typed data (ERC-191 version `0x01`).
     *
     * The digest is calculated from a `domainSeparator` and a `structHash`, by prefixing them with
     * `\x19\x01` and hashing the result. It corresponds to the hash signed by the
     * https://eips.ethereum.org/EIPS/eip-712[`eth_signTypedData`] JSON-RPC method as part of EIP-712.
     *
     * See {ECDSA-recover}.
     */
    function _toTypedDataHash(bytes32 domainSeparator, bytes32 structHash) internal pure returns (bytes32 digest) {
        /// @solidity memory-safe-assembly
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, hex"19_01")
            mstore(add(ptr, 0x02), domainSeparator)
            mstore(add(ptr, 0x22), structHash)
            digest := keccak256(ptr, 0x42)
        }
    }
}
