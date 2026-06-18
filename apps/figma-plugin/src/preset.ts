// Mirror of shadcn's preset codec (packages/shadcn/src/preset/preset.ts).
// Kept in sync with v2 ("b") — backward compatible with v1 ("a").
// We use it on the UI side to validate input before hitting the network.

export const PRESET_BASES = ["radix", "base"] as const;

export const PRESET_STYLES = [
  "nova",
  "vega",
  "maia",
  "lyra",
  "mira",
  "luma",
  "sera",
  "rhea",
] as const;

export const PRESET_BASE_COLORS = [
  "neutral",
  "stone",
  "zinc",
  "gray",
  "mauve",
  "olive",
  "mist",
  "taupe",
] as const;

export const PRESET_THEMES = [
  "neutral",
  "stone",
  "zinc",
  "gray",
  "amber",
  "blue",
  "cyan",
  "emerald",
  "fuchsia",
  "green",
  "indigo",
  "lime",
  "orange",
  "pink",
  "purple",
  "red",
  "rose",
  "sky",
  "teal",
  "violet",
  "yellow",
  "mauve",
  "olive",
  "mist",
  "taupe",
] as const;

// Before v2, base-color themes shipped colored chart palettes borrowed from
// these colored themes. Mirrors shadcn's V1_CHART_COLOR_MAP — used to restore
// the original chart colors when decoding legacy v1 ("a") presets, which had
// no separate chartColor field.
export const V1_CHART_COLOR_MAP: Record<string, string> = {
  neutral: "blue",
  stone: "lime",
  zinc: "amber",
  mauve: "emerald",
  olive: "violet",
  mist: "rose",
  taupe: "cyan",
};

export const PRESET_ICON_LIBRARIES = [
  "lucide",
  "hugeicons",
  "tabler",
  "phosphor",
  "remixicon",
] as const;

export const PRESET_FONTS = [
  "inter",
  "noto-sans",
  "nunito-sans",
  "figtree",
  "roboto",
  "raleway",
  "dm-sans",
  "public-sans",
  "outfit",
  "jetbrains-mono",
  "geist",
  "geist-mono",
  "lora",
  "merriweather",
  "playfair-display",
  "noto-serif",
  "roboto-slab",
  "oxanium",
  "manrope",
  "space-grotesk",
  "montserrat",
  "ibm-plex-sans",
  "source-sans-3",
  "instrument-sans",
  "eb-garamond",
  "instrument-serif",
] as const;

export const PRESET_FONT_HEADINGS = ["inherit", ...PRESET_FONTS] as const;

export const PRESET_RADII = [
  "default",
  "none",
  "small",
  "medium",
  "large",
] as const;

export const PRESET_MENU_ACCENTS = ["subtle", "bold"] as const;
export const PRESET_MENU_COLORS = [
  "default",
  "inverted",
  "default-translucent",
  "inverted-translucent",
] as const;

const PRESET_FIELDS_V1 = [
  { key: "menuColor", values: PRESET_MENU_COLORS, bits: 3 },
  { key: "menuAccent", values: PRESET_MENU_ACCENTS, bits: 3 },
  { key: "radius", values: PRESET_RADII, bits: 4 },
  { key: "font", values: PRESET_FONTS, bits: 6 },
  { key: "iconLibrary", values: PRESET_ICON_LIBRARIES, bits: 6 },
  { key: "theme", values: PRESET_THEMES, bits: 6 },
  { key: "baseColor", values: PRESET_BASE_COLORS, bits: 6 },
  { key: "style", values: PRESET_STYLES, bits: 6 },
] as const;

const PRESET_FIELDS_V2 = [
  ...PRESET_FIELDS_V1,
  { key: "chartColor", values: PRESET_THEMES, bits: 6 },
  { key: "fontHeading", values: PRESET_FONT_HEADINGS, bits: 5 },
] as const;

export type PresetConfig = {
  style: (typeof PRESET_STYLES)[number];
  baseColor: (typeof PRESET_BASE_COLORS)[number];
  theme: (typeof PRESET_THEMES)[number];
  chartColor: (typeof PRESET_THEMES)[number];
  iconLibrary: (typeof PRESET_ICON_LIBRARIES)[number];
  font: (typeof PRESET_FONTS)[number];
  fontHeading: (typeof PRESET_FONT_HEADINGS)[number];
  radius: (typeof PRESET_RADII)[number];
  menuAccent: (typeof PRESET_MENU_ACCENTS)[number];
  menuColor: (typeof PRESET_MENU_COLORS)[number];
};

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const VALID_VERSIONS = ["a", "b"] as const;

// Codes we mint here always use the current v2 ("b") format, matching
// shadcn's encodePreset().
const CURRENT_VERSION = "b";

function fromBase62(str: string): number {
  let result = 0;
  for (const ch of str) {
    const idx = BASE62.indexOf(ch);
    if (idx === -1) return -1;
    result = result * 62 + idx;
  }
  return result;
}

function toBase62(num: number): string {
  if (num === 0) return "0";
  let result = "";
  let n = num;
  while (n > 0) {
    result = BASE62[n % 62]! + result;
    n = Math.floor(n / 62);
  }
  return result;
}

