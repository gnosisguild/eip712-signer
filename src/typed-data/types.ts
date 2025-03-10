// should we just use? -> import { ParameterType } from "zodiac-roles-sdk/.";
export enum AbiType {
  None,
  Static,
  Dynamic,
  Array,
  Tuple,
}

export type AbiParam =
  | {
      _type: Exclude<AbiType, AbiType.None | AbiType.Tuple | AbiType.Array>;
      typeHash: `0x${string}`;
      typeSignature: string;
      fields: [];
    }
  | {
      _type: AbiType.Array;
      typeHash: `0x${string}`;
      typeSignature: string;
      fields: [number];
    }
  | {
      _type: AbiType.Tuple;
      typeHash: `0x${string}`;
      typeSignature: string;
      fields: number[];
    };
