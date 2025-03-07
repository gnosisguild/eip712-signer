import { Contract, Signer } from "ethers";

import { iface } from "./deploy-mastercopies/safeMastercopy";
import {
  calculateSafeAddress,
  populateSafeCreation,
} from "./encodeSafeCreation";

export async function deploySafe(
  {
    owners,
    threshold,
    creationNonce,
  }: {
    owners: string[];
    threshold: number;
    creationNonce: bigint | number;
  },
  relayer: Signer,
) {
  await relayer.sendTransaction(
    populateSafeCreation({
      owners,
      threshold,
      creationNonce: BigInt(creationNonce),
    }),
  );

  return new Contract(
    calculateSafeAddress({
      owners,
      threshold,
      creationNonce: BigInt(creationNonce),
    }),
    iface,
  );
}
