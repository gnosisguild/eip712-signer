import { TypedDataField } from "ethers";

import { parseType } from "./parseType";

type Types = Record<string, Array<TypedDataField>>;

export function allTypes(types: Types, queue: string[]) {
  const result: string[] = [];

  while (queue.length) {
    const type = queue.shift()!;
    const { type: baseType } = parseType(type);

    if (result.includes(type)) {
      continue;
    } else {
      result.push(type);
    }

    queue = queue.concat(
      baseType,
      (types[baseType] || []).map((field) => field.type),
    );
  }

  return result;
}
