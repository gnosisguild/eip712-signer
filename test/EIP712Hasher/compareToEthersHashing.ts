import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { TypedDataDomain } from "abitype";
import { expect } from "chai";
import { TypedDataEncoder, TypedDataField } from "ethers";

import { encodeTypedData } from "../../src/typed-data";
import { deployEIP712Hasher } from "../EIP712Hasher.fixture";

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
  const { encoder } = await loadFixture(deployEIP712Hasher);

  const {
    domain: _domain,
    message: _message,
    types: _types,
  } = encodeTypedData({ domain, types, message });

  expect(await encoder.hash(_domain, _message, _types)).to.equal(
    TypedDataEncoder.hash(domain, types, message),
  );
}
