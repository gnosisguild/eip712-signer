import { TypedDataDomain } from "abitype";
import { TypedDataField, ZeroHash } from "ethers";

import { isAtomic, parseType, typesForDomain } from "./definition";
import { findPrimaryType } from "./definition/findPrimaryType";
import { hashType } from "./definition/hashType";
import { AbiParam, AbiType } from "./types";

type Types = Record<string, Array<TypedDataField>>;

export const toAbiParams = ({
  domain,
  types,
}: {
  domain: TypedDataDomain;
  types: Types;
}): AbiParam[] => {
  const startTypes = Object.keys(types).length
    ? ["EIP712Domain", findPrimaryType({ types })]
    : ["EIP712Domain"];

  types = { ...types, EIP712Domain: typesForDomain(domain) };

  return allTypes(types, startTypes).map((type, _, allTypes) => {
    const { isArray, isStruct, type: baseType, fixedLength } = parseType(type);

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

    if (isStruct) {
      const { typeSignature, typeHash } = hashType({ types, type });
      return {
        _type: AbiType.Tuple,
        typeHash,
        typeSignature,
        fields: types[baseType].map((field) => allTypes.indexOf(field.type)),
      };
    }

    return {
      _type: isAtomic(type) ? AbiType.Static : AbiType.Dynamic,
      typeHash: ZeroHash as `0x${string}`,
      typeSignature: "",
      fields: [],
    };
  });
};

function allTypes(types: Types, queue: string[]) {
  const result: string[] = [];

  while (queue.length) {
    const type = queue.shift()!;
    if (result.includes(type)) continue;

    result.push(type);

    const { type: baseType } = parseType(type);
    queue = queue.concat(
      baseType,
      (types[baseType] || []).map((field) => field.type),
    );
  }

  return result;
}
