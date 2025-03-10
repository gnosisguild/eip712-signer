import { TypedData } from "abitype";

import { parseType } from "./parseType";

export function findPrimaryType({ types }: { types: TypedData }): string {
  const count: Record<string, number> = {};

  // Initialize reference counts to 0
  Object.keys(types).forEach((typeName) => {
    count[typeName] = 0;
  });

  // count references for every struct type
  for (const name of Object.keys(types)) {
    for (const field of types[name]!) {
      const { type } = parseType(field.type);
      if (count[type] !== undefined) {
        count[type]++;
      }
    }
  }

  const candidates = Object.entries(count).filter(([_, count]) => count == 0);

  if (candidates.length != 1) {
    throw new Error(
      `Expected exactly one primary type, found ${
        candidates.length
      }: ${candidates.map(([type]) => type).join(", ")}`,
    );
  }

  return candidates[0][0];
}
