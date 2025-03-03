import { TypedDataField, ZeroHash, keccak256, toUtf8Bytes } from "ethers";

import { describeType } from "./describeType";
import { findPrimaryType, isAtomic, parseTypeReference } from "./typeReference";
import { AbiParam, AbiType } from "./types";

type Types = Record<string, Array<TypedDataField>>;

export const encodeTypes = ({ types }: { types: Types }): AbiParam[] => {
  const primaryType = findPrimaryType({ types });

  const { [primaryType]: _1, ...rest } = types;

  const orderedTypeKeys = [primaryType, ...Object.keys(rest)];

  const fieldIndex = (type: string): number => {
    const index = orderedTypeKeys.indexOf(type);
    if (index === -1) {
      orderedTypeKeys.push(type);
      return orderedTypeKeys.length - 1;
    }
    return index;
  };

  const mapType = (typeReference: string): AbiParam => {
    const { isArray, isStruct, type, fixedLength } =
      parseTypeReference(typeReference);

    if (isStruct) {
      const signature = describeType({ types, type });
      return {
        _type: AbiType.Tuple,
        signature,
        typeHash: keccak256(toUtf8Bytes(signature)) as `0x${string}`,
        fields: types[type].map((field) => fieldIndex(field.type)),
      };
    }

    if (isArray && fixedLength) {
      return {
        _type: AbiType.Tuple,
        signature: "",
        typeHash: ZeroHash as `0x${string}`,
        fields: new Array(fixedLength).fill(fieldIndex(type)),
      };
    }

    if (isArray && !fixedLength) {
      return {
        _type: AbiType.Array,
        signature: "",
        typeHash: ZeroHash as `0x${string}`,
        fields: [fieldIndex(type)],
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
