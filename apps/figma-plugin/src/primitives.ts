// Numeric / string primitive tokens. Values mirror Tailwind v4 defaults
// and the structure defined in Default.tokens.json (DTCG / Figma export).

export type NumberToken = { name: string; value: number };
export type StringToken = { name: string; value: string };

export const RADIUS_TOKENS: NumberToken[] = [
  { name: "none", value: 0 },
  { name: "xs", value: 2 },
  { name: "sm", value: 4 },
  { name: "md", value: 6 },
  { name: "lg", value: 8 },
  { name: "xl", value: 12 },
  { name: "2xl", value: 16 },
  { name: "3xl", value: 24 },
  { name: "4xl", value: 32 },
  { name: "full", value: 9999 },
];

// shadcn's create-preset radius option sets a single `--radius` length and
// derives every semantic `rounded-*` step directly from that base. These are
// deliberately separate from Tailwind's fixed RADIUS_TOKENS above: the two
// scales happen to have similar names but do not share the same values.
export const DEFAULT_RADIUS_PX = 10;

const SHADCN_RADIUS_MULTIPLIERS: NumberToken[] = [
  { name: "sm", value: 0.6 },
  { name: "md", value: 0.8 },
  { name: "lg", value: 1 },
  { name: "xl", value: 1.4 },
  { name: "2xl", value: 1.8 },
  { name: "3xl", value: 2.2 },
  { name: "4xl", value: 2.6 },
];

// Resolve the exact semantic scale from the already-decoded base radius. Using
// the resolved CSS value as the input keeps the registry's `--radius` token as
// the single source of truth and mirrors shadcn's current @theme multipliers.
export function shadcnRadiusScale(baseRadiusPx: number): NumberToken[] {
  return SHADCN_RADIUS_MULTIPLIERS.map((token) => ({
    name: token.name,
    value: Math.round(baseRadiusPx * token.value * 100) / 100,
  }));
}

export const BORDER_WIDTH_TOKENS: NumberToken[] = [
  { name: "0", value: 0 },
  { name: "1", value: 1 },
  { name: "2", value: 2 },
  { name: "4", value: 4 },
  { name: "8", value: 8 },
];

export const OPACITY_TOKENS: NumberToken[] = [
  { name: "0", value: 0 },
  { name: "5", value: 5 },
  { name: "10", value: 10 },
  { name: "15", value: 15 },
  { name: "20", value: 20 },
  { name: "25", value: 25 },
  { name: "30", value: 30 },
  { name: "35", value: 35 },
  { name: "40", value: 40 },
  { name: "45", value: 45 },
  { name: "50", value: 50 },
  { name: "55", value: 55 },
  { name: "60", value: 60 },
  { name: "65", value: 65 },
  { name: "70", value: 70 },
  { name: "75", value: 75 },
  { name: "80", value: 80 },
  { name: "85", value: 85 },
  { name: "90", value: 90 },
  { name: "95", value: 95 },
  { name: "100", value: 100 },
];

export const BLUR_TOKENS: NumberToken[] = [
  { name: "none", value: 0 },
  { name: "xs", value: 4 },
  { name: "sm", value: 8 },
  { name: "md", value: 12 },
  { name: "lg", value: 16 },
  { name: "xl", value: 24 },
  { name: "2xl", value: 40 },
  { name: "3xl", value: 64 },
];

export const SKEW_TOKENS: NumberToken[] = [
  { name: "0", value: 0 },
  { name: "1", value: 1 },
  { name: "2", value: 2 },
  { name: "3", value: 3 },
  { name: "6", value: 6 },
  { name: "12", value: 12 },
];

export const BREAKPOINT_TOKENS: NumberToken[] = [
  { name: "sm", value: 640 },
  { name: "md", value: 768 },
  { name: "lg", value: 1024 },
  { name: "xl", value: 1280 },
  { name: "2xl", value: 1536 },
];

export const CONTAINER_TOKENS: NumberToken[] = [
  { name: "0", value: 0 },
  { name: "3xs", value: 256 },
  { name: "2xs", value: 288 },
  { name: "xs", value: 320 },
  { name: "sm", value: 384 },
  { name: "md", value: 448 },
  { name: "lg", value: 512 },
  { name: "xl", value: 576 },
  { name: "2xl", value: 672 },
  { name: "3xl", value: 768 },
  { name: "4xl", value: 896 },
  { name: "5xl", value: 1024 },
  { name: "6xl", value: 1152 },
  { name: "7xl", value: 1280 },
];

export const SPACING_TOKENS: NumberToken[] = [
  { name: "0", value: 0 },
  { name: "px", value: 1 },
  { name: "0-5", value: 2 },
  { name: "1", value: 4 },
  { name: "1-5", value: 6 },
  { name: "2", value: 8 },
  { name: "2-5", value: 10 },
  { name: "3", value: 12 },
  { name: "3-5", value: 14 },
  { name: "4", value: 16 },
  { name: "5", value: 20 },
  { name: "6", value: 24 },
  { name: "7", value: 28 },
  { name: "8", value: 32 },
  { name: "9", value: 36 },
  { name: "10", value: 40 },
  { name: "11", value: 44 },
  { name: "12", value: 48 },
  { name: "14", value: 56 },
  { name: "16", value: 64 },
  { name: "20", value: 80 },
  { name: "24", value: 96 },
  { name: "28", value: 112 },
  { name: "32", value: 128 },
  { name: "36", value: 144 },
  { name: "40", value: 160 },
  { name: "44", value: 176 },
  { name: "48", value: 192 },
  { name: "52", value: 208 },
  { name: "56", value: 224 },
  { name: "60", value: 240 },
  { name: "64", value: 256 },
  { name: "72", value: 288 },
  { name: "80", value: 320 },
  { name: "96", value: 384 },
];

