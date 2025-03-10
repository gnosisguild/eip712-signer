import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  AbiCoder,
  Contract,
  Signer,
  ZeroAddress,
  ZeroHash,
  concat,
} from "ethers";
import hre from "hardhat";

import { encodeSignTypedMessage } from "../src/encodeSignTypedMessage";
import { SignTypedMessageLib } from "../types";
import deployMastercopies from "./setup/deploy-mastercopies";
import { deploySignTypedMessageLib } from "./setup/deploySignTypedMessageLib";
import {
  connectRolesSafeAndMember,
  deployRoles,
  scopeTarget,
} from "./setup/roles";
import { deploySafe } from "./setup/safe";

const EIP712_MAGIC_VALUE = "0x1626ba7e";
const EIP712_MAGIC_VALUE_OLD = "0x20c13b0b";

describe.skip("scopeTypedData()", () => {
  async function setup() {
    await deployMastercopies();

    const lib = await (await deploySignTypedMessageLib()).getAddress();

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
      { avatar: safe, owner: await owner.getAddress() },
      relayer,
    );

    const { roleKey } = await connectRolesSafeAndMember({
      owner,
      safe,
      roles,
      member: await member.getAddress(),
    });

    await scopeTarget({ owner, roles, roleKey, target: lib });
    // owner.sendTransaction({
    //   to: roles,
    //   data: scopeTypedData
    // })
    return {
      owner,
      member,
      relayer,
      safe,
      roleKey,
      lib,
    };
  }
  it("try me", async () => {
    const { owner, member, relayer, safe, roleKey, lib } =
      await loadFixture(setup);
  });
});

// const createPreApprovedSignature = (approver: string) => {
//   return concat([
//     AbiCoder.defaultAbiCoder().encode(["address"], [approver]),
//     ZeroHash,
//     "0x01",
//   ]);
// };
