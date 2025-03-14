// SPDX-License-Identifier: LGPL-3.0
/**
 * @dev Represents the key type for ABI encoding
 */
enum AbiTypeKey {
  None,
  Static,
  Dynamic,
  Tuple,
  Array,
  AbiEncodedWithSelector,
  AbiEncoded
}

/**
 * @dev Structure representing an ABI type definition
 * @param key The type key indicating how this parameter should be encoded
 * @param fields Array of indices pointing to child types in the AbiType array
 */
struct AbiType {
  AbiTypeKey key;
  uint256[] fields;
}

/**
 * @dev Structure that maps the location and size of a parameter in calldata
 * @param index The index of the parameter in the AbiType array
 * @param location The location of the parameter in calldata
 * @param size The size of the parameter in bytes
 * @param children Array of child payloads for complex types (tuples, arrays)
 */
struct Payload {
  uint256 index;
  uint256 location;
  uint256 size;
  Payload[] children;
}
