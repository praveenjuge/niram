// Materializes the "shadcn / Theme" variable collection. Light values use
// the bare key; dark values are emitted as "dark-<key>" since the free tier
// only supports a single mode per collection.

import { findTailwindAlias, parseColor, type Rgba } from "../colors";
import { FALLBACK_GLYPH_FAMILIES, loadFontFamilies } from "../fonts";
import {
  DEFAULT_RADIUS_PX,
  resolveFonts,
  shadcnRadiusScale,
  type ResolvedFonts,
} from "../primitives";
import {
  ensureSingleMode,
  getOrCreateCollection,
  getOrCreateVariable,
} from "./collections";
import { COLLECTION_THEME, THEME_NUMBER_KEYS } from "./constants";
import type {
  ResolvedRegistry,
  TailwindColorVarMap,
  ThemeFontVars,
  ThemeVariableMaps,
} from "./types";

export type ThemeResult = {
  variableCount: number;
  unaliasedCount: number;
  maps: ThemeVariableMaps;
  // The resolved family names + the variables backing them, so page builders
  // can load the fonts and bind text nodes to them.
  fonts: ResolvedFonts;
  fontVars: ThemeFontVars;
  // The shadcn radius scale (`--radius-sm` … `--radius-4xl`) derived from the
  // preset's `--radius`. Keyed by step name (sm/md/lg/xl/2xl/3xl/4xl). Lives in
  // this collection because it is preset-driven; components bind their corners
  // here so the create-preset radius choice flows through every component.
  radiusScale: Map<string, Variable>;
};

// Maps a shadcn theme key to a friendly Figma variable name.
// We keep the dash-separated key as-is, since it matches the JSON token style
// shown in Default.tokens.json and reads well in the Figma UI.
function themeVariableName(key: string): string {
  return key;
}

// Read the current per-mode string values of the given variables (e.g. the
// previously stored font family names), de-duped and skipping anything that
// isn't a non-empty string. Used so a re-run can load the *old* preset fonts
// before overwriting a bound font variable, preventing Figma's "unloaded font"
// rejection when setValueForMode re-validates the already-bound text nodes.
function readStringValues(
  variables: ReadonlyArray<Variable>,
  modeId: string,
): string[] {
  const out: string[] = [];
  for (const variable of variables) {
    const values = (
      variable as unknown as { valuesByMode?: Record<string, unknown> }
    ).valuesByMode;
    const value = values ? values[modeId] : undefined;
    if (
      typeof value === "string" &&
      value.length > 0 &&
      out.indexOf(value) === -1
    ) {
      out.push(value);
    }
  }
  return out;
}

