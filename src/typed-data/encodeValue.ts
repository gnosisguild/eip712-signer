import { AbiCoder, TypedDataField } from "ethers";

import { findPrimaryType, parseTypeReference } from "./typeReference";

type Types = Record<string, Array<TypedDataField>>;

export function encodeTypedValue({
  value,
  types,
}: {
  value: Record<string, any>;
  types: Types;
}) {
  const primaryType = findPrimaryType({ types });

  return AbiCoder.defaultAbiCoder().encode(
    [abiTypes(primaryType, types)],
    [abiValues(primaryType, value, types)],
  ) as `0x${string}`;
}

function abiTypes(typeReference: string, types: Types): string {
  const { type, isArray, isStruct, fixedLength } =
    parseTypeReference(typeReference);

  if (isStruct) {
    const fields = types[type];
    return `tuple(${fields
      .map(({ type }) => abiTypes(type, types))
      .join(",")})`;
  } else if (isArray && !fixedLength) {
    return `${abiTypes(type, types)}[]`;
  } else if (isArray && fixedLength) {
    return `tuple(${new Array(fixedLength)
      .fill(abiTypes(type, types))
      .join(",")})`;
  } else {
    return type;
  }
}

function abiValues(typeReference: string, value: any, types: Types): any[] {
  const { type, isArray, isStruct } = parseTypeReference(typeReference);

  if (isStruct) {
    return types[type].map((field) =>
      abiValues(field.type, value[field.name], types),
    );
  } else if (isArray) {
    return value.map((v: string) => abiValues(type, v, types));
  } else {
    return value;
  }
}
