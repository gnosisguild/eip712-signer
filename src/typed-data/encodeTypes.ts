import { TypedDataField, ZeroHash } from "ethers";

import { hashType } from "./hashType";
import {
  collectTypeReferences,
  isAtomic,
  parseTypeReference,
} from "./typeReference";
import { AbiParam, AbiType } from "./types";

type Types = Record<string, Array<TypedDataField>>;

export const encodeTypes = ({ types }: { types: Types }): AbiParam[] => {
  return collectTypeReferences({ types }).map(
    (typeReference: string, _: number, allTypeReferences: string[]) => {
      const { isArray, isStruct, type, fixedLength } =
        parseTypeReference(typeReference);

      if (isArray && fixedLength) {
        return {
          _type: AbiType.Tuple,
          typeHash: ZeroHash as `0x${string}`,
          typeSignature: "",
          fields: new Array(fixedLength).fill(allTypeReferences.indexOf(type)),
        };
      }

      if (isArray && !fixedLength) {
        return {
          _type: AbiType.Array,
          typeHash: ZeroHash as `0x${string}`,
          typeSignature: "",
          fields: [allTypeReferences.indexOf(type)],
        };
      }

      if (isStruct) {
        const { typeSignature, typeHash } = hashType({ types, type });
        return {
          _type: AbiType.Tuple,
          typeHash,
          typeSignature,
          fields: types[type].map((field) =>
            allTypeReferences.indexOf(field.type),
          ),
        };
      }

      return {
        _type: isAtomic(type) ? AbiType.Static : AbiType.Dynamic,
        typeHash: ZeroHash as `0x${string}`,
        typeSignature: "",
        fields: [],
      };
    },
  );
};
