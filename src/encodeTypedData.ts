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

import { TYPED_VALUE_TUPLE_ARRAY } from "./const";
import { DataType, TypedValue } from "./types";
import { encodeType, isAtomic } from "./utils";

const TYPED_VALUE_TUPLE_ARRAY_PARSED = parseAbiParameters(TYPED_VALUE_TUPLE_ARRAY)[0];

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
      dataType: DataType.Struct,
      value: encodeAbiParameters(
        [TYPED_VALUE_TUPLE_ARRAY_PARSED],
        [
          structFields.map(({ name, type }) =>
            encodeTypedValue({ value: value[name as keyof typeof value], types, type }),
          ),
        ],
      ),
      structSignature: encodeType({ types, primaryType: type }),
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
        [TYPED_VALUE_TUPLE_ARRAY_PARSED],
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
