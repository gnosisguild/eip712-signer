import { TypedDataDomain } from "abitype";
import { TypedDataField, ZeroHash } from "ethers";

import {
  allTypes,
  findPrimaryType,
  hashType,
  parseType,
  typesForDomain,
} from "./definition";
import { AbiParam, AbiType } from "./types";

type Types = Record<string, Array<TypedDataField>>;

export const toAbiParams = ({
  domain,
  types,
}: {
  domain: TypedDataDomain;
  types: Types;
}): AbiParam[] => {
  const entrypoint = Object.keys(types).length
    ? ["EIP712Domain", findPrimaryType({ types })]
    : ["EIP712Domain"];

  types = { ...types, EIP712Domain: typesForDomain(domain) };

  return allTypes(types, entrypoint).map((type, _, allTypes) => {
    const {
      type: baseType,
      isAtomic,
      isStruct,
      isArray,
      fixedLength,
    } = parseType(type);

    if (isStruct) {
      const { typeSignature, typeHash } = hashType({ types, type });
      return {
        _type: AbiType.Tuple,
        typeHash,
        typeSignature,
        fields: types[type].map((field) => allTypes.indexOf(field.type)),
      };
    }

    if (isArray && fixedLength) {
      return {
        _type: AbiType.Tuple,
        typeHash: ZeroHash as `0x${string}`,
        typeSignature: "",
        fields: new Array(fixedLength).fill(allTypes.indexOf(baseType)),
      };
    }

    if (isArray && !fixedLength) {
      return {
        _type: AbiType.Array,
        typeHash: ZeroHash as `0x${string}`,
        typeSignature: "",
        fields: [allTypes.indexOf(baseType)],
      };
    }

    return {
      _type: isAtomic ? AbiType.Static : AbiType.Dynamic,
      typeHash: ZeroHash as `0x${string}`,
      typeSignature: "",
      fields: [],
    };
  });
};
