import {
  isArrayType,
  isAtomicType,
  isDynamicType,
  isStructType,
} from "./identity";

export function parseType(type: string) {
  const isAtomic = isAtomicType(type);
  const isDynamic = isDynamicType(type);
  const isStruct = isStructType(type);
  const isArray = isArrayType(type);

  return {
    type: isArray ? type.split("[")[0] : type,
    isAtomic,
    isDynamic,
    isStruct,
    isArray,
    fixedLength: isArray ? Number(type.split("[")[1].slice(0, -1)) : 0,
  };
}
