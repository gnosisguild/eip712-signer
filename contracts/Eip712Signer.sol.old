// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

contract Eip712Signer {
    address public immutable deployedAt;
    address public immutable signMessageLib;

    error InvalidAddress(address givenAddress);
    error InvalidCall();
    error InvalidDomainType();
    error InvalidMessageType();
    error InvalidDataType();
    error SignMessageLibCallFailed();

    enum DataType {
        Atomic,
        Dynamic,
        Array,
        Struct,
        Hash
    }

    struct TypedValue {
        DataType dataType;
        bytes value;
        string structSignature;
    }

    constructor(address _signMessageLib) {
        if (_signMessageLib == address(0)) {
            revert InvalidAddress(_signMessageLib);
        }
        signMessageLib = _signMessageLib;
        deployedAt = address(this);
    }

    /**
     * @notice Marks an EIP-712 typed message as signed.
     */
    function signTypedMessage(TypedValue memory domain, TypedValue memory message) external {
        // Make sure we're being delegatecalled
        if (address(this) == deployedAt) {
            revert InvalidCall();
        }

        // Assert that domain and message root types are structs
        if (domain.dataType != DataType.Struct) revert InvalidDomainType();
        if (message.dataType != DataType.Struct) revert InvalidMessageType();

        // Calculate the typed data hash
        bytes32 messageHash = _toTypedDataHash(_encodeData(domain), _encodeData(message));

        // Forward to the Safe SignMessageLib in another delegatecall to mark that hash as signed
        (bool success, ) = signMessageLib.delegatecall(
            abi.encodeWithSignature("signMessage(bytes)", abi.encodePacked(messageHash))
        );

        if (!success) {
            revert SignMessageLibCallFailed();
        }
    }

    function _encodeData(TypedValue memory typedValue) internal returns (bytes32) {
        if (typedValue.dataType == DataType.Atomic) {
            return bytes32(typedValue.value);
        } else if (typedValue.dataType == DataType.Dynamic) {
            return keccak256(abi.decode(typedValue.value, (bytes)));
        } else if (typedValue.dataType == DataType.Array) {
            return keccak256(_encodeTuple(abi.decode(typedValue.value, (TypedValue[]))));
        } else if (typedValue.dataType == DataType.Struct) {
            return (
                keccak256(
                    bytes.concat(
                        keccak256(bytes(typedValue.structSignature)),
                        _encodeTuple(abi.decode(typedValue.value, (TypedValue[])))
                    )
                )
            );
        } else if (typedValue.dataType == DataType.Hash) {
            return bytes32(typedValue.value);
        } else {
            revert InvalidDataType();
        }
    }

    function _encodeTuple(TypedValue[] memory values) internal returns (bytes memory acc) {
        for (uint256 i; i < values.length; ) {
            acc = bytes.concat(acc, _encodeData(values[i]));
            unchecked {
                ++i;
            }
        }
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
