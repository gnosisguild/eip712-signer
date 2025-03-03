import { ethers } from "hardhat";

export async function deployEIP712Hasher() {
  const EIP7127Encoder = await ethers.getContractFactory("EIP712Hasher");
  const encoder = await EIP7127Encoder.deploy();

  return { encoder };
}
