import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { TypedDataEncoder } from "ethers";
import { getTypesForEIP712Domain } from "viem";

import { encodeTypedValue, encodeTypes } from "../src/encodeTypedValue";
import { deployEIP712Encoder } from "./EIP712Encoder.fixture";

describe("EIP712Encoder", () => {
  describe("hashDomain()", () => {
    it("hashes a simple domain", async () => {
      const { encoder } = await loadFixture(deployEIP712Encoder);

      const domain = {
        chainId: 1,
      };

      const types = encodeTypes({
        types: {
          EIP712Domain: getTypesForEIP712Domain({ domain }),
        },
        primaryType: "EIP712Domain",
      });

      const value = encodeTypedValue(
        {
          EIP712Domain: getTypesForEIP712Domain({ domain }),
        },
        domain,
        "EIP712Domain",
      );

      expect(await encoder.hashDomain(value, types)).to.equal(
        TypedDataEncoder.hashDomain(domain),
      );
    });

    it("hashes a full domain", async () => {
      const { encoder } = await loadFixture(deployEIP712Encoder);

      const domain = {
        name: "Ether Mail",
        version: "abc",
        chainId: 9,
        verifyingContract:
          "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC" as `0x${string}`,
      };

      const types = encodeTypes({
        types: {
          EIP712Domain: getTypesForEIP712Domain({ domain }),
        },
        primaryType: "EIP712Domain",
      });

      const value = encodeTypedValue(
        {
          EIP712Domain: getTypesForEIP712Domain({ domain }),
        },
        domain,
        "EIP712Domain",
      );

      expect(await encoder.hashDomain(value, types)).to.equal(
        TypedDataEncoder.hashDomain(domain),
      );
    });
  });

  describe("hashTypedData()", () => {
    it.skip("Basic Struct Hashing with Atomic Types");
    it.skip("Nested Structs (Multiple Levels Deep)");
    it.skip("Arrays of Atomic Types (Fixed Length)");
    it.skip("Arrays of Atomic Types (Dynamic Length)");
    it.skip("Arrays of Structs (Fixed Length)");
    it.skip("Arrays of Structs (Dynamic Length)");
    it.skip("Structs with Dynamic Types (string, bytes)");
    it.skip("Nested Dynamic Types (string inside struct inside array)");
    it.skip("Maximum Length Dynamic Types");
    it.skip("Empty Dynamic Types (empty string, empty bytes)");
    it.skip("Recursive Struct References");
    it.skip("Multiple Primary Types in Same Domain");
    it.skip("Edge Cases for Integer Values (min/max values)");
    it.skip("Boolean Values (true/false encoding)");
    it.skip("Address Type Encoding");
    it.skip("Different Length Byte Types (bytes1 through bytes32)");
    it.skip("Domain Separator Variations");
    it.skip("Chain ID Verification");
    it.skip("Custom Salt Usage");
    it.skip("Identical Structure Types Across Different Domains");
  });
});

// const domain = {
//   name: "MyDApp",
//   version: "1",
//   chainId: 1,
//   verifyingContract:
//     "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC" as `0x${string}`,
// };

// // Define the types
// const types = {
//   Person: [
//     { name: "name", type: "string" },
//     { name: "wallet", type: "address" },
//   ],
//   Mail: [
//     { name: "from", type: "Person" },
//     { name: "to", type: "Person" },
//     { name: "contents", type: "string" },
//   ],
// };

// // Define the message
// const message = {
//   from: {
//     name: "Alice",
//     wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
//   },
//   to: {
//     name: "Bob",
//     wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
//   },
//   contents: "Hello, Bob!",
// };
