import { TypedData, TypedDataDomain } from "abitype";
import { Interface } from "ethers";

import Artifact from "../artifacts/contracts/SignTypedMessageLib.sol/SignTypedMessageLib.json";
import {
  encodeTypedDomain,
  encodeTypedMessage,
  toAbiTypes,
} from "./typed-data";

const iface = Interface.from(Artifact.abi);

export function encodeSignTypedMessage({
  domain,
  types,
  message,
}: {
  domain: TypedDataDomain;
  types: TypedData;
  message: Record<string, any>;
}) {
  return iface.encodeFunctionData("signTypedMessage", [
    encodeTypedDomain({ domain }),
    encodeTypedMessage({ types, message }),
    toAbiTypes({ domain, types }),
  ]);
}

export function encodeSignMessage({ message }: { message: string }) {
  return iface.encodeFunctionData("signMessage", [message]);
}
