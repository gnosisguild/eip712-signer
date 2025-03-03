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
      signature: "";
      typeHash: `0x${string}`;
      fields: [];
    }
  | {
      _type: AbiType.Array;
      signature: "";
      typeHash: `0x${string}`;
      fields: [number];
    }
  | {
      _type: AbiType.Tuple;
      signature: string;
      typeHash: `0x${string}`;
      fields: number[];
    };
