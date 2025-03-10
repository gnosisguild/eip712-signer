import { TypedDataDomain } from "abitype";

import { packTypedMessage } from "./packTypedMessage";
import { typesForDomain } from "./types";

export function packTypedDomain({ domain }: { domain: TypedDataDomain }) {
  return packTypedMessage({
    types: { EIP712Domain: typesForDomain(domain) },
    message: domain,
  });
}
