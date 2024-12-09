import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { encodeBytes32String } from "ethers";
import { ethers } from "hardhat";
import { SignTypedDataParameters } from "viem";
import { Permission, PermissionSet, setUpRoles } from "zodiac-roles-sdk";
import { Roles } from "zodiac-roles-sdk/typechain";

import { EIP_712_SIGNER_ADDRESS, encodeTypedData } from "../src";
import { allowEip712Signature } from "../src/allowEip712Signature";
import { SIGN_FUNCTION_SELECTOR } from "../src/const";
import { TypedValue } from "../src/types";
import { Eip712Signer__factory } from "../types";
import { deployRolesFixture } from "./Roles.fixture";

const applyPermissions = async (permissions: readonly (Permission | PermissionSet)[]) => {
  const rolesMod = await loadFixture(deployRolesFixture);

  const signer = await ethers.provider.getSigner();
  const calls = setUpRoles({
    address: (await rolesMod.getAddress()) as `0x${string}`,
    roles: [
      {
        key: encodeBytes32String("SIGNER"),
        members: [(await signer.getAddress()) as `0x${string}`],
        permissions,
      },
    ],
  });

  for (const call of calls) {
    await signer.sendTransaction(call);
  }

  return rolesMod;
};

const signThroughRole = async (rolesMod: Roles, { domain, message }: { domain: TypedValue; message: TypedValue }) => {
  const signCallData = Eip712Signer__factory.createInterface().encodeFunctionData("signTypedMessage", [
    domain,
    message,
  ]);

  const roleMember = await ethers.provider.getSigner();
  return await rolesMod
    .connect(roleMember)
    .execTransactionWithRole(EIP_712_SIGNER_ADDRESS, 0, signCallData, 1, encodeBytes32String("SIGNER"), true);
};

describe("allowEip712Signature", () => {
  it("generates permissions to allow delegatecalls to the Eip712Signer contract", async () => {
    const permission = allowEip712Signature({
      domain: {
        name: "Ether Mail",
      },
      types: sampleMessage.types,
      primaryType: sampleMessage.primaryType,
    });

    expect(permission.targetAddress).to.equal(EIP_712_SIGNER_ADDRESS);
    expect(permission.selector).to.equal(SIGN_FUNCTION_SELECTOR);
    expect(permission.delegatecall).to.equal(true);
  });

  it("scopes the domain", async () => {
    const rolesMod = await applyPermissions([
      allowEip712Signature({
        domain: {
          name: "Ether Mail",
        },
        types: sampleMessage.types,
        primaryType: sampleMessage.primaryType,
      }),
    ]);

    const txResponse = await signThroughRole(rolesMod, encodeTypedData(sampleMessage));
    console.log(txResponse);
  });

  it("throws if the condition cannot be mapped", async () => {});
});

const sampleMessage = {
  domain: {
    name: "Ether Mail",
    version: "1",
    chainId: 1,
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
  },
  types: {
    Person: [
      { name: "name", type: "string" },
      { name: "wallet", type: "address" },
    ],
    Mail: [
      { name: "from", type: "Person" },
      { name: "to", type: "Person[]" },
      { name: "contents", type: "string" },
    ],
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
  },
  primaryType: "Mail",
  message: {
    from: {
      name: "Cow",
      wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
    },
    to: [
      {
        name: "Bob",
        wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
      },
    ],
    contents: "Hello, Bob!",
  },
} as const satisfies Omit<SignTypedDataParameters, "account">;
