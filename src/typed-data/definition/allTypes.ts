import { TypedData } from "abitype";

import { parseType } from "./parseType";

export function allTypes(types: TypedData, queue: string[]) {
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
