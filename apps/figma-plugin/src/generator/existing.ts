// Read-only reconstruction of Niram's generated variables and styles. This is
// the data source for selective region replacement when Theme & tokens is not
// selected; it deliberately never calls an ensure/create API.

import { readEffectStyles } from "../effectStyles";
import { readTextStyles } from "../textStyles";
import {
  COLLECTION_PRIMITIVES,
  COLLECTION_TAILWIND_COLORS,
  COLLECTION_THEME,
} from "./constants";
import type { GenerateResult } from "./types";

async function variablesFor(
  collection: VariableCollection,
): Promise<Variable[]> {
  const variables: Variable[] = [];
  for (const id of collection.variableIds) {
    const variable = await figma.variables.getVariableByIdAsync(id);
    if (variable) variables.push(variable);
  }
  return variables;
}

function stringValue(
  variable: Variable | undefined,
  modeId: string,
): string | undefined {
  if (!variable) return undefined;
  const values = (
    variable as unknown as { valuesByMode?: Record<string, unknown> }
  ).valuesByMode;
  const value = values ? values[modeId] : undefined;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function loadExistingGeneratedAssets(
  presetCode: string,
): Promise<GenerateResult | null> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const byName = new Map<string, VariableCollection>();
  for (const collection of collections) byName.set(collection.name, collection);

  const colorsCollection = byName.get(COLLECTION_TAILWIND_COLORS);
  const primitivesCollection = byName.get(COLLECTION_PRIMITIVES);
  const themeCollection = byName.get(COLLECTION_THEME);
  if (!colorsCollection || !primitivesCollection || !themeCollection) {
    return null;
  }

  const [colors, primitives, themeVariables, effectStyles, textStyles] =
    await Promise.all([
      variablesFor(colorsCollection),
      variablesFor(primitivesCollection),
      variablesFor(themeCollection),
      readEffectStyles(),
      readTextStyles(),
    ]);

  const tailwindColors = new Map<string, Variable>();
  for (const variable of colors) tailwindColors.set(variable.name, variable);
  const primitiveMap = new Map<string, Variable>();
  for (const variable of primitives) primitiveMap.set(variable.name, variable);

  const light = new Map<string, Variable>();
  const dark = new Map<string, Variable>();
  const radiusScale = new Map<string, Variable>();
  let body: Variable | undefined;
  let heading: Variable | undefined;
  for (const variable of themeVariables) {
    if (variable.name === "font-sans") body = variable;
    else if (variable.name === "font-heading") heading = variable;
    else if (variable.name.indexOf("radius/") === 0) {
      radiusScale.set(variable.name.slice("radius/".length), variable);
    } else if (variable.name.indexOf("dark-") === 0) {
      dark.set(variable.name.slice("dark-".length), variable);
    } else {
      light.set(variable.name, variable);
    }
  }

  if (tailwindColors.size === 0 || primitiveMap.size === 0 || light.size === 0) {
    return null;
  }

  const modeId = themeCollection.modes[0] ? themeCollection.modes[0]!.modeId : "";
  const bodyFamily = stringValue(body, modeId) ?? "Inter";
  const headingFamily = stringValue(heading, modeId) ?? bodyFamily;

  return {
    presetCode,
    collections: [
      { name: COLLECTION_TAILWIND_COLORS, variableCount: colors.length },
      { name: COLLECTION_PRIMITIVES, variableCount: primitives.length },
      { name: COLLECTION_THEME, variableCount: themeVariables.length },
    ],
    fallbackThemeColors: 0,
    fonts: { body: bodyFamily, heading: headingFamily },
    effectStyles,
    textStyles,
    variables: {
      tailwindColors,
      primitives: primitiveMap,
      theme: { light, dark },
      fonts: { body, heading },
      radiusScale,
    },
  };
}
