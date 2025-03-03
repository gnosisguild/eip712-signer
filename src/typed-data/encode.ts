import { TypedDataDomain } from "abitype";
import { TypedDataField } from "ethers";

import { encodeTypes } from "./encodeTypes";
import { encodeTypedValue } from "./encodeValue";
import { AbiParam } from "./types";

type Value = Record<string, any>;
type Types = Record<string, Array<TypedDataField>>;

export const encodeTypedData = ({
  domain,
  types,
  message,
}: {
  domain: TypedDataDomain;
  types: Types;
  message: Value;
}) => {
  return {
    domain: encodeTypedDomain({ domain }),
    message: {
      data: encodeTypedValue({ types, value: message }),
      params: encodeTypes({ types }),
    },
  };
};

export const encodeTypedDomain = ({
  domain,
}: {
  domain: TypedDataDomain;
}): { data: `0x${string}`; params: AbiParam[] } => {
  // TODO validate
  // TODO infer field
  // validateTypedData({ domain, message, primaryType, types });

  const types = { EIP712Domain: typesForDomain(domain) };

  return {
    data: encodeTypedValue({ types, value: domain }),
    params: encodeTypes({ types }),
  };
};

export const encodeTypedMessage = ({
  types,
  message,
}: {
  types: Types;
  message: Value;
}): { data: `0x${string}`; params: AbiParam[] } => {
  return {
    data: encodeTypedValue({ types, value: message }),
    params: encodeTypes({ types }),
  };
};

function typesForDomain(domain: Value): TypedDataField[] {
  return [
    typeof domain?.name === "string" && { name: "name", type: "string" },
    domain?.version && { name: "version", type: "string" },
    typeof domain?.chainId === "number" && {
      name: "chainId",
      type: "uint256",
    },
    domain?.verifyingContract && {
      name: "verifyingContract",
      type: "address",
    },
    domain?.salt && { name: "salt", type: "bytes32" },
  ].filter(Boolean) as TypedDataField[];
}
