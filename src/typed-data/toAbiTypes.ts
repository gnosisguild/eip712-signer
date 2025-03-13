import { TypedData, TypedDataDomain } from "abitype";
import { ZeroHash } from "ethers";

import {
  allTypes,
  findRootTypes,
  hashType,
  parseType,
  typesForDomain,
} from "./definition";
import { AbiParam, AbiType } from "./types";

export function toAbiTypes({
  domain,
  types = {},
}: {
  domain?: TypedDataDomain;
  types?: TypedData;
}): AbiParam[] {
  if (domain) {
    types = {
      ...types,
      EIP712Domain: typesForDomain(domain),
    } as any;
  }

  const rootTypes = findRootTypes({ types });

  return [
    ...rootTypes.map((_, index) => ({
      key: AbiType.AbiEncoded,
      typeHash: ZeroHash as `0x${string}`,
      typeSignature: "",
      fields: [index],
    })),
    ...allTypes(types, rootTypes).map((type, _, allTypes) => {
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
          key: AbiType.Tuple,
          typeHash,
          typeSignature,
          fields: types[type].map((field) => allTypes.indexOf(field.type)),
        };
      }

      if (isArray && fixedLength) {
        return {
          key: AbiType.Tuple,
          typeHash: ZeroHash as `0x${string}`,
          typeSignature: "",
          fields: new Array(fixedLength).fill(allTypes.indexOf(baseType)),
        };
      }

      if (isArray && !fixedLength) {
        return {
          key: AbiType.Array,
          typeHash: ZeroHash as `0x${string}`,
          typeSignature: "",
          fields: [allTypes.indexOf(baseType)],
        };
      }

      return {
        key: isAtomic ? AbiType.Static : AbiType.Dynamic,
        typeHash: ZeroHash as `0x${string}`,
        typeSignature: "",
        fields: [],
      };
    }),
  ].map((a) => ({ ...a, fields: a.fields.map((f) => f + rootTypes.length) }));
}
