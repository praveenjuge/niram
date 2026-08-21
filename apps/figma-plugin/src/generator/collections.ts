// Helpers for finding/creating Figma variable collections and variables, plus
// mode normalization. Used by every collection-building module.

export async function findCollectionByName(name: string) {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  return collections.find((collection) => collection.name === name) ?? null;
}

export async function getOrCreateCollection(name: string) {
  const existing = await findCollectionByName(name);
  if (existing) return existing;
  return figma.variables.createVariableCollection(name);
}

async function findVariableInCollection(
  collection: VariableCollection,
  name: string,
): Promise<Variable | null> {
  for (const id of collection.variableIds) {
    const variable = await figma.variables.getVariableByIdAsync(id);
    if (variable && variable.name === name) return variable;
  }
  return null;
}

export async function getOrCreateVariable(
  collection: VariableCollection,
  name: string,
  type: VariableResolvedDataType,
): Promise<Variable> {
  const existing = await findVariableInCollection(collection, name);
  if (existing) {
    if (existing.resolvedType === type) return existing;
    // Type can't change after creation. Recreate fresh to avoid surprises.
    existing.remove();
  }
  return figma.variables.createVariable(name, collection, type);
}

export function ensureSingleMode(
  collection: VariableCollection,
  modeName: string,
) {
  const [first, ...rest] = collection.modes;
  // Newly-created collections always come with exactly one mode, so this
  // branch is defensive — `addMode` would throw on the free tier.
  if (!first) return;
  if (first.name !== modeName) collection.renameMode(first.modeId, modeName);
  // Drop extras to keep the collection clean (e.g. if a previous run used the
  // variable-modes strategy and this run fell back to twins).
  for (const mode of rest) {
    try {
      collection.removeMode(mode.modeId);
    } catch {
      // Ignore — Figma forbids removing the last mode.
    }
  }
}

// Mode names used by the variable-modes theming strategy.
export const THEME_MODE_LIGHT = "Light";
export const THEME_MODE_DARK = "Dark";

export type ThemeModeIds = { lightModeId: string; darkModeId: string };

// Ensures the collection has exactly two modes named Light + Dark, reusing
// existing mode ids on a re-run. Throws when the file's tier refuses addMode
// (free/Starter caps collections at one mode); callers fall back to
// ensureSingleMode in that case.
export function ensureThemeModes(
  collection: VariableCollection,
): ThemeModeIds {
  const [first, ...rest] = collection.modes;
  if (!first) throw new Error("Theme collection has no modes.");
  if (first.name !== THEME_MODE_LIGHT) {
    collection.renameMode(first.modeId, THEME_MODE_LIGHT);
  }

  let dark = rest.find((mode) => mode.name === THEME_MODE_DARK);
  if (!dark) {
    // Propagate the tier error to the caller — it decides the fallback.
    collection.addMode(THEME_MODE_DARK);
    dark = collection.modes[collection.modes.length - 1];
  }

  // Trim anything beyond Light/Dark so re-runs converge on the same shape.
  const keep = new Set([first.modeId, dark!.modeId]);
  for (const mode of collection.modes) {
    if (!keep.has(mode.modeId)) {
      try {
        collection.removeMode(mode.modeId);
      } catch {
        // Ignore — Figma forbids removing the last mode.
      }
    }
  }

  return { lightModeId: first.modeId, darkModeId: dark!.modeId };
}

// Cheap capability probe for multi-mode collections: create a scratch
// collection, attempt addMode, remove it. There is no plugin API that reports
// the file's plan, so this try/catch is the canonical detection. Returns false
// on free/Starter tiers ("Limited to N modes only") and true elsewhere.
export async function probeMultiModeSupport(): Promise<boolean> {
  let probe: VariableCollection | null = null;
  try {
    probe = figma.variables.createVariableCollection("__niramModeProbe");
    probe.addMode("__probe");
    return true;
  } catch {
    return false;
  } finally {
    if (probe) {
      try {
        probe.remove();
      } catch {
        // Best-effort cleanup; an orphaned empty probe collection is harmless.
      }
    }
  }
}
