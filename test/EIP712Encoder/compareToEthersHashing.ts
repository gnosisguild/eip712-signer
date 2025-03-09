import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { TypedDataDomain } from "abitype";
import { expect } from "chai";
import { TypedDataEncoder, TypedDataField } from "ethers";

import {
  encodeTypedDomain,
  encodeTypedValue,
  toAbiParams,
} from "../../src/typed-data";
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
  const _message = encodeTypedValue({ types, value: message });
  const abiParams = toAbiParams({ domain, types });

  expect(await encoder.hashTypedData(_domain, _message, abiParams)).to.equal(
    TypedDataEncoder.hash(domain, types, message),
  );
}