export async function ensureThemeCollection(
  data: ResolvedRegistry,
  tailwindColors: TailwindColorVarMap,
): Promise<ThemeResult> {
  const light = data.cssVars.light;
  const dark = data.cssVars.dark;

  const collection = await getOrCreateCollection(COLLECTION_THEME);
  ensureSingleMode(collection, "Default");
  const modeId = collection.modes[0]!.modeId;

  const allKeys = new Set<string>([
    ...Object.keys(light),
    ...Object.keys(dark),
  ]);

  let variableCount = 0;
  let unaliasedCount = 0;

  const maps: ThemeVariableMaps = {
    light: new Map(),
    dark: new Map(),
  };

  // Free-tier Figma collections only support one mode. Instead of two modes,
  // we emit one variable per (key, scheme): "background" carries the light
  // value, "dark-background" carries the dark value. Designers swap by
  // re-binding to the dark-* variants when they want a dark surface.
  const passes: Array<{
    prefix: string;
    values: Record<string, string>;
    target: Map<string, Variable>;
  }> = [
    { prefix: "", values: light, target: maps.light },
    { prefix: "dark-", values: dark, target: maps.dark },
  ];

  for (const key of allKeys) {
    const isNumber = THEME_NUMBER_KEYS.has(key);

    for (const pass of passes) {
      const rawValue = pass.values[key];
      if (rawValue === undefined) continue;

      const variableName = `${pass.prefix}${themeVariableName(key)}`;

      if (isNumber) {
        const variable = await getOrCreateVariable(
          collection,
          variableName,
          "FLOAT",
        );
        const number = parseLengthRem(rawValue);
        if (number !== null) variable.setValueForMode(modeId, number);
        variableCount += 1;
        pass.target.set(key, variable);
        continue;
      }

      const variable = await getOrCreateVariable(
        collection,
        variableName,
        "COLOR",
      );

      const applied = applyThemeColor(
        variable,
        modeId,
        rawValue,
        tailwindColors,
      );
      if (!applied.aliased) unaliasedCount += 1;
      variableCount += 1;
      pass.target.set(key, variable);
    }
  }

  // Font families come from the preset (body + heading), not from cssVars.
  // They live alongside the colors in `shadcn / Theme` so a designer sees the
  // whole preset in one collection. Heading "inherit" reuses the body font.
  const fonts = resolveFonts(data.config.font, data.config.fontHeading);

  // Create the font variables first so we can read any *previous* values: on a
  // re-run (especially with a different preset) these STRING variables are
  // already bound to text nodes from the earlier build, and those nodes are
  // still painted with the old preset's font until the page builders rebuild
  // them.
  const bodyVar = await getOrCreateVariable(collection, "font-sans", "STRING");
  const headingVar = await getOrCreateVariable(
    collection,
    "font-heading",
    "STRING",
  );

  // Figma rejects setValueForMode on a bound font variable unless every face
  // the bound nodes still use is loaded. Load the new preset families, the
  // previously stored families (what those existing nodes are painted with),
  // and the Noto glyph fallbacks Figma substitutes for characters the preset
  // font can't render — all before writing the new values.
  const previousFamilies = readStringValues([bodyVar, headingVar], modeId);
  await loadFontFamilies([
    fonts.body,
    fonts.heading,
    ...previousFamilies,
    ...FALLBACK_GLYPH_FAMILIES,
  ]);

  bodyVar.setValueForMode(modeId, fonts.body);
  variableCount += 1;

  headingVar.setValueForMode(modeId, fonts.heading);
  variableCount += 1;

  // The shadcn radius scale derived from the preset's `--radius`. These live in
  // the theme collection (not the fixed Tailwind primitives) because they are
  // preset-driven. Components bind their corners to these so the create-preset
  // radius choice shows up everywhere, while `Tailwind / Primitives` keeps a
  // stable reference scale. Names are `radius/<step>` (e.g. "radius/lg").
  const radiusScale = new Map<string, Variable>();
  const baseRadiusPx = parseLengthRem(light["radius"]) ?? DEFAULT_RADIUS_PX;
  for (const token of shadcnRadiusScale(baseRadiusPx)) {
    const variable = await getOrCreateVariable(
      collection,
      `radius/${token.name}`,
      "FLOAT",
    );
    variable.setValueForMode(modeId, token.value);
    radiusScale.set(token.name, variable);
    variableCount += 1;
  }

  return {
    variableCount,
    unaliasedCount,
    maps,
    fonts,
    fontVars: { body: bodyVar, heading: headingVar },
    radiusScale,
  };
}

function applyThemeColor(
  variable: Variable,
  modeId: string,
  rawValue: string | undefined,
  tailwindColors: TailwindColorVarMap,
): { aliased: boolean } {
  if (!rawValue) return { aliased: false };

  const aliasKey = findTailwindAlias(rawValue);
  if (aliasKey) {
    const target = tailwindColors.get(aliasKey);
    if (target) {
      variable.setValueForMode(
        modeId,
        figma.variables.createVariableAlias(target),
      );
      return { aliased: true };
    }
  }

  const rgba = colorFromString(rawValue, tailwindColors);
  if (rgba) variable.setValueForMode(modeId, rgba);
  return { aliased: false };
}

// Parse "0.625rem", "16px", or a plain number into a Figma float (px).
function parseLengthRem(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.endsWith("rem")) {
    const n = parseFloat(trimmed);
    return Number.isNaN(n) ? null : n * 16;
  }
  if (trimmed.endsWith("px")) {
    const n = parseFloat(trimmed);
    return Number.isNaN(n) ? null : n;
  }
  const n = parseFloat(trimmed);
  return Number.isNaN(n) ? null : n;
}

function colorFromString(
  value: string,
  _tailwindColors: TailwindColorVarMap,
): Rgba | null {
  // shadcn theme values are always oklch() in v4. Hex falls back to direct
  // RGB. Anything else (named colors etc.) we skip.
  return parseColor(value);
}
