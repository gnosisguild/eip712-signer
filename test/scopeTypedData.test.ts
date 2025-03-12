import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { AbiCoder, TypedDataEncoder, ZeroAddress } from "ethers";
import hre from "hardhat";
import {
  Condition,
  ExecutionOptions,
  Operator,
  ParameterType,
} from "zodiac-roles-sdk";

import { scopeTypedData } from "../src";
import { encodeSignTypedMessage } from "../src/encodeSignMessage";
import {
  encodeTypedDomain,
  encodeTypedMessage,
  toAbiParams,
} from "../src/typed-data";
import { typesForDomain } from "../src/typed-data/definition";
import deployMastercopies from "./setup/deploy-mastercopies";
import { iface as ifaceFallback } from "./setup/deploy-mastercopies/fallbackHandler";
import { deploySignTypedMessageLib } from "./setup/deploySignTypedMessageLib";
import {
  connectRolesSafeAndMember,
  deployRoles,
  execTransactionWithRole,
  scopeFunction,
  scopeTarget,
} from "./setup/roles";
import { deploySafe } from "./setup/safe";

const SomeAddress = "0x7e2a2fa2a064f693f0a55c5639476d913ff12d05";
const AddressOne = "0x0000000000000000000000000000000000000001";

const EIP712_MAGIC_VALUE = "0x20c13b0b";

