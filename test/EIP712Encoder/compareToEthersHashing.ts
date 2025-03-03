import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { TypedDataDomain } from "abitype";
import { expect } from "chai";
import { TypedDataEncoder, TypedDataField } from "ethers";

import {
  encodeTypedDomain,
  encodeTypedMessage,
} from "../../src/typed-data/encode";
import { deployEIP712Encoder } from "../EIP712Encoder.fixture";

type Value = Record<string, any>;
type Types = Record<string, Array<TypedDataField>>;

export async function compareToEthersHashing({
  domain,
  types,
  message,
}: {
  domain: TypedDataDomain;
  types: Types;
  message: Value;
}) {
  const { encoder } = await loadFixture(deployEIP712Encoder);

  const _domain = encodeTypedDomain({ domain });
  const _message = encodeTypedMessage({ types, message });

  expect(await encoder.hash(_domain, _message)).to.equal(
    TypedDataEncoder.hash(domain, types, message),
  );
}
