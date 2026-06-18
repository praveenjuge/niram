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
  // Drop extras to keep the collection clean (e.g. if a previous run created
  // Light + Dark modes on a paid plan).
  for (const mode of rest) {
    try {
      collection.removeMode(mode.modeId);
    } catch {
      // Ignore — Figma forbids removing the last mode.
    }
  }
}
