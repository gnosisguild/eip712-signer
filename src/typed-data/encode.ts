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
  const { data: domainData, types: domainTypes } = encodeTypedDomain({
    domain,
  });
  const { data: messageData, types: messageTypes } = encodeTypedMessage({
    types,
    message,
  });

  return {
    domain: domainData,
    message: messageData,
    types: mergeRootTypes(domainTypes, messageTypes),
  };
};

export const encodeTypedDomain = ({ domain }: { domain: TypedDataDomain }) => {
  const types = { EIP712Domain: typesForDomain(domain) };

  return encodeTypedMessage({ types, message: domain });
};

export const encodeTypedMessage = ({
  types,
  message,
}: {
  types: Types;
  message: Value;
}) => {
  return {
    data: encodeTypedValue({ types, value: message }),
    types: encodeTypes({ types }),
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

function mergeRootTypes(domainTypes: AbiParam[], messageTypes: AbiParam[]) {
  const shiftBy = (offset: number) => (param: AbiParam) => ({
    ...param,
    fields: param.fields.map((f) => f + offset),
  });

  const [domainFirst, ...domainRest] = domainTypes;
  const [messageFirst, ...messageRest] = messageTypes;
  const domainShift = 1;
  const messageShift = domainTypes.length;

  return [
    shiftBy(domainShift)(domainFirst),
    shiftBy(messageShift)(messageFirst),
    ...domainRest.map(shiftBy(domainShift)),
    ...messageRest.map(shiftBy(messageShift)),
  ];
}
