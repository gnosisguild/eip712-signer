import { FunctionPermissionCoerced, c } from "zodiac-roles-sdk";
import { Scoping, StructScoping } from "zodiac-roles-sdk/build/cjs/sdk/src/permissions/authoring/conditions/types";

import { EIP_712_SIGNER_ADDRESS, SIGN_FUNCTION_SELECTOR } from "./const";
import { TypedValue } from "./types";

interface TypedMessageScoping {
  domain?: {
    chainId?: Scoping<number>;
    name?: Scoping<string>;
    salt?: Scoping<string>;
    verifyingContract?: Scoping<string>;
    version?: Scoping<string>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message?: StructScoping<{ [key: string]: any }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const scopeTypedValue = (scoping: StructScoping<{ [key: string]: any }>): StructScoping<TypedValue> => {};

export const allowEip712Signature = (scoping: TypedMessageScoping): FunctionPermissionCoerced => ({
  targetAddress: EIP_712_SIGNER_ADDRESS.toLowerCase() as `0x${string}`,
  selector: SIGN_FUNCTION_SELECTOR,
  delegatecall: true,
  condition: scoping.message
    ? c.calldataMatches(
        [scoping.domain && scopeTypedValue(scoping.domain), scopeTypedValue(scoping.message)],
        [
          "(uint8 dataType, bytes value, string structSignature)",
          "(uint8 dataType, bytes value, string structSignature)",
        ],
      )()
    : c.calldataMatches(
        [scoping.domain && scopeTypedValue(scoping.domain)],
        ["(uint8 dataType, bytes value, string structSignature)"],
      )(),
});
