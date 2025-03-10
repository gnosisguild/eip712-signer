import { isNative } from ".";

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
