// Materializes the "Tailwind / Colors" variable collection.

import {
  parseOklch,
  TAILWIND_COLOR_FAMILIES,
  TAILWIND_COLOR_SCALES,
  TAILWIND_COLORS,
} from "../colors";
import {
  ensureSingleMode,
  getOrCreateCollection,
  getOrCreateVariable,
} from "./collections";
import { COLLECTION_TAILWIND_COLORS } from "./constants";
import type { TailwindColorVarMap } from "./types";

// Returns a flat lookup keyed by "family/scale" plus "black", "white",
// "transparent". Allows the theme step to alias matching values.
export async function ensureTailwindColorCollection(): Promise<TailwindColorVarMap> {
  const collection = await getOrCreateCollection(COLLECTION_TAILWIND_COLORS);
  ensureSingleMode(collection, "Default");

  const map: TailwindColorVarMap = new Map();
  const modeId = collection.modes[0]!.modeId;

  for (const family of TAILWIND_COLOR_FAMILIES) {
    for (const scale of TAILWIND_COLOR_SCALES) {
      const name = `${family}/${scale}`;
      const variable = await getOrCreateVariable(collection, name, "COLOR");
      const rgba = parseOklch(TAILWIND_COLORS[family][scale]);
      if (rgba) variable.setValueForMode(modeId, rgba);
      map.set(name, variable);
    }
  }

  // Ungrouped neutrals.
  const black = await getOrCreateVariable(collection, "black", "COLOR");
  black.setValueForMode(modeId, { r: 0, g: 0, b: 0, a: 1 });
  map.set("black", black);

  const white = await getOrCreateVariable(collection, "white", "COLOR");
  white.setValueForMode(modeId, { r: 1, g: 1, b: 1, a: 1 });
  map.set("white", white);

  const transparent = await getOrCreateVariable(
    collection,
    "transparent",
    "COLOR",
  );
  transparent.setValueForMode(modeId, { r: 0, g: 0, b: 0, a: 0 });
  map.set("transparent", transparent);

  return map;
}
