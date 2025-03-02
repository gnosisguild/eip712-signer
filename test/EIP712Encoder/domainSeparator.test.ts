import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { TypedDataEncoder, keccak256, toUtf8Bytes } from "ethers";
import { getTypesForEIP712Domain } from "viem";

import { encodeTypedValue, encodeTypes } from "../../src/encodeTypedValue";
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

      const _types = encodeTypes({
        types: {
          EIP712Domain: getTypesForEIP712Domain({ domain }),
        },
        primaryType: "EIP712Domain",
      });

      const _domain = encodeTypedValue(
        {
          EIP712Domain: getTypesForEIP712Domain({ domain }),
        },
        domain,
        "EIP712Domain",
      );

      expect(await encoder.hashDomain(_domain, _types)).to.equal(
        TypedDataEncoder.hashDomain(domain),
      );
    });

    it.skip("should handle domain separator variations (missing fields, custom fields)", () => {
      // Test different variations of the EIP-712 domain separator.
    });

    it("should verify the chainId field in the domain separator", async () => {
      const { encoder } = await loadFixture(deployEIP712Encoder);

      const domain = {
        chainId: 1,
      };

      const _types = encodeTypes({
        types: {
          EIP712Domain: getTypesForEIP712Domain({ domain }),
        },
        primaryType: "EIP712Domain",
      });

      const _domain = encodeTypedValue(
        {
          EIP712Domain: getTypesForEIP712Domain({ domain }),
        },
        domain,
        "EIP712Domain",
      );

      expect(await encoder.hashDomain(_domain, _types)).to.equal(
        TypedDataEncoder.hashDomain(domain),
      );
    });

    it.skip("should handle custom salt usage in the domain separator", () => {
      // Test that the encoder correctly handles a custom salt field.
    });

    it.skip("should reject invalid domain separators", () => {
      // Test that the encoder rejects invalid domain separators.
    });
  });
});
