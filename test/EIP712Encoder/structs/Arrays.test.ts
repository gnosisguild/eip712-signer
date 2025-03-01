import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { TypedDataEncoder } from "ethers";

import { encodeTypedData } from "../../../src/encodeTypedValue";
import { deployEIP712Encoder } from "../../EIP712Encoder.fixture";

const Address = "0x1111111111111111111111111111111111111111";

describe("EIP7127Encoder - Structs", () => {
  describe("Arrays", () => {
    it("should hash a struct with arrays of atomic types (fixed length)", async () => {
      const { encoder } = await loadFixture(deployEIP712Encoder);

      const domain = {
        chainId: 1,
      };

      const types = {
        PersonWithArrays: [
          { name: "name", type: "string" },
          { name: "scores", type: "uint256[3]" },
        ],
      };
      const message = {
        name: "Alice",
        scores: [85, 90, 95],
      };

      const [_domain, _types, _message] = encodeTypedData(
        domain,
        types,
        message,
        "PersonWithArrays",
      );

      expect(await encoder.hash(_domain, _types, _message)).to.equal(
        TypedDataEncoder.hash(domain, types, message),
      );
    });
    it.skip("should hash a struct with arrays of atomic types (fixed length)", async () => {
      const { encoder } = await loadFixture(deployEIP712Encoder);

      const domain = {
        name: "Array of Atomic Fixed Size",
        version: "1",
        chainId: 1,
        verifyingContract: Address,
      };

      const types = {
        PersonWithArrays: [
          { name: "name", type: "string" },
          { name: "scores", type: "uint256[3]" },
          { name: "friends", type: "address[2]" },
          { name: "preferences", type: "bool[4]" },
        ],
      };
      const message = {
        name: "Alice",
        scores: [85, 90, 95],
        friends: [
          "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        ],
        preferences: [true, false, true, false],
      };

      const [_domain, _types, _message] = encodeTypedData(
        domain,
        types,
        message,
        "PersonWithArrays",
      );

      expect(await encoder.hash(_domain, _types, _message)).to.equal(
        TypedDataEncoder.hash(domain, types, message),
      );
    });

    it.skip("should hash a struct with arrays of atomic types (dynamic length)", () => {
      // Test hashing a struct with dynamic-length arrays of atomic types.
    });

    it.skip("should hash a struct with arrays of structs (fixed length)", () => {
      // Test hashing a struct with fixed-length arrays of structs.
    });

    it.skip("should hash a struct with arrays of structs (dynamic length)", () => {
      // Test hashing a struct with dynamic-length arrays of structs.
    });

    it.skip("should handle large arrays", () => {
      // Test hashing structs with large arrays.
    });
  });
});