describe("scopeTypedData()", () => {
  async function setup() {
    await deployMastercopies();

    const lib = await deploySignTypedMessageLib();
    const ifaceLib = lib.interface;

    const [owner, member, relayer] = await hre.ethers.getSigners();

    const safe = await deploySafe(
      {
        owners: [await owner.getAddress()],
        threshold: 1,
        creationNonce: 123,
      },
      relayer,
    );

    const roles = await deployRoles(
      { avatar: safe, target: safe, owner: await owner.getAddress() },
      relayer,
    );

    const { roleKey } = await connectRolesSafeAndMember({
      owner,
      safe,
      roles,
      member: await member.getAddress(),
    });

    await scopeTarget({
      owner,
      roles,
      roleKey,
      target: await lib.getAddress(),
    });

    const domain = {
      name: "Array Test",
      version: "1",
      chainId: 1,
      verifyingContract:
        "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC" as `0x${string}`,
    };

    // Define the types for the EIP-712 structured data
    const types = {
      Person: [
        { name: "name", type: "string" },
        { name: "wallet", type: "address" },
        { name: "attachments", type: "Attachment[]" },
      ],
      Attachment: [{ name: "filename", type: "string" }],
      EIP712Domain: typesForDomain(domain),
    };

    // The actual data to be signed
    const message = {
      name: "Vitalik",
      wallet: SomeAddress,
      attachments: [
        {
          filename: "document.pdf",
        },
        {
          filename: "image.jpg",
        },
      ],
    };

    const conditionDomain: Condition = {
      paramType: ParameterType.AbiEncoded,
      operator: Operator.Matches,
      children: [
        {
          paramType: ParameterType.Tuple,
          operator: Operator.Matches,
          children: [
            {
              paramType: ParameterType.Dynamic,
              operator: Operator.Pass,
              compValue: "0x",
            },
            {
              paramType: ParameterType.Dynamic,
              operator: Operator.Pass,
              compValue: "0x",
            },
            {
              paramType: ParameterType.Static,
              operator: Operator.EqualTo,
              compValue: AbiCoder.defaultAbiCoder().encode(
                ["uint256"],
                [1],
              ) as any,
            },
            {
              paramType: ParameterType.Static,
              operator: Operator.EqualTo,
              compValue: AbiCoder.defaultAbiCoder().encode(
                ["address"],
                ["0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"],
              ) as any,
            },
          ],
        },
      ],
    };

    const conditionMessage: Condition = {
      paramType: ParameterType.AbiEncoded,
      operator: Operator.Matches,
      children: [
        {
          paramType: ParameterType.Tuple,
          operator: Operator.Matches,
          children: [
            {
              paramType: ParameterType.Dynamic,
              operator: Operator.EqualTo,
              compValue: AbiCoder.defaultAbiCoder().encode(
                ["string"],
                ["Vitalik"],
              ) as any,
            },
            {
              paramType: ParameterType.Static,
              operator: Operator.EqualTo,
              compValue: AbiCoder.defaultAbiCoder().encode(
                ["address"],
                [SomeAddress],
              ) as any,
            },
            {
              paramType: ParameterType.Array,
              operator: Operator.Pass,
              compValue: "0x",
              children: [
                {
                  paramType: ParameterType.Tuple,
                  operator: Operator.Pass,
                  compValue: "0x",
                  children: [
                    {
                      paramType: ParameterType.Dynamic,
                      operator: Operator.Pass,
                      compValue: "0x",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const condition = scopeTypedData({
      domain: conditionDomain,
      message: conditionMessage,
      types,
    });

    await scopeFunction({
      owner,
      roles,
      roleKey,
      target: await lib.getAddress(),
      selector: ifaceLib.getFunction("signTypedMessage").selector,
      condition,
      executionOptions: ExecutionOptions.Both,
    });

    return {
      relayer,
      safe,
      lib: await lib.getAddress(),
      ifaceLib,

      execTransactionFromRoles: ({
        to,
        data,
        operation,
      }: {
        to: string;
        data: string;
        operation: number;
      }) =>
        execTransactionWithRole({
          roles,
          roleKey,
          to,
          data,
          operation,
          signer: member,
        }),
      domain,
      message,
      types,
    };
  }

  it("correctly restricts some elements in domain", async () => {
    const { lib, message, domain, types, execTransactionFromRoles } =
      await loadFixture(setup);

    await expect(
      execTransactionFromRoles({
        to: lib,
        data: encodeSignTypedMessage({
          domain: { ...domain, chainId: 2 },
          types,
          message,
        }),
        operation: 1,
      }),
    ).to.be.reverted;

    await expect(
      execTransactionFromRoles({
        to: lib,
        data: encodeSignTypedMessage({
          domain: {
            ...domain,
            verifyingContract: ZeroAddress as `0x${string}`,
          },
          types,
          message,
        }),
        operation: 1,
      }),
    ).to.be.reverted;

    await expect(
      execTransactionFromRoles({
        to: lib,
        data: encodeSignTypedMessage({ domain, types, message }),
        operation: 1,
      }),
    ).to.not.be.reverted;

    // any name for the app
    await expect(
      execTransactionFromRoles({
        to: lib,
        data: encodeSignTypedMessage({ domain, types, message }),
        operation: 1,
      }),
    ).to.not.be.reverted;

    // any version for the app
    await expect(
      execTransactionFromRoles({
        to: lib,
        data: encodeSignTypedMessage({
          domain: {
            ...domain,
            version: "v3.4.5",
          },
          types,
          message,
        }),
        operation: 1,
      }),
    ).to.not.be.reverted;

    await expect(
      execTransactionFromRoles({
        to: lib,
        data: encodeSignTypedMessage({
          domain: {
            ...domain,
            name: "Our latest super release",
          },
          types,
          message,
        }),
        operation: 1,
      }),
    ).to.not.be.reverted;
  });

  it("correctly restricts some elements in message", async () => {
    const { lib, message, domain, types, execTransactionFromRoles } =
      await loadFixture(setup);

    await expect(
      execTransactionFromRoles({
        to: lib,
        data: encodeSignTypedMessage({
          domain,
          types,
          message: { ...message, name: "Alice" },
        }),
        operation: 1,
      }),
    ).to.be.reverted;

    await expect(
      execTransactionFromRoles({
        to: lib,
        data: encodeSignTypedMessage({
          domain,
          types,
          message: { ...message, wallet: AddressOne },
        }),
        operation: 1,
      }),
    ).to.be.reverted;

    await expect(
      execTransactionFromRoles({
        to: lib,
        data: encodeSignTypedMessage({
          domain,
          types,
          message: { ...message, attachments: [{ filename: "logs.csv" }] },
        }),
        operation: 1,
      }),
    ).to.not.be.reverted;

    // any name for the app
    await expect(
      execTransactionFromRoles({
        to: lib,
        data: encodeSignTypedMessage({ domain, types, message }),
        operation: 1,
      }),
    ).to.not.be.reverted;
  });

  it("correctly enforces exact type layout", async () => {
    const { lib, ifaceLib, message, domain, types, execTransactionFromRoles } =
      await loadFixture(setup);

    function encodeSignTypedMessageButTamperTypes() {
      return ifaceLib.encodeFunctionData("signTypedMessage", [
        encodeTypedDomain({ domain }),
        encodeTypedMessage({ types, message }),
        toAbiParams({
          domain,
          types: {
            ...types,
            Person: [...types.Person, { name: "meta", type: "bytes" }],
          },
        }),
      ]);
    }

    await expect(
      execTransactionFromRoles({
        to: lib,
        data: encodeSignTypedMessageButTamperTypes(),
        operation: 1,
      }),
    ).to.be.reverted;

    // any name for the app
    await expect(
      execTransactionFromRoles({
        to: lib,
        data: encodeSignTypedMessage({ domain, types, message }),
        operation: 1,
      }),
    ).to.not.be.reverted;
  });

  it("signs a message from a safe, through a roles mod", async () => {
    const {
      relayer,
      lib,
      safe,
      message,
      domain,
      types,
      execTransactionFromRoles,
    } = await loadFixture(setup);

    const { EIP712Domain, ...rest } = types;

    await expect(
      relayer.call({
        to: safe,
        data: ifaceFallback.encodeFunctionData(
          "isValidSignature(bytes,bytes)",
          [TypedDataEncoder.hash(domain, rest, message), "0x"],
        ),
      }),
    ).to.be.revertedWith("Hash not approved");

    await execTransactionFromRoles({
      to: lib,
      data: encodeSignTypedMessage({ domain, types, message }),
      operation: 1,
    });

    const resultData = await relayer.call({
      to: safe,
      data: ifaceFallback.encodeFunctionData("isValidSignature(bytes,bytes)", [
        TypedDataEncoder.hash(domain, rest, message),
        "0x",
      ]),
    });

    const result = ifaceFallback.decodeFunctionResult(
      "isValidSignature(bytes,bytes)",
      resultData,
    );

    expect(result).to.deep.equal([EIP712_MAGIC_VALUE]);
  });
});
