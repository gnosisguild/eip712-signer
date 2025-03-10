import { AbiCoder, TypedDataField } from "ethers";

import { findPrimaryType } from "./findPrimaryType";
import { isAtomic, parseType } from "./parseType";

type Types = Record<string, Array<TypedDataField>>;

export function packTypedMessage({
  types,
  message,
}: {
  types: Types;
  message: Record<string, any>;
}) {
  const primaryType = findPrimaryType({ types });
  const encoded = AbiCoder.defaultAbiCoder().encode(
    [abiTypes(primaryType, types)],
    [abiValues(message, primaryType, types)],
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

function abiTypes(type: string, types: Types): string {
  const { type: baseType, isArray, isStruct, fixedLength } = parseType(type);

  if (isArray && !fixedLength) {
    return `${abiTypes(baseType, types)}[]`;
  } else if (isArray && fixedLength) {
    return `tuple(${new Array(fixedLength)
      .fill(abiTypes(baseType, types))
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
  const { type, isArray, isStruct } = parseType(typeReference);

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
  const { type, isArray, isStruct, fixedLength } = parseType(typeReference);

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
