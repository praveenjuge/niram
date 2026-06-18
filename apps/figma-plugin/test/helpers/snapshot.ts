// Stable serializers for the in-memory Figma mock, used by the golden-tree and
// idempotency suites.
//
// Variable/collection IDs are allocated from a global counter, so they are NOT
// stable across runs and must never appear in a snapshot. These helpers project
// the mock state onto its *meaningful* shape — names, resolved types, per-mode
// values — and rewrite VARIABLE_ALIAS targets to the referenced variable's name
// so aliasing is visible and order-independent.

import type { AliasValue, FigmaMock, ModeValue } from "../figma-mock";

type AnyVariable = {
  id: string;
  name: string;
  resolvedType: string;
  variableCollectionId: string;
  valuesByMode: Record<string, ModeValue>;
};

type AnyCollection = {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
  variableIds: string[];
};

function isAlias(value: ModeValue): value is AliasValue {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: string }).type === "VARIABLE_ALIAS"
  );
}

// Pull the live collection/variable maps back out of the mock. They are closed
// over in createFigmaMock, so reach them through the public async getter plus
// each collection's variableIds.
async function readState(figma: FigmaMock) {
  const collections =
    (await figma.variables.getLocalVariableCollectionsAsync()) as unknown as AnyCollection[];

  const variablesById = new Map<string, AnyVariable>();
  for (const collection of collections) {
    for (const id of collection.variableIds) {
      const variable = (await figma.variables.getVariableByIdAsync(
        id,
      )) as unknown as AnyVariable | null;
      if (variable) variablesById.set(variable.id, variable);
    }
  }
  return { collections, variablesById };
}

function serializeValue(
  value: ModeValue,
  variablesById: Map<string, AnyVariable>,
): unknown {
  if (isAlias(value)) {
    const target = variablesById.get(value.id);
    // Resolve to the target's name so the snapshot is ID-independent. Unknown
    // targets (alias into another collection not yet walked) keep a marker.
    return { alias: target ? target.name : "<unknown>" };
  }
  return value;
}

export type VariableSnapshot = {
  name: string;
  type: string;
  // Mode names (not IDs) → serialized value. Single-mode collections collapse
  // to one entry; the key is the mode's display name.
  values: Record<string, unknown>;
};

export type CollectionSnapshot = {
  name: string;
  modes: string[];
  variables: VariableSnapshot[];
};

// A fully ID-free, order-stable projection of the entire mock variable store.
export async function snapshotCollections(
  figma: FigmaMock,
): Promise<CollectionSnapshot[]> {
  const { collections, variablesById } = await readState(figma);

  const modeNameById = new Map<string, string>();
  for (const collection of collections) {
    for (const mode of collection.modes)
      modeNameById.set(mode.modeId, mode.name);
  }

  const result: CollectionSnapshot[] = collections.map((collection) => {
    const variables: VariableSnapshot[] = collection.variableIds
      .map((id) => variablesById.get(id))
      .filter((v): v is AnyVariable => Boolean(v))
      .map((variable) => {
        const values: Record<string, unknown> = {};
        for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
          const modeName = modeNameById.get(modeId) ?? modeId;
          values[modeName] = serializeValue(value, variablesById);
        }
        return { name: variable.name, type: variable.resolvedType, values };
      })
      // Sort by name so creation order can't churn the snapshot.
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      name: collection.name,
      modes: collection.modes.map((m) => m.name),
      variables,
    };
  });

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

// Coarse counts for idempotency assertions: how many collections, and how many
// variables each holds. A second generation pass must not change these.
export async function countState(figma: FigmaMock) {
  const { collections } = await readState(figma);
  return {
    collectionCount: collections.length,
    variableCounts: Object.fromEntries(
      collections
        .map((c) => [c.name, c.variableIds.length] as [string, number])
        .sort((a, b) => a[0].localeCompare(b[0])),
    ),
  };
}
