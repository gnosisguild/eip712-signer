import {
  SignTypedDataParameters,
  TypedData,
  TypedDataDefinition,
  encodeAbiParameters,
  getTypesForEIP712Domain,
  parseAbiParameter,
  parseAbiParameters,
  validateTypedData,
} from "viem";

import { DataType, TypedValue } from "./types";

export const TYPED_VALUE_TUPLE_ARRAY = parseAbiParameters("(uint8 dataType, bytes value, string structSignature)[]")[0];

export const encodeTypedData = <
  const typedData extends TypedData | { [key: string]: unknown },
  primaryType extends string,
>(
  parameters: TypedDataDefinition<typedData, primaryType>,
) => {
  const { domain, message, primaryType } = parameters as unknown as SignTypedDataParameters;
  const types = {
    EIP712Domain: getTypesForEIP712Domain({ domain }),
    ...parameters.types,
  } as TypedData;

  // checks on addresses, byte ranges, integer ranges, etc
  validateTypedData({ domain, message, primaryType, types });

  return {
    domain: encodeTypedValue({ value: domain, types, type: "EIP712Domain" }),
    message: encodeTypedValue({ value: message, types, type: primaryType }),
  };
};

const encodeTypedValue = <T extends TypedData>({
  value,
  types,
  type,
}: {
  value: unknown;
  types: T;
  type: string;
}): TypedValue => {
  const isArray = type.includes("[");
  const elementType = isArray ? type.split("[")[0] : type;
  const isStruct = elementType in types;

  // struct
  if (isStruct && !isArray) {
    if (Array.isArray(value) || typeof value !== "object" || !value) {
      throw new Error(`Expected plain object value for type ${type}`);
    }
    const structFields = types[type];
    return {
      dataType: DataType.Array,
      value: encodeAbiParameters(
        [TYPED_VALUE_TUPLE_ARRAY],
        [
          structFields.map(({ name, type }) =>
            encodeTypedValue({ value: value[name as keyof typeof value], types, type }),
          ),
        ],
      ),
      structSignature: "",
    };
  }

  // array of structs
  if (isStruct && isArray) {
    if (!Array.isArray(value)) {
      throw new Error(`Expected array value for type ${type}`);
    }

    return {
      dataType: DataType.Array,
      value: encodeAbiParameters(
        [TYPED_VALUE_TUPLE_ARRAY],
        [value.map((v) => encodeTypedValue({ value: v, types, type: elementType }))],
      ),
      structSignature: "",
    };
  }

  // basic type
  const abiParam = parseAbiParameter(type);
  return {
    dataType: isAtomic(type) ? DataType.Atomic : DataType.Dynamic,
    value: encodeAbiParameters([abiParam], [value]),
    structSignature: "",
  };
};

const isAtomic = (abiParameterType: string): boolean => {
  const isArray = abiParameterType.includes("[");
  if (isArray) return false;

  return (
    abiParameterType === "bool" || abiParameterType === "address" || !!abiParameterType.match(/(uint|int|bytes)\d+/)
  );
};

/**
 * Returns a sorted array of serialized struct types. The values should be concatenated to form the final encoded type.
 * see: https://eips.ethereum.org/EIPS/eip-712#definition-of-encodetype
 **/
export const encodeType = <T extends TypedData>({ types, primaryType }: { types: T; primaryType: keyof T }): string => {
  if (typeof primaryType !== "string") {
    throw new Error(`Unexpected primary type: ${String(primaryType)}`);
  }

  const referencedStructs = Array.from(collectReferencedStructs({ types, primaryType }))
    .filter((type) => type !== primaryType)
    .sort();

  const serializeType = (type: string) =>
    type + "(" + types[type].map(({ name, type }) => `${type} ${name}`).join(",") + ")";

  return [primaryType, ...referencedStructs].map(serializeType).join("");
};

const collectReferencedStructs = <T extends TypedData>(
  {
    types,
    primaryType,
  }: {
    types: T;
    primaryType: string;
  },
  acc: Set<string> = new Set(),
): Set<string> => {
  if (acc.has(primaryType)) {
    return acc;
  }

  acc.add(primaryType);

  const referencedStructs = types[primaryType].map(({ type }) => type.split("[")[0]).filter((type) => type in types);
  for (const type of referencedStructs) {
    collectReferencedStructs({ types, primaryType: type }, acc);
  }

  return acc;
};
