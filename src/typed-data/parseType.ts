import { ATOMIC_TYPES, DYNAMIC_TYPES } from "./types";

export function parseType(maybeArrayType: string) {
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

export function isNative(type: string): boolean {
  return isAtomic(type) || isDynamic(type);
}

export function isAtomic(type: string): boolean {
  const isArray = type.includes("[");
  if (isArray) return false;

  return ATOMIC_TYPES[type] || false;
}

export function isDynamic(type: string): boolean {
  const isArray = type.includes("[");
  if (isArray) return false;

  return DYNAMIC_TYPES[type] || false;
}
