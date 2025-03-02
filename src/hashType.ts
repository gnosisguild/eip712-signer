import { TypedDataField, keccak256, toUtf8Bytes } from "ethers";

export function hashType({
  primaryType,
  types,
}: {
  primaryType: string;
  types: Record<string, TypedDataField[]>;
}) {
  const encodedHashType = toUtf8Bytes(encodeType({ primaryType, types }));
  return keccak256(encodedHashType);
}

export function encodeType({
  primaryType,
  types,
}: {
  primaryType: string;
  types: Record<string, TypedDataField[]>;
}) {
  let result = "";
  const unsortedDeps = findTypeDependencies({ primaryType, types });
  unsortedDeps.delete(primaryType);

  const deps = [primaryType, ...Array.from(unsortedDeps).sort()];
  for (const type of deps) {
    result += `${type}(${types[type]
      .map(({ name, type: t }) => `${t} ${name}`)
      .join(",")})`;
  }

  return result;
}

function findTypeDependencies(
  {
    primaryType: primaryType_,
    types,
  }: {
    primaryType: string;
    types: Record<string, TypedDataField[]>;
  },
  results: Set<string> = new Set(),
): Set<string> {
  const match = primaryType_.match(/^\w*/u);
  const primaryType = match?.[0]!;
  if (results.has(primaryType) || types[primaryType] === undefined) {
    return results;
  }

  results.add(primaryType);

  for (const field of types[primaryType]) {
    findTypeDependencies({ primaryType: field.type, types }, results);
  }
  return results;
}
