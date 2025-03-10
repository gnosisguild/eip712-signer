import { EIP1193Provider, deployProxy } from "@gnosis-guild/zodiac-core";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Interface, randomBytes } from "ethers";
import hre from "hardhat";

import { enableModuleInSafe } from "./safe";

export async function deployRoles(
  {
    avatar,
    target,
    owner,
  }: {
    avatar: string;
    target?: string;
    owner: string;
  },
  relayer: HardhatEthersSigner,
) {
  const { address } = await deployProxy({
    mastercopy: "0x650E78850858001311ffE150Dd280caEf3455F36",
    setupArgs: {
      types: ["address", "address", "address"],
      values: [owner, avatar, target || avatar],
    },
    saltNonce: BigInt(1234567),
    provider: createEIP1193(relayer),
  });

  return address;
}

export async function connectRolesSafeAndMember({
  owner,
  safe,
  roles,
  member,
}: {
  owner: HardhatEthersSigner;
  safe: string;
  roles: string;
  member: string;
}) {
  const roleKey = randomHash();
  await enableModuleInSafe({ safe, module: roles }, owner);

  await owner.sendTransaction({
    to: roles,
    data: iface.encodeFunctionData("enableModule", [member]),
  });

  await owner.sendTransaction({
    to: roles,
    data: iface.encodeFunctionData("assignRoles", [member, [roleKey], [true]]),
  });

  return { roleKey };
}

export async function scopeTarget({
  owner,
  roles,
  roleKey,
  target,
}: {
  owner: HardhatEthersSigner;
  roles: string;
  roleKey: string;
  target: string;
}) {
  await owner.sendTransaction({
    to: roles,
    data: iface.encodeFunctionData("scopeTarget", [roleKey, target]),
  });
}

export const iface = Interface.from([
  "function allowTarget(bytes32 roleKey, address targetAddress, uint8 options)",
  "function assignRoles(address module, bytes32[] roleKeys, bool[] memberOf)",
  "function enableModule(address module)",
  "function execTransactionWithRole(address to, uint256 value, bytes data, uint8 operation, bytes32 roleKey, bool shouldRevert) returns (bool success)",
  "function scopeTarget(bytes32 roleKey, address targetAddress)",
]);

function randomHash(): string {
  const uint8ArrayToHex = (bytes: Uint8Array): string => {
    return (
      "0x" +
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  };

  return uint8ArrayToHex(randomBytes(32));
}

function createEIP1193(signer: HardhatEthersSigner): EIP1193Provider {
  return {
    request: async ({ method, params }) => {
      if (method == "eth_sendTransaction") {
        const { hash } = await signer.sendTransaction((params as any[])[0]);
        return hash;
      }

      return hre.network.provider.request({ method, params });
    },
  };
}
