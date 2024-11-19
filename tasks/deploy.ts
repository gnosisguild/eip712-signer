import ethProvider from "eth-provider";
import { BrowserProvider, concat } from "ethers";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

import { deployViaFactory } from "./EIP2470";

const frame = ethProvider("frame");

const DEFAULT_SIGN_MESSAGE_LIB = "0xd53cd0aB83D845Ac265BE939c57F53AD838012c9";

task("task:deploy", "Deploys Eip712Signer Contract")
  .addParam(
    "signMessageLib",
    "Address of the Safe SignMessageLib contract to forward calls to",
    DEFAULT_SIGN_MESSAGE_LIB,
  )
  .setAction(async function (taskArguments: TaskArguments, { ethers, network }) {
    const chainId = network.config.chainId!;
    frame.setChain(chainId);
    const provider = new BrowserProvider(frame, chainId);

    const signer = await provider.getSigner();
    const signMessageLib = taskArguments.signMessageLib as `0x${string}`;

    console.log(`Deploying Eip712Signer forwarding to SignMessageLib at ${signMessageLib}`);
    // const Eip712Signer = await Eip712SignerFactory.connect(signer).deploy(signMessageLib);

    const Eip712SignerFactory = await ethers.getContractFactory("Eip712Signer");
    const initCode = concat([
      Eip712SignerFactory.bytecode,
      Eip712SignerFactory.interface.encodeDeploy([signMessageLib]),
    ]);
    const address = await deployViaFactory(initCode, signer);

    console.log(`Eip712Signer deployed to: ${address}`);
  });
