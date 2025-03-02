import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { TypedDataDomain } from "abitype";
import { expect } from "chai";
import { TypedDataEncoder } from "ethers";

import {
  TypedDataTypes,
  TypedDataValue,
  encodeTypedData,
} from "../../src/encodeTypedValue";
import { deployEIP712Encoder } from "../EIP712Encoder.fixture";

export async function compareToEthersHashing({
  domain,
  types,
  message,
  primaryType,
}: {
  domain: TypedDataDomain;
  types: TypedDataTypes;
  message: TypedDataValue;
  primaryType: string;
}) {
  const { encoder } = await loadFixture(deployEIP712Encoder);
  const [_domain, _types, _message] = encodeTypedData(
    domain,
    types,
    message,
    primaryType,
  );

  expect(await encoder.hash(_domain, _types, _message)).to.equal(
    TypedDataEncoder.hash(domain, types, message),
  );
}
