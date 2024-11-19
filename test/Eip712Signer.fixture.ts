import { ethers } from "hardhat";

export async function deployEip712SignerFixture() {
  const SignMessageLib = await ethers.getContractFactory("SignMessageLib");
  const signMessageLib = await SignMessageLib.deploy();

  const SafeMock = await ethers.getContractFactory("SafeMock");
  const safe = await SafeMock.deploy();

  const Eip712SignerFactory = await ethers.getContractFactory("Eip712Signer");
  const Eip712Signer = await Eip712SignerFactory.deploy(await signMessageLib.getAddress());

  return { Eip712Signer, safe, signMessageLib };
}

export async function deployEip712SignerFixtureWithLibMock() {
  const SignMessageLib = await ethers.getContractFactory("SignMessageLibMock");
  const signMessageLib = await SignMessageLib.deploy();

  const SafeMock = await ethers.getContractFactory("SafeMock");
  const safe = await SafeMock.deploy();

  const Eip712SignerFactory = await ethers.getContractFactory("Eip712Signer");
  const Eip712Signer = await Eip712SignerFactory.deploy(await signMessageLib.getAddress());

  return { Eip712Signer, safe, signMessageLib };
}
