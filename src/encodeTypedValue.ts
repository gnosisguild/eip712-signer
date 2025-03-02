import { AbiCoder, TypedDataDomain, TypedDataField, ZeroHash } from "ethers";

import { encodeType, hashType } from "./hashType";
import { AbiParam, AbiType } from "./types";
import { isAtomic } from "./utils";

export type TypedDataTypes = Record<string, Array<TypedDataField>>;
export type TypedDataValue = Record<string, any>;

export const _encodeDomain = (
  domain: TypedDataDomain,
): { data: `0x${string}`; params: AbiParam[] } => {
  // TODO validate
  // TODO infer field
  // validateTypedData({ domain, message, primaryType, types });

  const types = { EIP712Domain: domainTypes(domain) };

  return {
    data: encodeData(types, domain, "EIP712Domain"),
    params: encodeTypes({ types, primaryType: "EIP712Domain" }),
  };
};

export const _encodeMessage = (
  types: TypedDataTypes,
  message: TypedDataValue,
  primaryType: string,
): { data: `0x${string}`; params: AbiParam[] } => {
  // TODO validate
  // TODO infer field
  // validateTypedData({ domain, message, primaryType, types });

  return {
    data: encodeData(types, message, primaryType),
    params: encodeTypes({ types, primaryType }),
  };
};

function encodeData(
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
}): AbiParam[] => {
  const { [primaryType]: _1, ...rest } = types;

  const orderedTypeKeys = [primaryType, ...Object.keys(rest)];

  const referenceType = (type: string): bigint => {
    const index = orderedTypeKeys.indexOf(type);
    if (index === -1) {
      orderedTypeKeys.push(type);
      return BigInt(orderedTypeKeys.length - 1);
    }
    return BigInt(index);
  };

  const mapType = (_type: string): AbiParam => {
    const { isArray, isStruct, type, fixedLength } = parseType(types, _type);

    if (isStruct) {
      return {
        _type: AbiType.Tuple,
        signature: encodeType({ types, primaryType: type }),
        typeHash: hashType({ types, primaryType: type }) as `0x${string}`,
        fields: types[type].map((field) => referenceType(field.type)),
      };
    }

    if (isArray && fixedLength) {
      return {
        _type: AbiType.Tuple,
        signature: "",
        typeHash: ZeroHash as `0x${string}`,
        fields: new Array(fixedLength).fill(referenceType(type)),
      };
    }

    if (isArray && !fixedLength) {
      return {
        _type: AbiType.Array,
        signature: "",
        typeHash: ZeroHash as `0x${string}`,
        fields: [referenceType(type)],
      };
    }

    // basic type
    return {
      _type: isAtomic(type) ? AbiType.Static : AbiType.Dynamic,
      signature: "",
      typeHash: ZeroHash as `0x${string}`,
      fields: [],
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
