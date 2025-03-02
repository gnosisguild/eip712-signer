import { AbiCoder, TypedDataDomain, TypedDataField, ZeroHash } from "ethers";

import { encodeType, hashType } from "./hashType";
import { Type, TypeKey } from "./types";
import { isAtomic } from "./utils";

export type TypedDataTypes = Record<string, Array<TypedDataField>>;
export type TypedDataValue = Record<string, any>;

export const encodeTypedData = (
  domain: TypedDataDomain,
  types: TypedDataTypes,
  message: TypedDataValue,
  primaryType: string,
): [`0x${string}`, Type[], `0x${string}`] => {
  // TODO validate
  // TODO infer field
  // validateTypedData({ domain, message, primaryType, types });

  types = { EIP712Domain: domainTypes(domain), ...types };

  return [
    encodeTypedValue(types, domain, "EIP712Domain"),
    encodeTypes({
      types,
      primaryType,
    }),
    encodeTypedValue(types, message, primaryType),
  ];
};

export function encodeTypedValue(
  types: TypedDataTypes,
  value: TypedDataValue,
  entryType: string,
) {
  return AbiCoder.defaultAbiCoder().encode(
    [getAbiTypes(types, entryType)],
    [getAbiValues(types, value, entryType)],
  ) as `0x${string}`;
}

function getAbiTypes(types: TypedDataTypes, typeName: string): string {
  const { type, isArray, isStruct, fixedLength } = parseType(types, typeName);

  if (isStruct) {
    const fields = types[type];
    return `tuple(${fields
      .map(({ type }) => getAbiTypes(types, type))
      .join(",")})`;
  } else if (isArray && !fixedLength) {
    return `${getAbiTypes(types, type)}[]`;
  } else if (isArray && fixedLength) {
    return `tuple(${new Array(fixedLength)
      .fill(getAbiTypes(types, type))
      .join(",")})`;
  } else {
    return type;
  }
}

function getAbiValues(
  types: TypedDataTypes,
  value: any,
  typeName: string,
): any[] {
  const { type, isArray, isStruct } = parseType(types, typeName);

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

export const encodeTypes = ({
  types,
  primaryType,
}: {
  types: TypedDataTypes;
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

  const mapType = (_type: string): Type => {
    const { isArray, isStruct, type, fixedLength } = parseType(types, _type);

    if (isStruct) {
      return {
        key: TypeKey.Struct,
        signature: encodeType({ types, primaryType: type }),
        hash: hashType({ types, primaryType: type }) as `0x${string}`,
        elements: types[type].map((field) => referenceType(field.type)),
      };
    }

    if (isArray && fixedLength) {
      return {
        key: TypeKey.Struct,
        signature: "",
        hash: ZeroHash as `0x${string}`,
        elements: new Array(fixedLength).fill(referenceType(type)),
      };
    }

    if (isArray && !fixedLength) {
      return {
        key: TypeKey.Array,
        signature: "",
        hash: ZeroHash as `0x${string}`,
        elements: [referenceType(type)],
      };
    }

    // basic type
    return {
      key: isAtomic(type) ? TypeKey.Atomic : TypeKey.Dynamic,
      signature: "",
      hash: ZeroHash as `0x${string}`,
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

function parseType(types: TypedDataTypes, type: string) {
  const isArray = type.indexOf("[") !== -1;
  const parsedType = isArray ? type.split("[")[0] : type;
  const isStruct = !!types[type];
  const fixedLength = isArray ? Number(type.split("[")[1].slice(0, -1)) : 0;

  return {
    isArray,
    isStruct,
    type: parsedType,
    fixedLength,
  };
}

function domainTypes(domain: TypedDataValue): TypedDataField[] {
  return [
    typeof domain?.name === "string" && { name: "name", type: "string" },
    domain?.version && { name: "version", type: "string" },
    typeof domain?.chainId === "number" && {
      name: "chainId",
      type: "uint256",
    },
    domain?.verifyingContract && {
      name: "verifyingContract",
      type: "address",
    },
    domain?.salt && { name: "salt", type: "bytes32" },
  ].filter(Boolean) as TypedDataField[];
}
