import { TypedData, TypedDataDomain } from "abitype";
import { Interface } from "ethers";

import Artifact from "../artifacts/contracts/SignTypedMessageLib.sol/SignTypedMessageLib.json";
import {
  encodeTypedDomain,
  encodeTypedMessage,
  toAbiParams,
} from "./typed-data";

const iface = Interface.from(Artifact.abi);

type Value = Record<string, any>;

export function encodeSignTypedMessage({
  domain,
  types,
  message,
}: {
  domain: TypedDataDomain;
  types: TypedData;
  message: Value;
}) {
  return iface.encodeFunctionData("signTypedMessage", [
    encodeTypedDomain({ domain }),
    encodeTypedMessage({ types, message }),
    toAbiParams({ domain, types }),
  ]);
}

export function encodeSignMessage({ message }: { message: string }) {
  return iface.encodeFunctionData("signMessage", [message]);
}
