import { TypedData } from "viem";

export const isAtomic = (abiParameterType: string): boolean => {
  const isArray = abiParameterType.includes("[");
  if (isArray) return false;

  return (
    abiParameterType === "bool" || abiParameterType === "address" || !!abiParameterType.match(/(uint|int|bytes)\d+/)
  );
};

/**
 * Returns a sorted array of serialized struct types. The values should be concatenated to form the final encoded type.
 * see: https://eips.ethereum.org/EIPS/eip-712#definition-of-encodetype
 **/
export const encodeType = <T extends TypedData>({ types, primaryType }: { types: T; primaryType: keyof T }): string => {
  if (typeof primaryType !== "string") {
    throw new Error(`Unexpected primary type: ${String(primaryType)}`);
  }

  const referencedStructs = Array.from(collectReferencedStructs({ types, primaryType }))
    .filter((type) => type !== primaryType)
    .sort();

  const serializeType = (type: string) =>
    type + "(" + types[type].map(({ name, type }) => `${type} ${name}`).join(",") + ")";

  return [primaryType, ...referencedStructs].map(serializeType).join("");
};

const collectReferencedStructs = <T extends TypedData>(
  {
    types,
    primaryType,
  }: {
    types: T;
    primaryType: string;
  },
  acc: Set<string> = new Set(),
): Set<string> => {
  if (acc.has(primaryType)) {
    return acc;
  }

  acc.add(primaryType);

  const referencedStructs = types[primaryType].map(({ type }) => type.split("[")[0]).filter((type) => type in types);
  for (const type of referencedStructs) {
    collectReferencedStructs({ types, primaryType: type }, acc);
  }

  return acc;
};
