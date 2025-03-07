import { TypedDataDomain } from "abitype";
import { Interface, TypedDataField } from "ethers";

import Artifact from "../artifacts/contracts/SignTypedMessageLib.sol/SignTypedMessageLib.json";
import { encodeTypedData } from "./typed-data";

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
  const {
    domain: _domain,
    message: _message,
    types: _types,
  } = encodeTypedData({ domain, types, message });

  return iface.encodeFunctionData("signTypedMessage", [
    _domain,
    _message,
    _types,
  ]);
}
