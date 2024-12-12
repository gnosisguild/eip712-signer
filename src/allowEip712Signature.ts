import type { TypedDataToPrimitiveTypes } from "abitype";
import { ParamType } from "ethers";
import { Prettify, TypedData, TypedDataDomain } from "viem";
import { FunctionPermissionCoerced, Scoping, c } from "zodiac-roles-sdk";

import { EIP_712_SIGNER_ADDRESS, SIGN_FUNCTION_SELECTOR, TYPED_VALUE_TUPLE } from "./const";
import { scopeTypedData } from "./scopeTypedData";
import { asAbiType } from "./utils";

type AllowEip712SignatureParameters<
  typedData extends TypedData | Record<string, unknown> = TypedData,
  primaryType extends keyof typedData = keyof typedData,
  ///
  primaryTypes = typedData extends TypedData ? keyof typedData : string,
  schema extends Record<string, unknown> = typedData extends TypedData
    ? TypedDataToPrimitiveTypes<typedData>
    : Record<string, unknown>,
  message = schema[primaryType extends keyof schema ? primaryType : keyof schema],
> = {
  types: typedData;
  primaryType:
    | primaryTypes // show all values
    | (primaryType extends primaryTypes ? primaryType : never); // infer value
  domain?: Scoping<schema extends { EIP712Domain: infer domain } ? domain : Prettify<TypedDataDomain>>;
  message?: Scoping<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { [_: string]: any } extends message // Check if message was inferred
      ? Record<string, unknown>
      : message
  >;
};

export const allowEip712Signature = <const typedData extends TypedData, primaryType extends string>({
  domain,
  message,
  types,
  primaryType,
}: AllowEip712SignatureParameters<typedData, primaryType>): FunctionPermissionCoerced => {
  if (!types.EIP712Domain) {
    throw new Error("EIP712Domain must be provided in types");
  }

  if (typeof primaryType !== "string") {
    throw new Error("primaryType must be a string");
  }

  console.log(
    domain &&
      JSON.stringify(
        c.matches(domain)(ParamType.from(asAbiType({ types, primaryType: "EIP712Domain" }))),
        undefined,
        2,
      ),
  );

  const domainCondition =
    domain &&
    scopeTypedData({
      condition: c.matches(domain)(ParamType.from(asAbiType({ types, primaryType: "EIP712Domain" }))),
      types: types as TypedData,
      type: "EIP712Domain",
    });
  const messageCondition =
    message &&
    scopeTypedData({
      condition: c.matches(message)(ParamType.from(asAbiType({ types, primaryType }))),
      types: types as TypedData,
      type: primaryType,
    });

  return {
    targetAddress: EIP_712_SIGNER_ADDRESS.toLowerCase() as `0x${string}`,
    selector: SIGN_FUNCTION_SELECTOR,
    delegatecall: true,
    condition: c.calldataMatches([domainCondition, messageCondition], [TYPED_VALUE_TUPLE, TYPED_VALUE_TUPLE])(),
  };
};
