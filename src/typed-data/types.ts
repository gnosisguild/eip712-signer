// should we just use? -> import { ParameterType } from "zodiac-roles-sdk/.";
export enum AbiType {
  None = 0,
  Static,
  Dynamic,
  Tuple,
  Array,
  AbiEncodedWithSelector,
  AbiEncoded,
}

export type AbiParam = {
  key: AbiType;
  typeHash: `0x${string}`;
  typeSignature: string;
  fields: number[];
};
