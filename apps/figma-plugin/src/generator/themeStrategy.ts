// Plugin-data tag recording which theming strategy the `shadcn / Theme`
// collection currently uses. Read by the generator (migration decisions), the
// reconstruction pass (existing.ts), and the sandbox (replace confirmation).

import { normalizeThemingStrategy, type ThemingStrategy } from "../theming";
import { COLLECTION_THEME } from "./constants";
import { findCollectionByName } from "./collections";

export const THEME_STRATEGY_KEY = "niramThemeStrategy";

export function readThemeStrategy(
  collection: VariableCollection,
): ThemingStrategy | null {
  return normalizeThemingStrategy(collection.getPluginData(THEME_STRATEGY_KEY));
}

export function writeThemeStrategy(
  collection: VariableCollection,
  strategy: ThemingStrategy,
): void {
  collection.setPluginData(THEME_STRATEGY_KEY, strategy);
}

// Strategy of the theme collection already in the document, or null when it
// doesn't exist (first run / deleted collections).
export async function loadExistingThemeStrategy(): Promise<ThemingStrategy | null> {
  const collection = await findCollectionByName(COLLECTION_THEME);
  return collection ? readThemeStrategy(collection) : null;
}
