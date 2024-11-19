import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ZeroAddress } from "ethers";
import { ethers } from "hardhat";

import { Eip712Signer__factory } from "../types";
import { deployEip712SignerFixture, deployEip712SignerFixtureWithLibMock } from "./Eip712Signer.fixture";

describe("Eip712Signer", () => {
  describe("deployment", () => {
    it("reverts if zero address is passed", async () => {
      // We don't use the fixture here because we want a different deployment
      const Eip712Signer = await ethers.getContractFactory("Eip712Signer");
      await expect(Eip712Signer.deploy(ZeroAddress)).to.be.revertedWithCustomError(Eip712Signer, "InvalidAddress");
    });
  });

  describe("signTypedMessage()", () => {
    const vote = {
      from: "0x849d52316331967b6ff1198e5e32a0eb168d039d",
      space: "lido-snapshot.eth",
      timestamp: 1705506751,
      proposal: "0xc12ae07242326a719cb6b6a5eb19cb77eb4515b4a5ebe58508f965a5b9abb27c",
      choice: 1,
      reason: "test",
      app: "snapshot",
      metadata: "{}",
    };

    const domain = {
      name: "snapshot",
      version: "0.1.4",
    };

    const signVoteTxData = Eip712Signer__factory.createInterface().encodeFunctionData("signTypedMessage", [
      domain,
      domain,
    ]);

    it("reverts if not called via delegatecall", async () => {
      const { safe, Eip712Signer } = await loadFixture(deployEip712SignerFixture);
      Eip712Signer.signTypedMessage("0x0000asd");
      await expect(safe.exec(await Eip712Signer.getAddress(), 0, signVoteTxData, 0)).to.be.revertedWithCustomError(
        Eip712Signer,
        "InvalidCall",
      );
    });

    it("forwards to the SignMessageLib via delegatecall", async () => {
      const { safe, Eip712Signer, signMessageLib } = await loadFixture(deployEip712SignerFixtureWithLibMock);

      const res = await safe.exec(await Eip712Signer.getAddress(), 0, signVoteTxData, 1);
      const rec = await res.wait();
      const [_, thisAddress] = signMessageLib.interface.decodeEventLog("SignMessage", rec!.logs[0].data);
      expect(thisAddress).to.equal(await safe.getAddress());
    });

    it("marks the message as signed for the safe", async () => {
      const { safe, Eip712Signer, signMessageLib } = await loadFixture(deployEip712SignerFixture);
      console.log(await Eip712Signer.signMessageLib(), await signMessageLib.getAddress());
      await safe.exec(await Eip712Signer.getAddress(), 0, signVoteTxData, 1);

      // got the expected data from triggering a test vote with above data through the snapshot UI
      const expectedData = "0x464975e8555fb6c08d392a9f4348dfc47a84fff0373877a746f9283d6e170509";

      const [expectedHash] = await safe.execResult.staticCallResult(
        await signMessageLib.getAddress(),
        0,
        signMessageLib.interface.encodeFunctionData("getMessageHash", [expectedData]),
        1,
      );

      expect(await safe.getSignedMessage(expectedHash)).to.equal(1n);
    });
  });
});
