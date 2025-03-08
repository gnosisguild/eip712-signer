import { TypedDataField } from "ethers";

import { findPrimaryType } from "./findPrimaryType";
import { ATOMIC_TYPES, DYNAMIC_TYPES } from "./types";

type Types = Record<string, Array<TypedDataField>>;

export function collectTypeReferences({ types }: { types: Types }) {
  const result: string[] = [];

  const collect = (typeReference: string) => {
    typeReference = typeReference || findPrimaryType({ types });
    if (result.indexOf(typeReference) !== -1) {
      return;
    }
    result.push(typeReference);

    const { type } = parseTypeReference(typeReference);
    collect(type);
    for (const field of types[type] || []) {
      collect(field.type);
    }
  };

  collect(findPrimaryType({ types }));
  return result;
}

export function parseTypeReference(maybeArrayType: string) {
  const isArray = maybeArrayType.indexOf("[") !== -1;
  const type = isArray ? maybeArrayType.split("[")[0] : maybeArrayType;
  const isStruct = !isNative(type);
  const fixedLength = isArray
    ? Number(maybeArrayType.split("[")[1].slice(0, -1))
    : 0;

  return {
    type,
    isArray,
    isStruct,
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
