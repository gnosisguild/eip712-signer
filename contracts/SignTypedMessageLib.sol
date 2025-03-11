// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import "./SafeStorage.sol";
import "./EIP712Encoder.sol";

interface ISafe {
  function domainSeparator() external view returns (bytes32);
}

contract SignTypedMessageLib is SafeStorage, EIP712Encoder {
  /// @dev deployment address
  address public immutable deployedAt;

  /// @dev Event that is emitted when an a Safe signing a message into storage
  event SignMsg(bytes32 indexed msgHash);

  /// @dev The EIP-712 type hash used to prefix the message
  bytes32 private constant safeMessageTypeHash =
    keccak256("SafeMessage(bytes message)");

  constructor() {
    deployedAt = address(this);
  }

  /**
   * @notice marks a message as signed.
   * @dev can be verified using EIP-1271 validation method by passing the message and empty bytes as the signature, representing an onchain signature
   */
  function signMessage(bytes calldata message) external {
    bytes32 safeMessageHash = hashSafeMessage(message);

    signedMessages[safeMessageHash] = 1;
    emit SignMsg(safeMessageHash);
  }

  /**
   * @notice hashes a typed message input (EIP-712) and marks this hash as signed
   * @dev can be verified using EIP-1271 validation method by passing the typed message hash as the message, and empty bytes as the signature, representing an onchain signature
   */
  function signTypedMessage(
    bytes calldata domain,
    bytes calldata message,
    Declaration[] calldata types
  ) public {
    require(address(this) != deployedAt);
    bytes32 safeMessageHash = hashSafeTypedMessage(domain, message, types);

    signedMessages[safeMessageHash] = 1;
    emit SignMsg(safeMessageHash);
  }

  function hashSafeMessage(bytes memory message) public view returns (bytes32) {
    return
      keccak256(
        abi.encodePacked(
          bytes2(0x1901),
          ISafe(address(this)).domainSeparator(),
          keccak256(abi.encode(safeMessageTypeHash, keccak256(message)))
        )
      );
  }

  function hashSafeTypedMessage(
    bytes calldata domain,
    bytes calldata message,
    Declaration[] calldata types
  ) public view returns (bytes32) {
    return hashSafeMessage(abi.encode(hashTypedData(domain, message, types)));
  }

  /**
   * We make the signTypedMessage function available under any selector. This
   * allows scoping different type trees under different signTypedMessage
   * aliases, working around the overly strict integrity checks of the RolesMod
   */
  fallback() external {
    bytes calldata domain;
    bytes calldata message;
    Declaration[] calldata types;
    assembly {
      // offset to domain block
      domain.offset := add(calldataload(0x04), 0x24)
      domain.length := calldataload(sub(domain.offset, 0x20))

      // offset to message block
      message.offset := add(calldataload(0x24), 0x24)
      message.length := calldataload(sub(message.offset, 0x20))

      // offset to types block
      types.offset := add(calldataload(0x44), 0x24)
      types.length := calldataload(sub(types.offset, 0x20))
    }
    signTypedMessage(domain, message, types);
  }
}
