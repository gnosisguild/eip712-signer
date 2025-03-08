import { TypedDataField, keccak256, toUtf8Bytes } from "ethers";

import { parseTypeReference } from "./typeReference";

type Types = Record<string, Array<TypedDataField>>;

export function hashType({ types, type }: { types: Types; type: string }) {
  const typeSignature = signature({ types, type });
  const typeHash = keccak256(toUtf8Bytes(typeSignature)) as `0x${string}`;
  return { typeSignature, typeHash };
}

function signature({ types, type }: { types: Types; type: string }) {
  const allStructTypes = [
    type,
    ...Array.from(visit({ types, typeReference: type }))
      .filter((t) => t !== type)
      .sort(),
  ];

  return allStructTypes
    .map(
      (type) =>
        `${type}(${types[type]
          .map(({ name, type }) => `${type} ${name}`)
          .join(",")})`,
    )
    .join("");
}

function visit(
  {
    types,
    typeReference,
  }: {
    types: Types;
    typeReference: string;
  },
  visited: Set<string> = new Set(),
): Set<string> {
  const { type } = parseTypeReference(typeReference);
  if (!types[type]) {
    return visited;
  }

  visited.add(type);

  for (const field of types[type]) {
    visit({ types, typeReference: field.type }, visited);
  }

  return visited;
}
