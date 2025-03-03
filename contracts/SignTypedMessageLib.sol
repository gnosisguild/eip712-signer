// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import "./SafeStorage.sol";
import "./EIP712Hasher.sol";

interface ISafe {
  function domainSeparator() external view returns (bytes32);
}

contract SignTypedMessageLib is SafeStorage, EIP712Hasher {
  address public immutable deployedAt;

  event SignMsg(bytes32 indexed msgHash);

  constructor() {
    deployedAt = address(this);
  }

  /**
   * @notice Marks a message (`_data`) as signed.
   * @dev Can be verified using EIP-1271 validation method by passing the pre-image of the message hash and empty bytes as the signature.
   * @param message Arbitrary length data that should be marked as signed on the behalf of address(this).
   */
  function signMessage(bytes calldata message) external {
    bytes32 msgHash = hashSafeMessage(message);
    signedMessages[msgHash] = 1;
    emit SignMsg(msgHash);
  }

  /**
   * @notice Marks an EIP-712 typed message as signed.
   * @param domain The domain of EIP-712 message, ABI encoded according to the first `types` element.
   * @param message The EIP-712 message, ABI encoded according to the second `types` element.`.
   * @param types An array of types used in the EIP-712 message. Struct types must be ordered alphabetically by name.
   */
  function signTypedMessage(
    bytes calldata domain,
    bytes calldata message,
    AbiParam[] calldata types
  ) public {
    require(address(this) != deployedAt, "Delegatecall Only!");

    bytes32 msgHash = hashSafeMessage(
      abi.encode(hashTypedMessage(domain, message, types))
    );
    signedMessages[msgHash] = 1;
    emit SignMsg(msgHash);
  }

  // keccak256("SafeMessage(bytes message)");
  bytes32 private constant SAFE_MSG_TYPEHASH =
    0x60b3cbf8b4a223d68d641b3b6ddf9a298e7f33710cf3d3a9d1146b5a6150fbca;

  function hashSafeMessage(bytes memory message) public view returns (bytes32) {
    bytes32 payloadHash = keccak256(
      abi.encode(SAFE_MSG_TYPEHASH, keccak256(message))
    );
    return
      keccak256(
        abi.encodePacked(
          bytes1(0x19),
          bytes1(0x01),
          ISafe(address(this)).domainSeparator(),
          payloadHash
        )
      );
  }

  /**
   * We make the signTypedMessage function available under any selector. This
   * allows scoping different type trees under different signTypedMessage
   * aliases, working around the overly strict integrity checks of the RolesMod
   */
  fallback() external {
    bytes calldata domain;
    bytes calldata message;
    AbiParam[] calldata types;

    bytes calldata buffer = msg.data;

    assembly {
      domain.offset := add(buffer.offset, 4)
      domain.length := add(calldataload(domain.offset), 32)

      message.offset := add(domain.offset, domain.length)
      message.length := calldataload(message.offset)

      types.offset := add(domain.offset, domain.length)
    }

    signTypedMessage(domain, message, types);
  }
}