export const FONT_SIZE_TOKENS: NumberToken[] = [
  { name: "xs", value: 12 },
  { name: "sm", value: 14 },
  { name: "base", value: 16 },
  { name: "lg", value: 18 },
  { name: "xl", value: 20 },
  { name: "2xl", value: 24 },
  { name: "3xl", value: 30 },
  { name: "4xl", value: 36 },
  { name: "5xl", value: 48 },
  { name: "6xl", value: 60 },
  { name: "7xl", value: 72 },
  { name: "8xl", value: 96 },
  { name: "9xl", value: 128 },
];

export const FONT_WEIGHT_TOKENS: NumberToken[] = [
  { name: "thin", value: 100 },
  { name: "extralight", value: 200 },
  { name: "light", value: 300 },
  { name: "normal", value: 400 },
  { name: "medium", value: 500 },
  { name: "semibold", value: 600 },
  { name: "bold", value: 700 },
  { name: "extrabold", value: 800 },
  { name: "black", value: 900 },
];

export const FONT_TRACKING_TOKENS: NumberToken[] = [
  { name: "tighter", value: -0.8 },
  { name: "tight", value: -0.4 },
  { name: "normal", value: 0 },
  { name: "wide", value: 0.4 },
  { name: "wider", value: 0.8 },
  { name: "widest", value: 1.6 },
];

export const FONT_LEADING_TOKENS: NumberToken[] = [
  { name: "3", value: 12 },
  { name: "4", value: 16 },
  { name: "5", value: 20 },
  { name: "6", value: 24 },
  { name: "7", value: 28 },
  { name: "8", value: 32 },
  { name: "9", value: 36 },
  { name: "10", value: 40 },
];

// Default fonts. The selected preset's font replaces "sans"; "serif" and
// "mono" stay constant unless the preset font is itself a serif/mono.
export const DEFAULT_FONT_FAMILY: StringToken[] = [
  { name: "sans", value: "Inter" },
  { name: "serif", value: "Georgia" },
  { name: "mono", value: "Menlo" },
];

export const FONT_STYLE_TOKENS: StringToken[] = [
  { name: "italic", value: "italic" },
  { name: "not-italic", value: "normal" },
];

// Maps a shadcn preset font slug to a Figma-friendly font family name.
// Keep this conservative — Figma will substitute if the font isn't loaded.
export const PRESET_FONT_FAMILY_MAP: Record<string, string> = {
  inter: "Inter",
  "noto-sans": "Noto Sans",
  "nunito-sans": "Nunito Sans",
  figtree: "Figtree",
  roboto: "Roboto",
  raleway: "Raleway",
  "dm-sans": "DM Sans",
  "public-sans": "Public Sans",
  outfit: "Outfit",
  "jetbrains-mono": "JetBrains Mono",
  geist: "Geist",
  "geist-mono": "Geist Mono",
  lora: "Lora",
  merriweather: "Merriweather",
  "playfair-display": "Playfair Display",
  "noto-serif": "Noto Serif",
  "roboto-slab": "Roboto Slab",
  oxanium: "Oxanium",
  manrope: "Manrope",
  "space-grotesk": "Space Grotesk",
  montserrat: "Montserrat",
  "ibm-plex-sans": "IBM Plex Sans",
  "source-sans-3": "Source Sans 3",
  "instrument-sans": "Instrument Sans",
  "eb-garamond": "EB Garamond",
  "instrument-serif": "Instrument Serif",
};

const SERIF_FONT_SLUGS = new Set([
  "lora",
  "merriweather",
  "playfair-display",
  "noto-serif",
  "roboto-slab",
  "eb-garamond",
  "instrument-serif",
]);

const MONO_FONT_SLUGS = new Set(["jetbrains-mono", "geist-mono"]);

export function fontSlugBucket(slug: string): "sans" | "serif" | "mono" {
  if (MONO_FONT_SLUGS.has(slug)) return "mono";
  if (SERIF_FONT_SLUGS.has(slug)) return "serif";
  return "sans";
}

// Resolve a shadcn preset font slug to a Figma-friendly family name. Unknown
// slugs (and an empty slug) fall back to Inter, which Figma always ships.
export function presetFontFamily(slug: string | undefined): string {
  if (!slug) return "Inter";
  return PRESET_FONT_FAMILY_MAP[slug] ?? "Inter";
}

// The two fonts a shadcn "create preset" run can pick: a body font and a
// heading font. Heading "inherit" (the default) reuses the body font, matching
// shadcn's own resolution.
export type ResolvedFonts = {
  body: string;
  heading: string;
};

export function resolveFonts(
  bodySlug: string | undefined,
  headingSlug: string | undefined,
): ResolvedFonts {
  const body = presetFontFamily(bodySlug);
  const heading =
    !headingSlug || headingSlug === "inherit"
      ? body
      : presetFontFamily(headingSlug);
  return { body, heading };
}
