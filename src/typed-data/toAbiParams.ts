import { TypedDataDomain } from "abitype";
import { TypedDataField, ZeroHash } from "ethers";

import { findPrimaryType } from "./findPrimaryType";
import { hashType } from "./hashType";
import { isAtomic, parseType } from "./parseType";
import { AbiParam, AbiType } from "./types";
import { typesForDomain } from "./typesForDomain";

type Types = Record<string, Array<TypedDataField>>;

export const toAbiParams = ({
  domain,
  types,
}: {
  domain: TypedDataDomain;
  types: Types;
}): AbiParam[] => {
  const entrypoints = ["EIP712Domain", findPrimaryType({ types })];

  types = { ...types, EIP712Domain: typesForDomain(domain) };

  const typesFlat = collectAllTypes({ types, entrypoints });

  return typesFlat.map((type) => createAbiParam({ types, type, typesFlat }));
};

const createAbiParam = ({
  types,
  type,
  typesFlat,
}: {
  types: Types;
  type: string;
  typesFlat: string[];
}): AbiParam => {
  const { isArray, isStruct, type: baseType, fixedLength } = parseType(type);

  if (isArray && fixedLength) {
    return {
      _type: AbiType.Tuple,
      typeHash: ZeroHash as `0x${string}`,
      typeSignature: "",
      fields: new Array(fixedLength).fill(typesFlat.indexOf(baseType)),
    };
  }

  if (isArray && !fixedLength) {
    return {
      _type: AbiType.Array,
      typeHash: ZeroHash as `0x${string}`,
      typeSignature: "",
      fields: [typesFlat.indexOf(baseType)],
    };
  }

  if (isStruct) {
    const { typeSignature, typeHash } = hashType({ types, type });
    return {
      _type: AbiType.Tuple,
      typeHash,
      typeSignature,
      fields: types[baseType].map((field) => typesFlat.indexOf(field.type)),
    };
  }

  return {
    _type: isAtomic(type) ? AbiType.Static : AbiType.Dynamic,
    typeHash: ZeroHash as `0x${string}`,
    typeSignature: "",
    fields: [],
  };
};

function collectAllTypes({
  types,
  entrypoints,
}: {
  types: Types;
  entrypoints: string[];
}) {
  const result: string[] = [];

  let queue = entrypoints;
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
