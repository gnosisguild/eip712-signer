import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";
import type { NetworkUserConfig } from "hardhat/types";

import "./tasks/accounts";
import "./tasks/deploy";

dotenv.config();
const { INFURA_KEY, ETHERSCAN_API_KEY, ARBISCAN_API_KEY, MNEMONIC } = process.env;

const chainIds = {
  hardhat: 31337,
  mainnet: 1,
  gnosis: 100,
  arbitrum: 42161,
  sepolia: 11155111,
};

function getChainConfig(chain: keyof typeof chainIds): NetworkUserConfig {
  let jsonRpcUrl: string;
  switch (chain) {
    case "arbitrum":
      jsonRpcUrl = "https://rpc.ankr.com/arbitrum";
      break;
    case "gnosis":
      jsonRpcUrl = "https://rpc.gnosischain.com";
      break;
    default:
      jsonRpcUrl = "https://" + chain + ".infura.io/v3/" + INFURA_KEY;
  }
  return {
    accounts: MNEMONIC ? { mnemonic: MNEMONIC } : [],
    chainId: chainIds[chain],
    url: jsonRpcUrl,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY!,
      sepolia: ETHERSCAN_API_KEY!,
      arbitrumOne: ARBISCAN_API_KEY!,
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
    src: "./contracts",
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
      },
      chainId: chainIds.hardhat,
    },
    arbitrum: getChainConfig("arbitrum"),
    mainnet: getChainConfig("mainnet"),
    sepolia: getChainConfig("sepolia"),
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.21",
    settings: {
      evmVersion: "shanghai",
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
