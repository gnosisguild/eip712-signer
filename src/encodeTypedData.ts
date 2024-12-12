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

import { Eip712Signer } from "../types";
import { Type, TypeKey } from "./types";
import { encodeStructType, isAtomic } from "./utils";

const BYTES_ARRAY = parseAbiParameters("bytes[]")[0];

// when EIP712Domain is in the types, viem will infer the domain.chainId field as bigint, while its TypedDataDomain also allows numbers
type FixDomainChainIdType<T> = T extends { domain?: { chainId?: bigint } }
  ? Omit<T, "domain"> & { domain?: Omit<T["domain"], "chainId"> & { chainId?: number | bigint | undefined } }
  : T;

type EncodedTypedData = [
  domain: `0x${string}`,
  message: `0x${string}`,
  types: Eip712Signer.TypeStruct[],
  primaryType: 1,
];

export const encodeTypedData = <
  const typedData extends TypedData | { [key: string]: unknown },
  primaryType extends string,
>(
  parameters: FixDomainChainIdType<TypedDataDefinition<typedData, primaryType>>,
): EncodedTypedData => {
  const { domain, message, primaryType } = parameters as unknown as SignTypedDataParameters;
  const types = {
    EIP712Domain: getTypesForEIP712Domain({ domain }),
    ...parameters.types,
  } as TypedData;

  // checks on addresses, byte ranges, integer ranges, etc
  validateTypedData({ domain, message, primaryType, types });

  return [
    encodeTypedValue({ value: domain, types, type: "EIP712Domain" }),
    encodeTypedValue({ value: message, types, type: primaryType }),
    encodeTypes({ types, primaryType }),
    1,
  ];
};

const encodeTypedValue = <T extends TypedData>({
  value,
  types,
  type,
}: {
  value: unknown;
  types: T;
  type: string;
}): `0x${string}` => {
  const isArray = type.includes("[");

  if (isArray) {
    const elementType = isArray ? type.split("[")[0] : type;
    if (!Array.isArray(value)) {
      throw new Error(`Expected array value for type ${type}`);
    }
    return encodeAbiParameters(
      [BYTES_ARRAY],
      [value.map((v) => encodeTypedValue({ value: v, types, type: elementType }))],
    );
  }

  // struct

  const isStruct = type in types;
  if (isStruct) {
    if (Array.isArray(value) || typeof value !== "object" || !value) {
      throw new Error(`Expected plain object value for type ${type}`);
    }
    const structFields = types[type];
    return encodeAbiParameters(
      [BYTES_ARRAY],
      [
        structFields.map(({ name, type }) =>
          encodeTypedValue({ value: value[name as keyof typeof value], types, type }),
        ),
      ],
    );
  }

  // basic type
  const abiParam = parseAbiParameter(type);
  return encodeAbiParameters([abiParam], [value]);
};

const encodeTypes = ({ types, primaryType }: { types: TypedData; primaryType: string }): Type[] => {
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
      return { key: TypeKey.Array, structSignature: "", elements: [referenceType(elementType)] };
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
