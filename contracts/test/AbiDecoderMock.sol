// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.17 <0.9.0;

import "../AbiDecoder.sol";

contract AbiDecoderMock {
  function inspect(
    bytes calldata data,
    Declaration[] calldata params,
    uint256 index
  ) public pure returns (PP1 memory) {
    return copyOut(AbiDecoder.inspect(data, params, index));
  }

  function pluck(
    bytes calldata data,
    uint256 offset,
    uint256 size
  ) public pure returns (bytes memory result) {
    return data[offset:offset + size];
  }

  function copyOut(
    Payload memory output
  ) private pure returns (PP1 memory result) {
    result._type = output._type;
    result.location = output.location;
    result.size = output.size;
    result.children = new PP2[](output.children.length);
    for (uint256 i = 0; i < output.children.length; i++) {
      result.children[i] = copyOutTo2(output.children[i]);
    }
  }

  function copyOutTo2(
    Payload memory output
  ) private pure returns (PP2 memory result) {
    result._type = output._type;
    result.location = output.location;
    result.size = output.size;
    result.children = new PP3[](output.children.length);
    for (uint256 i = 0; i < output.children.length; i++) {
      result.children[i] = copyOutTo3(output.children[i]);
    }
  }

  function copyOutTo3(
    Payload memory output
  ) private pure returns (PP3 memory result) {
    result._type = output._type;
    result.location = output.location;
    result.size = output.size;
    result.children = new PP4[](output.children.length);
    for (uint256 i = 0; i < output.children.length; i++) {
      result.children[i] = copyOutTo4(output.children[i]);
    }
  }

  function copyOutTo4(
    Payload memory output
  ) private pure returns (PP4 memory result) {
    result._type = output._type;
    result.location = output.location;
    result.size = output.size;
    result.children = new PP5[](output.children.length);
    for (uint256 i = 0; i < output.children.length; i++) {
      result.children[i] = copyOutTo5(output.children[i]);
    }
  }

  function copyOutTo5(
    Payload memory output
  ) private pure returns (PP5 memory result) {
    result._type = output._type;
    result.location = output.location;
    result.size = output.size;
    result.children = new PP6[](output.children.length);
    for (uint256 i = 0; i < output.children.length; i++) {
      result.children[i] = copyOutTo6(output.children[i]);
    }
  }

  function copyOutTo6(
    Payload memory output
  ) private pure returns (PP6 memory result) {
    result._type = output._type;
    result.location = output.location;
    result.size = output.size;
    if (output.children.length > 0) {
      revert("MockDecoder needs more levels of recursion");
    }
  }

  struct PP1 {
    ParamType _type;
    uint256 location;
    uint256 size;
    PP2[] children;
  }

  struct PP2 {
    ParamType _type;
    uint256 location;
    uint256 size;
    PP3[] children;
  }

  struct PP3 {
    ParamType _type;
    uint256 location;
    uint256 size;
    PP4[] children;
  }

  struct PP4 {
    ParamType _type;
    uint256 location;
    uint256 size;
    PP5[] children;
  }

  struct PP5 {
    ParamType _type;
    uint256 location;
    uint256 size;
    PP6[] children;
  }

  struct PP6 {
    ParamType _type;
    uint256 location;
    uint256 size;
  }
}
