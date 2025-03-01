import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { TypedDataEncoder } from "ethers";

import { encodeTypedData } from "../../src/encodeTypedValue";
import { deployEIP712Encoder } from "../EIP712Encoder.fixture";

describe("EIP7127Encoder", () => {
  describe("hashTypedData()", () => {
    it("should hash typed data with a valid struct and domain separator", async () => {
      const { encoder } = await loadFixture(deployEIP712Encoder);

      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "age", type: "uint256" },
        ],
      };

      const domain = {
        name: "Test Domain",
        version: "1",
        chainId: 1,
        verifyingContract: "0x0000000000000000000000000000000000000001",
      };

      const message = {
        name: "Alice",
        age: 30,
      };

      const [_domain, _types, _message] = encodeTypedData(
        domain,
        types,
        message,
        "Person",
      );

      expect(await encoder.hash(_domain, _types, _message)).to.equal(
        TypedDataEncoder.hash(domain, types, message),
      );
    });

    it.skip("should handle mixed static and dynamic types", () => {
      // Test hashing a struct that contains a mix of static and dynamic types.
    });
  });
});
