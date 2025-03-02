export enum AbiType {
  Static,
  Dynamic,
  Array,
  Tuple,
}

export type AbiParam =
  | {
      _type: Exclude<AbiType, AbiType.Tuple | AbiType.Array>;
      signature: "";
      typeHash: `0x${string}`;
      fields: [];
    }
  | {
      _type: AbiType.Array;
      signature: "";
      typeHash: `0x${string}`;
      fields: [bigint];
    }
  | {
      _type: AbiType.Tuple;
      signature: string;
      typeHash: `0x${string}`;
      fields: bigint[];
    };
