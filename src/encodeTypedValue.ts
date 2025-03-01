import {
  SignTypedDataParameters,
  TypedData,
  TypedDataDefinition,
  encodeAbiParameters,
  getTypesForEIP712Domain,
  parseAbiParameters,
  validateTypedData,
} from "viem";

import { Type, TypeKey } from "./types";
import { encodeStructType, isAtomic } from "./utils";

// when EIP712Domain is in the types, viem will infer the domain.chainId field as bigint, while its TypedDataDomain also allows numbers
type FixDomainChainIdType<T> = T extends { domain?: { chainId?: bigint } }
  ? Omit<T, "domain"> & {
      domain?: Omit<T["domain"], "chainId"> & {
        chainId?: number | bigint | undefined;
      };
    }
  : T;

export const encodeTypedData = <
  const typedData extends TypedData | { [key: string]: unknown },
  primaryType extends string,
>(
  parameters: FixDomainChainIdType<TypedDataDefinition<typedData, primaryType>>,
) => {
  const { domain, message, primaryType } =
    parameters as unknown as SignTypedDataParameters;
  const types = {
    EIP712Domain: getTypesForEIP712Domain({ domain }),
    ...parameters.types,
  } as TypedData;

  validateTypedData({ domain, message, primaryType, types });

  return [
    encodeTypedValue(types, domain, "EIP712Domain"),
    encodeTypedValue(types, message, primaryType),
    encodeTypes({ types, primaryType }),
    1,
  ];
};

export function encodeTypedValue(
  types: TypedData,
  value: any,
  entryType: string,
) {
  const abiParams = parseAbiParameters(getAbiTypes(types, entryType));
  const abiValues = [getAbiValues(types, value, entryType)];
  console.log(getAbiTypes(types, entryType));
  return encodeAbiParameters(abiParams, abiValues);
}

function getAbiTypes(types: TypedData, typeName: string): string {
  const { type, isArray, isStruct } = stripType(types, typeName);

  if (isStruct) {
    const fields = types[type];
    return `(${fields.map(({ type }) => getAbiTypes(types, type)).join(",")})`;
  } else if (isArray) {
    return `${getAbiTypes(types, type)}[]`;
  } else {
    return type;
  }
}

function getAbiValues(types: TypedData, value: any, typeName: string): any[] {
  const { type, isArray, isStruct } = stripType(types, typeName);

  if (isStruct) {
    const fields = types[type];
    return fields.map(({ name, type }) =>
      getAbiValues(types, value[name], type),
    );
  } else if (isArray) {
    return value.map((v: string) => getAbiValues(types, v, type));
  } else {
    return value;
  }
}

function stripType(types: TypedData, _type: string) {
  const isArray = _type.indexOf("[") !== -1;
  const type = isArray ? _type.split("[")[0]! : _type;
  const isStruct = !!types[type];

  return {
    isArray,
    isStruct,
    type,
  };
}

export const encodeTypes = ({
  types,
  primaryType,
}: {
  types: TypedData;
  primaryType: string;
}): Type[] => {
  const { EIP712Domain: _0, [primaryType]: _1, ...rest } = types;

  const orderedTypeKeys = ["EIP712Domain", primaryType, ...Object.keys(rest)];

  const referenceType = (type: string): bigint => {
    const index = orderedTypeKeys.indexOf(type);
    if (index === -1) {
      orderedTypeKeys.push(type);
      return BigInt(orderedTypeKeys.length - 1);
    }
    return BigInt(index);
  };

  const mapType = (type: string): Type => {
    const isStruct = type in types || !!types[type];
    if (isStruct) {
      return {
        key: TypeKey.Struct,
        structSignature: encodeStructType({ types, primaryType: type }),
        elements: types[type].map((type) => referenceType(type.type)),
      };
    }

    const isArray = type.includes("[");
    if (isArray) {
      const elementType = isArray ? type.split("[")[0] : type;
      return {
        key: TypeKey.Array,
        structSignature: "",
        elements: [referenceType(elementType)],
      };
    }

    // basic type
    return {
      key: isAtomic(type) ? TypeKey.Atomic : TypeKey.Dynamic,
      structSignature: "",
      elements: [],
    };
  };

  const result = [];
  let index = 0;
  while (orderedTypeKeys[index]) {
    result.push(mapType(orderedTypeKeys[index]));
    index++;
  }

  return result;
};
