import { TypedDataDomain } from "abitype";

import { typesForDomain } from "./definition";
import { packTypedMessage } from "./packTypedMessage";

export function packTypedDomain({ domain }: { domain: TypedDataDomain }) {
  return packTypedMessage({
    types: { EIP712Domain: typesForDomain(domain) },
    message: domain,
  });
}
