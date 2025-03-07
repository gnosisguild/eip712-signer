import { EIP1193Provider } from "@gnosis-guild/zodiac-core";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import hre from "hardhat";
import { EthereumProvider } from "hardhat/types";

import { deployFallbackHandler } from "./fallbackHandler";
import { deploySafeMastercopy } from "./safeMastercopy";
import { deploySafeProxyFactory } from "./safeProxyFactory";
import { deployFactory } from "./singletonFactory";

export default async function deployMastercopies() {
  const [, , , , , , , deployer] = await hre.ethers.getSigners();

  await deployFactory(deployer);
  await deployFallbackHandler(deployer);
  await deploySafeMastercopy(deployer);
  await deploySafeProxyFactory(deployer);
}

export function createEIP1193(
  provider: EthereumProvider,
  signer: HardhatEthersSigner,
): EIP1193Provider {
  return {
    request: async ({ method, params }) => {
      if (method == "eth_sendTransaction") {
        const { hash } = await signer.sendTransaction((params as any[])[0]);
        return hash;
      }

      return provider.request({ method, params });
    },
  };
}
