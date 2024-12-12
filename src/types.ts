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
      structSignature: "";
      elements: [];
    }
  | {
      key: TypeKey.Array;
      structSignature: "";
      elements: [bigint];
    }
  | {
      key: TypeKey.Struct;
      structSignature: string;
      elements: bigint[];
    };
