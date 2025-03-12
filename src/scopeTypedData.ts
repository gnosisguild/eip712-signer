import { TypedData } from "abitype";
import { AbiCoder, Interface } from "ethers";
import { Condition, Operator, ParameterType, rolesAbi } from "zodiac-roles-sdk";

import { toAbiParams } from "./typed-data";

export const scopeTypedData = ({
  domain,
  message,
  types,
}: {
  domain: Condition;
  message: Condition;
  types: TypedData;
}): Condition => {
  if (domain.paramType !== ParameterType.AbiEncoded) {
    throw new Error("Domain not AbiEncoded condition");
  }

  if (message.paramType !== ParameterType.AbiEncoded) {
    throw new Error("Message not AbiEncoded condition");
  }

  if (!types["EIP712Domain"]) {
    throw new Error("TypedData does not include EIP712Domain");
  }

  return {
    paramType: ParameterType.Calldata,
    operator: Operator.Matches,
    children: [domain, message, typesCondition(types)],
  };
};

function typesCondition(types: TypedData): Condition {
  const abiParams = toAbiParams({ types });
  const compValue = AbiCoder.defaultAbiCoder().encode(
    ["(uint256,bytes32,uint256[])[]"],
    [abiParams.map((p) => [p.key, p.typeHash, p.fields])],
  );
  return {
    paramType: ParameterType.Array,
    operator: Operator.EqualTo,
    compValue: compValue as any,
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
  };
}

export const iface = Interface.from(rolesAbi);
