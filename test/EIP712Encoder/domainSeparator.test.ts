import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { TypedDataEncoder, keccak256, toUtf8Bytes } from "ethers";

import { encodeTypedDomain } from "../../src/typed-data";
import { deployEIP712Encoder } from "../EIP712Encoder.fixture";

describe("EIP7127Encoder", () => {
  describe("hashDomainSeparator()", () => {
    it("should hash the domain separator with all required fields", async () => {
      const { encoder } = await loadFixture(deployEIP712Encoder);

      const domain = {
        name: "Ether Mail",
        version: "abc",
        chainId: 9,
        verifyingContract:
          "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC" as `0x${string}`,
        salt: keccak256(toUtf8Bytes("Hello World")) as `0x${string}`,
      };

      const _domain = encodeTypedDomain({ domain });

      expect(await encoder.hashDomain(_domain)).to.equal(
        TypedDataEncoder.hashDomain(domain),
      );
    });

    it("should handle custom salt usage in the domain separator", async () => {
      const { encoder } = await loadFixture(deployEIP712Encoder);

      const domain = {
        chainId: 35377,
        verifyingContract:
          "0x00000000000000000000000000000000000fffff" as `0x${string}`,
        salt: keccak256(toUtf8Bytes("Here is a custom salt")) as `0x${string}`,
      };

      const _domain = encodeTypedDomain({ domain });

      expect(await encoder.hashDomain(_domain)).to.equal(
        TypedDataEncoder.hashDomain(domain),
      );
    });
  });
});