// Default config = the first value of every field, mirroring shadcn's
// DEFAULT_PRESET_CONFIG. Used to backfill missing keys when encoding a
// partial config.
function defaultPresetConfig(): PresetConfig {
  const out: Record<string, string> = {};
  for (const field of PRESET_FIELDS_V2) {
    out[field.key] = field.values[0]!;
  }
  return out as unknown as PresetConfig;
}

export function isPresetCode(value: string): boolean {
  if (!value || value.length < 2 || value.length > 10) return false;
  if (!VALID_VERSIONS.includes(value[0] as (typeof VALID_VERSIONS)[number])) {
    return false;
  }
  for (let i = 1; i < value.length; i++) {
    if (BASE62.indexOf(value[i]!) === -1) return false;
  }
  return true;
}

// Extract a preset code from common copy-paste sources:
//   "b3HGM2E529"
//   "--preset b3HGM2E529"
//   "--preset=b3HGM2E529"
//   "npx shadcn@latest init --preset b3HGM2E529"
//   "pnpm dlx shadcn@latest init --preset=b3HGM2E529"
//   "https://ui.shadcn.com/init?preset=b3HGM2E529"
// Returns the bare code, or null if nothing valid is found.
export function extractPresetCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Fast path — the user pasted just the code.
  if (isPresetCode(trimmed)) return trimmed;

  // Pull the value off a flag (`--preset <code>` or `--preset=<code>`) or a
  // query param (`?preset=<code>` / `&preset=<code>`). We deliberately don't
  // do a bare-token scan to avoid false positives on regular English words
  // (e.g. "at" passes the version-prefix + base62 shape).
  const candidates: string[] = [];

  for (const match of trimmed.matchAll(/--preset[=\s]+([^\s&"'`]+)/g)) {
    candidates.push(match[1]!);
  }
  for (const match of trimmed.matchAll(/[?&]preset=([^\s&"'`]+)/g)) {
    candidates.push(match[1]!);
  }

  for (const candidate of candidates) {
    if (isPresetCode(candidate)) return candidate;
  }

  return null;
}

export function decodePreset(code: string): PresetConfig | null {
  if (!isPresetCode(code)) return null;
  const version = code[0]!;
  const fields = version === "a" ? PRESET_FIELDS_V1 : PRESET_FIELDS_V2;
  const bits = fromBase62(code.slice(1));
  if (bits < 0) return null;

  // Strict: real shadcn codes only set bits within the encoded field range.
  // A code with extra high bits is junk (e.g. "b" + a random base62 string).
  const totalBits = fields.reduce((sum, field) => sum + field.bits, 0);
  if (bits >= 2 ** totalBits) return null;

  const out: Record<string, string> = {};
  let offset = 0;
  for (const field of fields) {
    const idx = Math.floor(bits / 2 ** offset) % 2 ** field.bits;
    // Strict: real codes only use indices that map to defined values. The
    // encoder never produces out-of-range indices, so anything past
    // values.length means the input wasn't generated by shadcn.
    if (idx >= field.values.length) return null;
    out[field.key] = field.values[idx]!;
    offset += field.bits;
  }
  if (version === "a") {
    out.fontHeading = "inherit";
    // v1 had no chartColor field. shadcn restores the original colored chart
    // palettes for base-color themes (neutral→blue, etc.) and otherwise reuses
    // the theme's own charts.
    out.chartColor = V1_CHART_COLOR_MAP[out.theme!] ?? out.theme!;
  }
  return out as unknown as PresetConfig;
}

// Encode a (possibly partial) PresetConfig into a short v2 ("b") code.
// Mirrors shadcn's encodePreset(): multiplication is used instead of bitwise
// ops because JS bitwise truncates to 32 bits and the packed value is wider.
export function encodePreset(config: Partial<PresetConfig>): string {
  const merged: Record<string, string> =
    defaultPresetConfig() as unknown as Record<string, string>;
  for (const key of Object.keys(config)) {
    const value = (config as Record<string, string | undefined>)[key];
    if (value !== undefined) merged[key] = value;
  }

  let bits = 0;
  let offset = 0;
  for (const field of PRESET_FIELDS_V2) {
    const values = field.values as readonly string[];
    const idx = values.indexOf(merged[field.key]!);
    bits += (idx === -1 ? 0 : idx) * 2 ** offset;
    offset += field.bits;
  }

  return CURRENT_VERSION + toBase62(bits);
}

// Pick a uniformly random PresetConfig across every encoded field.
export function generateRandomConfig(): PresetConfig {
  const out: Record<string, string> = {};
  for (const field of PRESET_FIELDS_V2) {
    const values = field.values as readonly string[];
    out[field.key] = values[Math.floor(Math.random() * values.length)]!;
  }
  return out as unknown as PresetConfig;
}

// Generate a random, valid v2 preset code. Mirrors shadcn's
// generateRandomPreset() — the shuffle button in ui.shadcn.com/create.
export function generateRandomPreset(): string {
  return encodePreset(generateRandomConfig());
}
