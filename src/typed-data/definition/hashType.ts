import { TypedDataField, keccak256, toUtf8Bytes } from "ethers";

import { allTypes } from "./allTypes";
import { isStructType } from "./identity";

type Types = Record<string, Array<TypedDataField>>;

export function hashType({ types, type }: { types: Types; type: string }) {
  const typeSignature = signature({ types, type });
  const typeHash = keccak256(toUtf8Bytes(typeSignature)) as `0x${string}`;
  return { typeSignature, typeHash };
}

function signature({ types, type }: { types: Types; type: string }) {
  const allStructTypes = [
    type,
    ...allTypes(types, [type])
      .slice(1)
      .filter((type) => isStructType(type))
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
