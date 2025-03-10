import { TypedDataDomain } from "abitype";
import { TypedDataField } from "ethers";

export function typesForDomain(domain: TypedDataDomain): TypedDataField[] {
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
