// Read-only reconstruction of Niram's generated variables and styles. This is
// the data source for selective region replacement when Theme & tokens is not
// selected; it deliberately never calls an ensure/create API.

import { readEffectStyles } from "../effectStyles";
import { readTextStyles } from "../textStyles";
import { COLLECTION_PRIMITIVES, COLLECTION_TAILWIND_COLORS, COLLECTION_THEME } from "./constants";
import { THEME_MODE_DARK, THEME_MODE_LIGHT } from "./collections";
import { readThemeStrategy } from "./themeStrategy";
import type { GenerateResult, ThemeVariableMaps } from "./types";

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

  const theme: ThemeVariableMaps = {
    light: new Map(),
    dark: new Map(),
  };
  const radiusScale = new Map<string, Variable>();
  let body: Variable | undefined;
  let heading: Variable | undefined;

  // The recorded strategy decides how the maps are rebuilt. Twins: dark values
  // live in separate "dark-<name>" variables. Modes: one unprefixed variable
  // per role carries both Light/Dark values, so the same variables populate
  // both maps (consumers bind the variable; Figma resolves the mode).
  const strategy = readThemeStrategy(themeCollection);
  for (const variable of themeVariables) {
    if (variable.name === "font-sans") body = variable;
    else if (variable.name === "font-heading") heading = variable;
    else if (variable.name.indexOf("radius/") === 0) {
      radiusScale.set(variable.name.slice("radius/".length), variable);
    } else if (strategy !== "modes" && variable.name.indexOf("dark-") === 0) {
      theme.dark.set(variable.name.slice("dark-".length), variable);
    } else {
      theme.light.set(variable.name, variable);
      if (strategy === "modes") theme.dark.set(variable.name, variable);
    }
  }

  if (
    tailwindColors.size === 0 ||
    primitiveMap.size === 0 ||
    theme.light.size === 0
  ) {
    return null;
  }

  // Under the modes strategy, surface the Light/Dark mode ids so consumers can
  // pin explicit modes (e.g. the Design System theme swatches).
  if (strategy === "modes") {
    const lightMode = themeCollection.modes.find(
      (mode) => mode.name === THEME_MODE_LIGHT,
    );
    const darkMode = themeCollection.modes.find(
      (mode) => mode.name === THEME_MODE_DARK,
    );
    if (lightMode && darkMode) {
      theme.modeIds = { light: lightMode.modeId, dark: darkMode.modeId };
    }
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
    themingStrategy: strategy ?? "twins",
    themingFallback: false,
    fonts: { body: bodyFamily, heading: headingFamily },
    effectStyles,
    textStyles,
    variables: {
      tailwindColors,
      primitives: primitiveMap,
      theme,
      fonts: { body, heading },
      radiusScale,
    },
  };
}
