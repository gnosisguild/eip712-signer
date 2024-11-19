import { Hex } from "viem";

export enum DataType {
  Atomic,
  Dynamic,
  Array,
  Struct,
  Hash,
}

export type TypedValue =
  | {
      dataType: Exclude<DataType, DataType.Struct>;
      value: Hex;
      structSignature: "";
    }
  | {
      dataType: DataType.Struct;
      value: Hex;
      structSignature: string;
    };
