export enum TypeKey {
  Atomic,
  Dynamic,
  Array,
  Struct,
  Hash,
}

export type Type =
  | {
      key: Exclude<TypeKey, TypeKey.Struct | TypeKey.Array>;
      signature: "";
      hash: `0x${string}`;
      elements: [];
    }
  | {
      key: TypeKey.Array;
      signature: "";
      hash: `0x${string}`;
      elements: [bigint];
    }
  | {
      key: TypeKey.Struct;
      signature: string;
      hash: `0x${string}`;
      elements: bigint[];
    };
