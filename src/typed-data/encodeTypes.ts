import { TypedDataField, ZeroHash, keccak256, toUtf8Bytes } from "ethers";

import { describeType } from "./describeType";
import { findPrimaryType, isAtomic, parseTypeReference } from "./typeReference";
import { AbiParam, AbiType } from "./types";

type Types = Record<string, Array<TypedDataField>>;

export const encodeTypes = ({ types }: { types: Types }): AbiParam[] => {
  return allTypeReferences({ types }).map(
    (
      typeReference: string,
      _: number,
      allTypeReferences: string[],
    ): AbiParam => {
      const { isArray, isStruct, type, fixedLength } =
        parseTypeReference(typeReference);

      if (isStruct) {
        const signature = describeType({ types, type });
        return {
          _type: AbiType.Tuple,
          signature,
          typeHash: keccak256(toUtf8Bytes(signature)) as `0x${string}`,
          fields: types[type].map((field) =>
            allTypeReferences.indexOf(field.type),
          ),
        };
      }

      if (isArray && fixedLength) {
        return {
          _type: AbiType.Tuple,
          signature: "",
          typeHash: ZeroHash as `0x${string}`,
          fields: new Array(fixedLength).fill(allTypeReferences.indexOf(type)),
        };
      }

      if (isArray && !fixedLength) {
        return {
          _type: AbiType.Array,
          signature: "",
          typeHash: ZeroHash as `0x${string}`,
          fields: [allTypeReferences.indexOf(type)],
        };
      }

      // basic type
      return {
        _type: isAtomic(type) ? AbiType.Static : AbiType.Dynamic,
        signature: "",
        typeHash: ZeroHash as `0x${string}`,
        fields: [],
      };
    },
  );
};

function allTypeReferences({ types }: { types: Types }) {
  const result: string[] = [];

  const collect = (typeReference: string) => {
    typeReference = typeReference || findPrimaryType({ types });
    if (result.indexOf(typeReference) !== -1) {
      return;
    }
    result.push(typeReference);

    const { type } = parseTypeReference(typeReference);
    collect(type);
    for (const field of types[type] || []) {
      collect(field.type);
    }
  };

  collect(findPrimaryType({ types }));
  return result;
}
