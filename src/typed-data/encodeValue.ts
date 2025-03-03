import { AbiCoder, TypedDataField } from "ethers";

import { findPrimaryType, parseTypeReference } from "./typeReference";

type Types = Record<string, Array<TypedDataField>>;

export function encodeTypedValue({
  types,
  value,
}: {
  types: Types;
  value: Record<string, any>;
}) {
  const primaryType = findPrimaryType({ types });

  return AbiCoder.defaultAbiCoder().encode(
    [getAbiTypes(types, primaryType)],
    [getAbiValues(types, value, primaryType)],
  ) as `0x${string}`;
}

function getAbiTypes(types: Types, typeName: string): string {
  const { type, isArray, isStruct, fixedLength } = parseTypeReference(typeName);

  if (isStruct) {
    const fields = types[type];
    return `tuple(${fields
      .map(({ type }) => getAbiTypes(types, type))
      .join(",")})`;
  } else if (isArray && !fixedLength) {
    return `${getAbiTypes(types, type)}[]`;
  } else if (isArray && fixedLength) {
    return `tuple(${new Array(fixedLength)
      .fill(getAbiTypes(types, type))
      .join(",")})`;
  } else {
    return type;
  }
}

function getAbiValues(types: Types, value: any, typeReference: string): any[] {
  const { type, isArray, isStruct } = parseTypeReference(typeReference);

  if (isStruct) {
    const fields = types[type];
    return fields.map(({ name, type }) =>
      getAbiValues(types, value[name], type),
    );
  } else if (isArray) {
    return value.map((v: string) => getAbiValues(types, v, type));
  } else {
    return value;
  }
}
