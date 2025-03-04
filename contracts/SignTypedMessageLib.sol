// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import "./SafeStorage.sol";
import "./EIP712Encoder.sol";

interface ISafe {
  function domainSeparator() external view returns (bytes32);
}

contract SignTypedMessageLib is SafeStorage, EIP712Encoder {
  address public immutable deployedAt;
  bytes32 public immutable safeMessageTypeHash;

  event SignMsg(bytes32 indexed msgHash);

  constructor() {
    deployedAt = address(this);
    //safeMessageTypeHash = keccak256("SafeMessage(bytes message)");
    (safeMessageTypeHash) = (
      0x60b3cbf8b4a223d68d641b3b6ddf9a298e7f33710cf3d3a9d1146b5a6150fbca
    );
  }

  /**
   * @notice Marks a message (`_data`) as signed.
   * @dev Can be verified using EIP-1271 validation method by passing the pre-image of the message hash and empty bytes as the signature.
   * @param message Arbitrary length data that should be marked as signed on the behalf of address(this).
   */
  function signMessage(bytes calldata message) external {
    bytes32 safeMessageHash = hashSafeMessage(message);

    signedMessages[safeMessageHash] = 1;
    emit SignMsg(safeMessageHash);
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
    require(address(this) != deployedAt);

    bytes32 safeMessageHash = hashSafeMessage(
      abi.encode(hashTypedData(domain, message, types))
    );

    signedMessages[safeMessageHash] = 1;
    emit SignMsg(safeMessageHash);
  }

  function hashSafeMessage(bytes memory message) public view returns (bytes32) {
    return
      keccak256(
        abi.encodePacked(
          bytes1(0x19),
          bytes1(0x01),
          ISafe(address(this)).domainSeparator(),
          keccak256(abi.encode(safeMessageTypeHash, keccak256(message)))
        )
      );
  }

  /**
   * We make the signTypedMessage function available under any selector. This
   * allows scoping different type trees under different signTypedMessage
   * aliases, working around the overly strict integrity checks of the RolesMod
   */
  fallback() external {
    uint256 temp;
    bytes calldata domain;
    bytes calldata message;
    AbiParam[] calldata types;

    assembly {
      // offset to domain block
      temp := add(calldataload(0x04), 0x04)
      domain.length := calldataload(temp)
      domain.offset := add(temp, 0x20)
      // offset to message block
      temp := add(calldataload(0x24), 0x04)
      message.length := calldataload(temp)
      message.offset := add(temp, 0x20)
      // offset to types block
      temp := add(calldataload(0x44), 0x04)
      types.length := calldataload(temp)
      types.offset := add(temp, 0x20)
    }

    signTypedMessage(domain, message, types);
  }
}
