import { expect } from "chai";
import { SignTypedDataParameters } from "viem";

import { encodeType } from "../src/utils";

describe("encodeType", () => {
  it("correctly encodes simple struct types", () => {
    expect(encodeType({ types: sampleMessage.types, primaryType: "Person" })).to.equal(
      "Person(string name,address wallet)",
    );
  });

  it("correctly encodes nested struct types", () => {
    expect(encodeType({ types: sampleMessage.types, primaryType: "Mail" })).to.equal(
      "Mail(Person from,Person[] to,string contents)Person(string name,address wallet)",
    );
  });
});

const sampleMessage = {
  domain: {
    name: "Ether Mail",
    version: "1",
    chainId: 1,
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
  },
  types: {
    Person: [
      { name: "name", type: "string" },
      { name: "wallet", type: "address" },
    ],
    Mail: [
      { name: "from", type: "Person" },
      { name: "to", type: "Person[]" },
      { name: "contents", type: "string" },
    ],
  },
  primaryType: "Mail",
  message: {
    from: {
      name: "Cow",
      wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
    },
    to: [
      {
        name: "Bob",
        wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
      },
    ],
    contents: "Hello, Bob!",
  },
} as const satisfies Omit<SignTypedDataParameters, "account">;
