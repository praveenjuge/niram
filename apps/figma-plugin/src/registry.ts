// Local resolver that mirrors shadcn's buildRegistryTheme + buildRegistryBase.
// We ship the theme catalogue as JSON so the plugin can run offline — Figma
// plugin iframes have a null origin and ui.shadcn.com doesn't send
// Access-Control-Allow-Origin, so a direct fetch is blocked by CORS.

import {
  decodePreset,
  encodePreset,
  extractPresetCode,
  generateRandomConfig,
  isPresetCode,
  PRESET_BASE_COLORS,
  PRESET_THEMES,
  type PresetConfig,
} from "./preset";
import themesData from "./data/themes.json";

type ThemeEntry = {
  name: string;
  title?: string;
  type?: string;
  cssVars?: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
    theme?: Record<string, string>;
  };
};

const THEMES = themesData as ThemeEntry[];

const BASE_COLOR_NAMES = new Set([
  "neutral",
  "stone",
  "zinc",
  "gray",
  "mauve",
  "olive",
  "mist",
  "taupe",
]);

const RADIUS_VALUES: Record<PresetConfig["radius"], string> = {
  default: "0.625rem",
  none: "0",
  small: "0.45rem",
  medium: "0.625rem",
  large: "0.875rem",
};

export type ResolvedRegistry = {
  name: string;
  config: PresetConfig;
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
};

export type ResolveResult =
  | { ok: true; data: ResolvedRegistry; presetCode: string }
  | { ok: false; error: string };

// Resolve a preset code locally. Returns the same shape we used to fetch.
export function resolvePreset(rawCode: string): ResolveResult {
  const code = extractPresetCode(rawCode) ?? rawCode.trim();
  if (!isPresetCode(code)) {
    return { ok: false, error: "That doesn't look like a shadcn preset code." };
  }
  const decoded = decodePreset(code);
  if (!decoded) {
    return { ok: false, error: "Couldn't decode that preset code." };
  }
  // Some valid preset values (e.g. the legacy "gray" family) have no entry in
  // the bundled shadcn theme snapshot. Surface that as a friendly error rather
  // than letting buildRegistry throw — an uncaught throw here would hang the
  // UI on "Resolving preset…".
  const missing = missingThemeName(decoded);
  if (missing) {
    return {
      ok: false,
      error: `The "${missing}" color isn't in this plugin's theme data. Try a different preset.`,
    };
  }
  return {
    ok: true,
    presetCode: code,
    data: buildRegistry(decoded),
  };
}

// Returns the first config color (baseColor or theme) that has no matching
// entry in the bundled themes, or null if everything resolves.
function missingThemeName(config: PresetConfig): string | null {
  if (!getTheme(config.baseColor)) return config.baseColor;
  if (!getTheme(config.theme)) return config.theme;
  return null;
}

// True when a decoded preset resolves fully against the bundled themes.
export function isResolvablePreset(config: PresetConfig): boolean {
  return missingThemeName(config) === null;
}

function getTheme(name: string): ThemeEntry | undefined {
  return THEMES.find((theme) => theme.name === name);
}

// Mirrors apps/v4/registry/config.ts buildRegistryTheme + buildRegistryBase,
// minus the icon/dependency wiring we don't need.
function buildRegistry(config: PresetConfig): ResolvedRegistry {
  const baseColor = getTheme(config.baseColor);
  const theme = getTheme(config.theme);

  if (!baseColor || !theme) {
    throw new Error(
      `Missing theme entry for baseColor="${config.baseColor}" or theme="${config.theme}". ` +
        `Update src/data/themes.json from shadcn-ui.`,
    );
  }

  const light: Record<string, string> = {
    ...(baseColor.cssVars?.light ?? {}),
    ...(theme.cssVars?.light ?? {}),
  };
  const dark: Record<string, string> = {
    ...(baseColor.cssVars?.dark ?? {}),
    ...(theme.cssVars?.dark ?? {}),
  };

  // Chart color override (shadcn lets the chart family differ from the theme).
  const chartTheme = getTheme(config.chartColor);
  if (chartTheme) {
    const chartLight = chartTheme.cssVars?.light ?? {};
    const chartDark = chartTheme.cssVars?.dark ?? {};
    for (let i = 1; i <= 5; i++) {
      const key = `chart-${i}`;
      const lightValue = chartLight[key];
      const darkValue = chartDark[key];
      if (lightValue) light[key] = lightValue;
      if (darkValue) dark[key] = darkValue;
    }
  }

  // Menu accent: bold pulls accent from primary.
  if (config.menuAccent === "bold") {
    if (light["primary"]) light["accent"] = light["primary"];
    if (light["primary-foreground"]) {
      light["accent-foreground"] = light["primary-foreground"];
    }
    if (dark["primary"]) dark["accent"] = dark["primary"];
    if (dark["primary-foreground"]) {
      dark["accent-foreground"] = dark["primary-foreground"];
    }
  }

  // Radius: only the light side carries it (matches shadcn behaviour).
  if (config.radius && config.radius !== "default") {
    light["radius"] = RADIUS_VALUES[config.radius];
  }

  return {
    name: `${config.baseColor}-${config.theme}`,
    config,
    cssVars: { light, dark },
  };
}

// Used in tests/inspection — exported so the UI can label what was generated.
export function listAvailableThemes(): string[] {
  return THEMES.map((theme) => theme.name);
}

// Generate a random preset code that is guaranteed to resolve against the
// bundled themes. Mirrors shadcn's shuffle, but re-rolls any config that lands
// on a color family we don't ship (e.g. the legacy "gray"). Falls back to a
// resolvable baseColor/theme on the rare config that can't be salvaged.
export function generateRandomResolvablePreset(): string {
  const MAX_ATTEMPTS = 20;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const config = generateRandomConfig();
    if (isResolvablePreset(config)) {
      return encodePreset(config);
    }
  }
  // Extremely unlikely: pin the two color fields to known-good values and keep
  // the rest of the last roll.
  const config = generateRandomConfig();
  config.baseColor = firstResolvable(PRESET_BASE_COLORS, "neutral");
  config.theme = firstResolvable(PRESET_THEMES, "neutral");
  if (!getTheme(config.chartColor)) config.chartColor = config.theme;
  return encodePreset(config);
}

function firstResolvable<T extends string>(
  values: readonly T[],
  fallback: T,
): T {
  for (const value of values) {
    if (getTheme(value)) return value;
  }
  return fallback;
}

export function isBaseColor(name: string): boolean {
  return BASE_COLOR_NAMES.has(name);
}
