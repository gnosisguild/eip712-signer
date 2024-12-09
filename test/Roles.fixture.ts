import { ethers } from "hardhat";
import { Integrity__factory, Packer__factory, Roles__factory } from "zodiac-roles-sdk/typechain";

export async function deployRolesFixture() {
  const safeAddress = "0x5afe5afe5afe5afe5afe5afe5afe5afe5afe5afe";
  const signer = await ethers.provider.getSigner();

  const Integrity = new Integrity__factory(signer);
  const integrity = await Integrity.deploy();

  const Packer = new Packer__factory(signer);
  const packer = await Packer.deploy();

  const integrityAddress = await integrity.getAddress();
  const packerAddress = await packer.getAddress();
  const Modifier = new Roles__factory(
    { "contracts/Integrity.sol:Integrity": integrityAddress, "contracts/packers/Packer.sol:Packer": packerAddress },
    signer,
  );
  const modifier = await Modifier.deploy(await signer.getAddress(), safeAddress, safeAddress);
  await modifier.waitForDeployment();
  return modifier;
}
