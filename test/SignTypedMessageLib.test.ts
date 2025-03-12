import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import {
  AbiCoder,
  Signer,
  TypedDataEncoder,
  ZeroAddress,
  ZeroHash,
  concat,
  randomBytes,
} from "ethers";
import hre from "hardhat";

import {
  encodeSignMessage,
  encodeSignTypedMessage,
} from "../src/encodeSignMessage";
import deployMastercopies from "./setup/deploy-mastercopies";
import { iface as ifaceFallback } from "./setup/deploy-mastercopies/fallbackHandler";
import { iface as ifaceSafe } from "./setup/deploy-mastercopies/safeMastercopy";
import { deploySignTypedMessageLib } from "./setup/deploySignTypedMessageLib";
import { deploySafe } from "./setup/safe";

const EIP712_MAGIC_VALUE = "0x1626ba7e";
const EIP712_MAGIC_VALUE_OLD = "0x20c13b0b";

describe("SignTypedMessageLib", () => {
  async function setup() {
    await deployMastercopies();
    const lib = await deploySignTypedMessageLib();
    const [owner, relayer] = await hre.ethers.getSigners();

    const safe = await deploySafe(
      {
        owners: [await owner.getAddress()],
        threshold: 1,
        creationNonce: BigInt(randomHash()),
      },
      owner,
    );

    return { owner, relayer, safe, lib: await lib.getAddress() };
  }
  it("signMessage()", async () => {
    const { owner, relayer, safe, lib } = await loadFixture(setup);

    const message = "0xbadfed";

    await owner.sendTransaction(
      await _encodeSignMessage({ owner, safe, lib, message }),
    );

    const resultData = await relayer.call({
      to: safe,
      data: ifaceFallback.encodeFunctionData("isValidSignature(bytes,bytes)", [
        message,
        "0x",
      ]),
    });

    const result = ifaceFallback.decodeFunctionResult(
      "isValidSignature(bytes,bytes)",
      resultData,
    );

    // console.log(result);

    expect(result).to.deep.equal([EIP712_MAGIC_VALUE_OLD]);
  });
  it("signTypedMessage()", async () => {
    const { owner, relayer, safe, lib } = await loadFixture(setup);

    const domain = {
      version: "1",
      chainId: 1, // Mainnet
    };

    const types = {
      Message: [
        { name: "amount", type: "uint256" },
        { name: "message", type: "string" },
      ],
    };

    const message = {
      amount: 100,
      message: "Hello World",
    };

    await owner.sendTransaction(
      await _encodeSignTypedMessage({
        owner,
        safe,
        lib,
        domain,
        message,
        types,
      }),
    );

    const resultData = await relayer.call({
      to: safe,
      data: ifaceFallback.encodeFunctionData("isValidSignature(bytes,bytes)", [
        TypedDataEncoder.hash(domain, types, message),
        "0x",
      ]),
    });

    const result = ifaceFallback.decodeFunctionResult(
      "isValidSignature(bytes,bytes)",
      resultData,
    );

    expect(result).to.deep.equal([EIP712_MAGIC_VALUE_OLD]);
  });

  it("signTypedMessage() via fallback", async () => {
    const { owner, relayer, safe, lib } = await loadFixture(setup);

    const domain = {
      version: "1",
      chainId: 1, // Mainnet
    };

    const types = {
      Message: [
        { name: "amount", type: "uint256" },
        { name: "message", type: "string" },
      ],
    };

    const message = {
      amount: 100,
      message: "Hello World",
    };

    const tx = await _encodeSignTypedMessageFallback({
      owner,
      safe,
      lib,
      domain,
      message,
      types,
    });

    await owner.sendTransaction(tx);

    const resultData = await relayer.call({
      to: safe,
      data: ifaceFallback.encodeFunctionData("isValidSignature(bytes,bytes)", [
        TypedDataEncoder.hash(domain, types, message),
        "0x",
      ]),
    });

    const result = ifaceFallback.decodeFunctionResult(
      "isValidSignature(bytes,bytes)",
      resultData,
    );

    expect(result).to.deep.equal([EIP712_MAGIC_VALUE_OLD]);
  });
});

async function _encodeSignMessage({
  owner,
  safe,
  lib,
  message,
}: {
  owner: Signer;
  safe: string;
  lib: string;
  message: string;
}) {
  const data = ifaceSafe.encodeFunctionData("execTransaction", [
    lib,
    0,
    encodeSignMessage({ message }),
    1, //Delegatecall,
    0n,
    0n,
    0n,
    ZeroAddress,
    ZeroAddress,
    createPreApprovedSignature(await owner.getAddress()),
  ]);

  return {
    to: safe,
    data,
    value: 0n,
  };
}

async function _encodeSignTypedMessage({
  owner,
  safe,
  lib,
  domain,
  message,
  types,
}: {
  owner: Signer;
  safe: string;
  lib: string;
  domain: any;
  message: any;
  types: any;
}) {
  const data = ifaceSafe.encodeFunctionData("execTransaction", [
    lib,
    0,
    encodeSignTypedMessage({ domain, message, types }),
    1, //Delegatecall,
    0n,
    0n,
    0n,
    ZeroAddress,
    ZeroAddress,
    createPreApprovedSignature(await owner.getAddress()),
  ]);

  return {
    to: safe,
    data,
    value: 0n,
  };
}

async function _encodeSignTypedMessageFallback({
  owner,
  safe,
  lib,
  domain,
  message,
  types,
}: {
  owner: Signer;
  safe: string;
  lib: string;
  domain: any;
  message: any;
  types: any;
}) {
  const data = ifaceSafe.encodeFunctionData("execTransaction", [
    lib,
    0,
    `0x11223344${encodeSignTypedMessage({ domain, message, types }).slice(10)}`,
    1, //Delegatecall,
    0n,
    0n,
    0n,
    ZeroAddress,
    ZeroAddress,
    createPreApprovedSignature(await owner.getAddress()),
  ]);

  return {
    to: safe,
    data,
    value: 0n,
  };
}

const createPreApprovedSignature = (approver: string) => {
  return concat([
    AbiCoder.defaultAbiCoder().encode(["address"], [approver]),
    ZeroHash,
    "0x01",
  ]);
};

function randomHash(): string {
  return (
    "0x" +
    Array.from(randomBytes(32))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}
