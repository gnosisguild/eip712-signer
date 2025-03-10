import { AbiCoder, TypedDataField } from "ethers";

import { findPrimaryType, parseType } from "./definition";

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
    [abiTypes(types, primaryType)],
    [abiValues(types, message, primaryType)],
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
  return isInline(types, primaryType) ? encoded : `0x${encoded.slice(66)}`;
}

function abiTypes(types: Types, type: string): string {
  const { type: baseType, isStruct, isArray, fixedLength } = parseType(type);

  if (isStruct) {
    return `tuple(${types[type]
      .map((field) => abiTypes(types, field.type))
      .join(",")})`;
  } else if (isArray && fixedLength) {
    return `tuple(${new Array(fixedLength)
      .fill(abiTypes(types, baseType))
      .join(",")})`;
  } else if (isArray && !fixedLength) {
    return `${abiTypes(types, baseType)}[]`;
  } else {
    return type;
  }
}

function abiValues(types: Types, value: any, type: string): any[] {
  const { type: baseType, isStruct, isArray } = parseType(type);

  if (isStruct) {
    return types[type].map((field) =>
      abiValues(types, value[field.name], field.type),
    );
  } else if (isArray) {
    return value.map((child: string) => abiValues(types, child, baseType));
  } else {
    return value;
  }
}

function isInline(types: Types, type: string): boolean {
  const {
    type: baseType,
    isAtomic,
    isStruct,
    isArray,
    fixedLength,
  } = parseType(type);

  if (isStruct) {
    return types[type].every((field) => isInline(types, field.type));
  } else if (isArray && fixedLength) {
    return isInline(types, baseType);
  } else if (isArray && !fixedLength) {
    return false;
  } else {
    return isAtomic;
  }
}
