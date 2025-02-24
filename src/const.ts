import { Eip712Signer__factory } from "../types";

export const EIP_712_SIGNER_ADDRESS = "0x" as const;
export const SIGN_FUNCTION_SELECTOR = Eip712Signer__factory.createInterface().getFunction("signTypedMessage")
  .selector as `0x${string}`;
