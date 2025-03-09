import { TypedDataDomain } from "abitype";
import { Interface, TypedDataField } from "ethers";

import Artifact from "../artifacts/contracts/SignTypedMessageLib.sol/SignTypedMessageLib.json";
import { encodeTypedDomain, encodeTypedValue, toAbiParams } from "./typed-data";

const iface = Interface.from(Artifact.abi);

type Value = Record<string, any>;
type Types = Record<string, Array<TypedDataField>>;

export function encodeSignTypedMessage({
  domain,
  types,
  message,
}: {
  domain: TypedDataDomain;
  types: Types;
  message: Value;
}) {
  return iface.encodeFunctionData("signTypedMessage", [
    encodeTypedDomain({ domain }),
    encodeTypedValue({ types, value: message }),
    toAbiParams({ domain, types }),
  ]);
}
