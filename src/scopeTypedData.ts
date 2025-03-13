import { TypedData } from "abitype";
import { AbiCoder, Interface, keccak256 } from "ethers";
import { Condition, Operator, ParameterType, rolesAbi } from "zodiac-roles-sdk";

import { encodeAbiTypes } from "./encodeAbiTypes";
import { toAbiTypes } from "./typed-data";

export const scopeTypedData = ({
  domain,
  message,
  types,
}: {
  domain: Condition;
  message: Condition;
  types: TypedData;
}): { selector: `0x${string}`; condition: Condition } => {
  if (domain.paramType !== ParameterType.AbiEncoded) {
    throw new Error("Domain not AbiEncoded condition");
  }

  if (message.paramType !== ParameterType.AbiEncoded) {
    throw new Error("Message not AbiEncoded condition");
  }

  if (!types["EIP712Domain"]) {
    throw new Error("TypedData does not include EIP712Domain");
  }

  const selector = keccak256(encodeAbiTypes({ types })).slice(0, 10);
  return {
    selector: selector as `0x${string}`,
    condition: {
      paramType: ParameterType.Calldata,
      operator: Operator.Matches,
      children: [domain, message, typesCondition(types)],
    },
  };
};

function typesCondition(types: TypedData): Condition {
  const { abiTypes, typeHashes } = toAbiTypes({ types });
  const compValue = AbiCoder.defaultAbiCoder().encode(
    ["tuple(tuple(uint8,uint256[])[], bytes32[])"],
    [[abiTypes.map((p) => [p.key, p.fields]), typeHashes]],
  );

  return {
    paramType: ParameterType.Tuple,
    operator: Operator.EqualTo,
    compValue: compValue as any,
    children: [tupleLeft(), tupleRight()],
  };
}

const tupleLeft = (): Condition => ({
  paramType: ParameterType.Array,
  operator: Operator.Pass,
  compValue: "0x",
  children: [
    {
      paramType: ParameterType.Tuple,
      operator: Operator.Pass,
      children: [
        {
          paramType: ParameterType.Static,
          operator: Operator.Pass,
        },
        {
          paramType: ParameterType.Array,
          operator: Operator.Pass,
          children: [
            {
              paramType: ParameterType.Static,
              operator: Operator.Pass,
            },
          ],
        },
      ],
    },
  ],
});

const tupleRight = (): Condition => ({
  paramType: ParameterType.Array,
  operator: Operator.Pass,
  compValue: "0x",
  children: [
    {
      paramType: ParameterType.Static,
      operator: Operator.Pass,
      compValue: "0x",
    },
  ],
});

export const iface = Interface.from(rolesAbi);
