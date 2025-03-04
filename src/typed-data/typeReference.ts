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

export function parseTypeReference(typeReference: string) {
  const isArray = typeReference.indexOf("[") !== -1;
  const isStruct = !isArray && !isNative(typeReference);
  const fixedLength = isArray
    ? Number(typeReference.split("[")[1].slice(0, -1))
    : 0;

  return {
    isArray,
    isStruct,
    type: isArray ? typeReference.split("[")[0] : typeReference,
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
