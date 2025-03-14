import { ethers } from "hardhat";

export async function deployEIP712Encoder() {
  const EIP7127Encoder = await ethers.getContractFactory("EIP712Encoder");
  const encoder = await EIP7127Encoder.deploy();

  return { encoder };
}
