import { ParamType } from "ethers";
import { TypedData } from "viem";
import { Condition, Operator, ParameterType, c } from "zodiac-roles-sdk";

import { TYPED_VALUE_TUPLE, TYPED_VALUE_TUPLE_ARRAY } from "./const";
import { DataType } from "./types";
import { encodeStructType, isAtomic } from "./utils";

/** Maps over a condition structure formulated to scope the typed data object, turning it into a condition structure scoping the corresponding TypedValue encoding */
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
    return {
      ...condition,
      children: condition.children?.map((child) =>
        scopeTypedData({ condition: child, types, type: elementType, scopeSignature }),
      ),
    };
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
    return c.matches({
      dataType: DataType.Struct,
      value: c.abiEncodedMatches(
        [
          structFields.map(({ type }, index) =>
            condition.children && !!condition.children[index]
              ? scopeTypedData({ condition: condition.children[index], types, type })
              : undefined,
          ),
        ],
        [TYPED_VALUE_TUPLE_ARRAY],
      ),
      structSignature: scopeSignature ? encodeStructType({ types, primaryType: type }) : undefined,
    })(ParamType.from(TYPED_VALUE_TUPLE));
  }

  // basic types
  return c.matches({
    dataType: isAtomic(type) ? DataType.Atomic : DataType.Dynamic,
    value: c.abiEncodedMatches([condition], [type]),
  })(ParamType.from(TYPED_VALUE_TUPLE));
};
