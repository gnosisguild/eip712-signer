import { TypedDataField } from "ethers";

type Types = Record<string, Array<TypedDataField>>;

export const findPrimaryType = ({ types }: { types: Types }): string => {
  const count: Record<string, number> = {};

  // Initialize reference counts to 0
  Object.keys(types).forEach((typeName) => {
    count[typeName] = 0;
  });

  // count references for every struct type
  for (const name of Object.keys(types)) {
    for (const field of types[name]!) {
      const { type } = parseTypeReference(field.type);
      if (count[type] !== undefined) {
        count[type]++;
      }
    }
  }

  const rootReferences = Object.entries(count).filter(
    ([_, count]) => count == 0,
  );

  if (rootReferences.length === 0) {
    throw new Error("No primary type found - no referenced types");
  }

  if (rootReferences.length > 1) {
    throw new Error(
      `Expected exactly one primary type, found ${
        rootReferences.length
      }: ${rootReferences.map(([type]) => type).join(", ")}`,
    );
  }

  return rootReferences[0][0];
};

export function parseTypeReference(typeReference: string) {
  const isArray = typeReference.indexOf("[") !== -1;
  const isStruct = !isArray && !isNative(typeReference);
  const fixedLength = isArray
    ? Number(typeReference.split("[")[1].slice(0, -1))
    : 0;

  return {
    isArray,
    isStruct,
    type: isArray ? typeReference.split("[")[0] : typeReference,
    fixedLength,
  };
}

export function isNative(typeReference: string): boolean {
  return isAtomic(typeReference) || isDynamic(typeReference);
}

export function isAtomic(typeReference: string): boolean {
  const isArray = typeReference.includes("[");
  if (isArray) return false;

  return ATOMIC_TYPES[typeReference] || false;
}

export function isDynamic(typeReference: string): boolean {
  const isArray = typeReference.includes("[");
  if (isArray) return false;

  return DYNAMIC_TYPES[typeReference] || false;
}

const ATOMIC_TYPES: Record<string, boolean> = Object.fromEntries(
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

const DYNAMIC_TYPES: Record<string, boolean> = { string: true, bytes: true };
