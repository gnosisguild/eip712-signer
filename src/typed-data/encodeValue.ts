import { AbiCoder, TypedDataField } from "ethers";

import { findPrimaryType } from "./findPrimaryType";
import { isAtomic, parseTypeReference } from "./typeReference";

type Types = Record<string, Array<TypedDataField>>;

export function encodeTypedValue({
  value,
  types,
}: {
  value: Record<string, any>;
  types: Types;
}) {
  const primaryType = findPrimaryType({ types });
  const encoded = AbiCoder.defaultAbiCoder().encode(
    [abiTypes(primaryType, types)],
    [abiValues(value, primaryType, types)],
  ) as `0x${string}`;

  /**
   *
   *                    Remove Extraneous Offset
   *
   * The ABI encoder encodes dynamic fields, dynamic tuples, or tuples
   * with nested dynamic fields at an offset. This also applies to the
   * primary type, or root tuple. However, function calldata encoding
   * always encodes the top-level tuple inline, the one corresponding
   * to the function signature
   *
   * To align with this behavior, we slice the root offset if one present,
   * ensuring that the primary type is always encoded at offset zero.
   */
  return isInline(primaryType, types) ? encoded : `0x${encoded.slice(66)}`;
}

function abiTypes(typeReference: string, types: Types): string {
  const { type, isArray, isStruct, fixedLength } =
    parseTypeReference(typeReference);

  if (isArray && !fixedLength) {
    return `${abiTypes(type, types)}[]`;
  } else if (isArray && fixedLength) {
    return `tuple(${new Array(fixedLength)
      .fill(abiTypes(type, types))
      .join(",")})`;
  } else if (isStruct) {
    return `tuple(${types[type]
      .map((field) => abiTypes(field.type, types))
      .join(",")})`;
  } else {
    return type;
  }
}

function abiValues(value: any, typeReference: string, types: Types): any[] {
  const { type, isArray, isStruct } = parseTypeReference(typeReference);

  if (isArray) {
    return value.map((v: string) => abiValues(v, type, types));
  } else if (isStruct) {
    return types[type].map((field) =>
      abiValues(value[field.name], field.type, types),
    );
  } else {
    return value;
  }
}

function isInline(typeReference: string, types: Types): boolean {
  const { type, isArray, isStruct, fixedLength } =
    parseTypeReference(typeReference);

  if (isArray && !fixedLength) {
    return false;
  } else if (isArray && fixedLength) {
    return isInline(type, types);
  } else if (isStruct) {
    return types[type].every((field) => isInline(field.type, types));
  } else {
    return isAtomic(type);
  }
}
