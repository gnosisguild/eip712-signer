import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { TypedData, TypedDataDomain } from "abitype";
import { expect } from "chai";
import { TypedDataEncoder } from "ethers";

import {
  encodeTypedDomain,
  encodeTypedMessage,
  toAbiTypes,
} from "../../src/typed-data";
import { deployEIP712Encoder } from "../EIP712Encoder.fixture";

type Value = Record<string, any>;

export async function compareToEthersHashing({
  domain,
  types,
  message,
}: {
  domain: TypedDataDomain;
  types: TypedData;
  message: Value;
}) {
  const { encoder } = await loadFixture(deployEIP712Encoder);

  const _domain = encodeTypedDomain({ domain });
  const _message = encodeTypedMessage({ types, message });
  const abiTypes = toAbiTypes({ domain, types });

  expect(await encoder.hashTypedMessage(_domain, _message, abiTypes)).to.equal(
    TypedDataEncoder.hash(domain, types as any, message),
  );
}
