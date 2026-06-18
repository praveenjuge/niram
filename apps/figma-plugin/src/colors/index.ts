// Color utilities: Tailwind color table, OKLCH parsing/conversion, and Figma
// RGBA helpers. The module is split across focused files; this barrel keeps
// the public API stable for callers that imported from ./colors.

export {
  TAILWIND_COLOR_FAMILIES,
  TAILWIND_COLOR_SCALES,
  type Rgba,
  type TailwindColorFamily,
  type TailwindColorScale,
} from "./types";
export { TAILWIND_COLORS } from "./palette";
export { normalizeColorValue } from "./normalize";
export { findTailwindAlias, findTailwindColor } from "./lookup";
export { parseColor, parseHex, parseOklch } from "./parse";
