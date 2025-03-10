export { findPrimaryType } from "./findPrimaryType";
export { typesForDomain } from "./typesForDomain";
export { parseType } from "./parseType";
export { hashType } from "./hashType";

export function isNative(type: string): boolean {
  return isAtomic(type) || isDynamic(type);
}

export function isAtomic(type: string): boolean {
  const isArray = type.includes("[");
  if (isArray) return false;

  return ATOMIC_TYPES[type] || false;
}

export function isDynamic(type: string): boolean {
  const isArray = type.includes("[");
  if (isArray) return false;

  return DYNAMIC_TYPES[type] || false;
}

export const ATOMIC_TYPES: Record<string, boolean> = Object.fromEntries(
  [
    // Static length types
    "bool",
    "address",
    "int8",
    "int16",
    "int32",
    "int64",
    "int128",
    "int256",
    "uint8",
    "uint16",
    "uint32",
    "uint64",
    "uint128",
    "uint256",
    "bytes1",
    "bytes2",
    "bytes3",
    "bytes4",
    "bytes5",
    "bytes6",
    "bytes7",
    "bytes8",
    "bytes9",
    "bytes10",
    "bytes11",
    "bytes12",
    "bytes13",
    "bytes14",
    "bytes15",
    "bytes16",
    "bytes17",
    "bytes18",
    "bytes19",
    "bytes20",
    "bytes21",
    "bytes22",
    "bytes23",
    "bytes24",
    "bytes25",
    "bytes26",
    "bytes27",
    "bytes28",
    "bytes29",
    "bytes30",
    "bytes31",
    "bytes32",
  ].map((type) => [type, true]),
);

export const DYNAMIC_TYPES: Record<string, boolean> = {
  string: true,
  bytes: true,
};
