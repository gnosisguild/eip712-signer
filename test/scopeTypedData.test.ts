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

describe.skip("scopeTypedData()", () => {
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
    const { owner, member, relayer, safe, roles, roleKey, lib, ifaceLib } =
      await loadFixture(setup);

    console.log(roles);

    const domain = { chainId: 7 };
    const types = {
      Person: [{ name: "name", type: "bytes" }],
      EIP712Domain: typesForDomain(domain),
    };
    const message = { name: "0xbadfed" };

    console.log(encodeSignTypedMessage({ domain, types, message }));

    // const _domain: Condition = {
    //   paramType: ParameterType.Tuple,
    //   operator: Operator.Matches,
    //   children: [
    //     {
    //       paramType: ParameterType.Static,
    //       operator: Operator.EqualTo,
    //       compValue: AbiCoder.defaultAbiCoder().encode(
    //         ["uint256"],
    //         [1],
    //       ) as `0x${string}`,
    //     },
    //   ],
    // };

    const _domain: Condition = {
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
                [7],
              ) as any,
            },
          ],
        },
      ],
    };

    const _message: Condition = {
      paramType: ParameterType.AbiEncoded,
      operator: Operator.Matches,
      children: [
        {
          paramType: ParameterType.Dynamic,
          operator: Operator.EqualTo,
          compValue: AbiCoder.defaultAbiCoder().encode(
            ["bytes"],
            ["0xbadfed"],
          ) as `0x${string}`,
        },
      ],
    };

    // 0x16aa6209
    // 0000000000000000000000000000000000000000000000000000000000000060
    // 00000000000000000000000000000000000000000000000000000000000000a0
    // 0000000000000000000000000000000000000000000000000000000000000140
    // 0000000000000000000000000000000000000000000000000000000000000020
    // 0000000000000000000000000000000000000000000000000000000000000007
    // 0000000000000000000000000000000000000000000000000000000000000080
    // 0000000000000000000000000000000000000000000000000000000000000020
    // 0000000000000000000000000000000000000000000000000000000000000020
    // 0000000000000000000000000000000000000000000000000000000000000003
    // badfed0000000000000000000000000000000000000000000000000000000000

    const condition = scopeTypedData({
      domain: _domain,
      types,
      message: _message,
    });

    await scopeFunction({
      owner,
      roles,
      roleKey,
      target: lib,
      selector: ifaceLib.getFunction("signTypedMessage").selector,
      condition,
      executionOptions: ExecutionOptions.Both,
    });

    await execTransactionWithRole({
      signer: member,
      roles,
      roleKey,
      to: lib,
      data: encodeSignTypedMessage({ domain, types, message }),
      operation: 1,
    });
  });
});
