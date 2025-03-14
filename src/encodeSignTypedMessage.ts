import { TypedData, TypedDataDomain } from "abitype";
import { Interface, keccak256 } from "ethers";

import Artifact from "../artifacts/contracts/SignTypedMessageLib.sol/SignTypedMessageLib.json";
import {
  encodeAbiTypes,
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
  /*
   * We want to hit the correct roles rule, and so we hash the types, and use
   * 4 leading bytes to determine the selector entrypoint within SignTypedMessageLib
   */
  const selector = keccak256(encodeAbiTypes({ domain, types })).slice(0, 10);

  const data = iface.encodeFunctionData("signTypedMessage", [
    encodeTypedDomain({ domain }),
    encodeTypedMessage({ types, message }),
    toAbiTypes({ domain, types }),
  ]);

  return `${selector}${data.slice(10)}`;
}

export function encodeSignMessage({ message }: { message: string }) {
  return iface.encodeFunctionData("signMessage", [message]);
}
