import { ParamType } from "ethers";
import { TypedData } from "viem";
import { Condition, Operator, ParameterType, c } from "zodiac-roles-sdk";

/**
 * Maps over a condition structure formulated to scope the typed data object,
 * turning it into a condition structure scoping the recursively ABI encoded value as sent to the contract.
 * Once the contract can decode directly from calldata, we should be able to send the original conditions structure so this function will be obsolete.
 **/
export const scopeTypedData = ({
  condition,
  types,
  type,
  scopeSignature,
}: {
  condition: Condition;
  types: TypedData;
  type: string;
  /** Controls whether the top-level struct type signature shall be scoped or not */
  scopeSignature?: boolean;
}): Condition => {
  // carry through logical conditions
  if (condition.paramType === ParameterType.None) {
    return {
      ...condition,
      children: condition.children?.map((child) =>
        scopeTypedData({ condition: child, types, type: type, scopeSignature }),
      ),
    };
  }

  // array
  const isArray = type.includes("[");
  if (isArray) {
    if (condition.paramType !== ParameterType.Array) {
      throw new Error(`Expected Array condition for type ${type}`);
    }
    if (
      ![Operator.ArrayEvery, Operator.ArraySome, Operator.ArraySubset, Operator.Matches].includes(condition.operator)
    ) {
      throw new Error(`Only supporting ArrayEvery, ArraySome, ArraySubset, Matches operators for array types`);
    }

    const elementType = type.split("[")[0];
    return c.abiEncodedMatches(
      [
        {
          ...condition,
          children: condition.children?.map((child) => scopeTypedData({ condition: child, types, type: elementType })),
        },
      ],
      ["bytes[]"],
    )(ParamType.from("bytes"));
  }

  // struct
  const isStruct = type in types;
  if (isStruct) {
    if (condition.paramType !== ParameterType.Tuple) {
      throw new Error(`Expected Tuple condition for type ${type}`);
    }
    if (condition.operator !== Operator.Matches) {
      throw new Error(`Only supporting Matches operator for struct types`);
    }

    const structFields = types[type];
    return c.abiEncodedMatches(
      [
        structFields.map(({ type }, index) =>
          condition.children && !!condition.children[index]
            ? scopeTypedData({ condition: condition.children[index], types, type })
            : undefined,
        ),
      ],
      ["bytes[]"],
    )(ParamType.from("bytes"));
  }

  // basic types
  return c.abiEncodedMatches([condition], [type])(ParamType.from("bytes"));
};
