import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { AbiCoder } from "ethers";
import hre from "hardhat";
import {
  Condition,
  ExecutionOptions,
  Operator,
  ParameterType,
} from "zodiac-roles-sdk";

import { scopeTypedData } from "../src";
import { encodeSignTypedMessage } from "../src/encodeSignMessage";
import { typesForDomain } from "../src/typed-data/definition";
import deployMastercopies from "./setup/deploy-mastercopies";
import { deploySignTypedMessageLib } from "./setup/deploySignTypedMessageLib";
import {
  connectRolesSafeAndMember,
  deployRoles,
  execTransactionWithRole,
  scopeFunction,
  scopeTarget,
} from "./setup/roles";
import { deploySafe } from "./setup/safe";

describe.only("scopeTypedData()", () => {
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

    const domain = { chainId: 7 };
    const types = {
      Person: [{ name: "name", type: "bytes" }],
      EIP712Domain: typesForDomain(domain),
    };
    const message = { name: "0xbadfed" };

    const conditionDomain: Condition = {
      paramType: ParameterType.AbiEncoded,
      operator: Operator.Matches,
      children: [
        {
          paramType: ParameterType.Tuple,
          operator: Operator.Matches,
          children: [
            {
              paramType: ParameterType.Static,
              operator: Operator.EqualTo,
              compValue: AbiCoder.defaultAbiCoder().encode(
                ["uint256"],
                [domain.chainId],
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
                ["bytes"],
                [message.name],
              ) as any,
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
      owner,
      member,
      relayer,
      safe,
      roles,
      roleKey,
      lib: await lib.getAddress(),
      ifaceLib,
    };
  }
  it("try me", async () => {
    const { member, safe, roles, roleKey, lib } = await loadFixture(setup);

    const domain = { chainId: 7 };
    const types = {
      Person: [{ name: "name", type: "bytes" }],
      EIP712Domain: typesForDomain(domain),
    };
    const message = { name: "0xbadfed" };

    await execTransactionWithRole({
      signer: member,
      roles,
      roleKey,
      to: lib,
      data: encodeSignTypedMessage({ domain, types, message }),
      operation: 1,
    });
  });

  it("correctly restricts some elements in domain");

  it("correctly restricts some elements in message");

  it("correctly enforces exact type layout");

  it("signs a message from a safe, through a roles mod");
});
