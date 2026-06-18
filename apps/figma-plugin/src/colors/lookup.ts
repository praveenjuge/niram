// Map any color value back to a Tailwind alias (family/scale, white, black,
// transparent) so the generator can create Figma variable aliases instead of
// literal RGB fills.

import { normalizeColorValue } from "./normalize";
import { TAILWIND_COLORS } from "./palette";
import {
  TAILWIND_COLOR_FAMILIES,
  TAILWIND_COLOR_SCALES,
  type TailwindColorFamily,
  type TailwindColorScale,
} from "./types";

// Build the OKLCH → family lookup once at module load.
const OKLCH_TO_FAMILY = new Map<string, TailwindColorFamily>();
for (const family of TAILWIND_COLOR_FAMILIES) {
  for (const scale of TAILWIND_COLOR_SCALES) {
    OKLCH_TO_FAMILY.set(
      normalizeColorValue(TAILWIND_COLORS[family][scale]),
      family,
    );
  }
}

// Returns the Tailwind variable-map key when the color matches a Tailwind
// entry, or null otherwise. The key is "family/scale" for shades or
// "white" / "black" / "transparent" for the unscaled neutrals.
//
// Refuses to alias values with partial alpha. Figma aliases can't carry an
// alpha override, so aliasing `oklch(1 0 0 / 10%)` to `white` would silently
// drop the transparency.
export function findTailwindAlias(value: string | undefined): string | null {
  if (!value) return null;

  // Hex shortcuts so callers don't need to round-trip through OKLCH.
  const trimmedHex = value.trim().toLowerCase();
  if (trimmedHex === "#ffffff" || trimmedHex === "#fff") return "white";
  if (trimmedHex === "#000000" || trimmedHex === "#000") return "black";

  const normalized = normalizeColorValue(value);
  if (!normalized) return null;

  // Detect explicit alpha (the normalizer keeps it after a `/`).
  const alphaMatch = normalized.match(/\/\s*([^)]+)\)$/);
  if (alphaMatch) {
    const alpha = parseFloat(alphaMatch[1]!);
    if (Number.isNaN(alpha)) return null;
    if (alpha === 0) return "transparent";
    if (alpha !== 1) return null;
  }

  const noAlpha = normalized.replace(/\s*\/\s*[^)]+\)$/, ")");

  // Pure white and black sit outside the family table on purpose — they're
  // not part of any Tailwind shade — so we check them explicitly.
  if (noAlpha === "oklch(1 0 0)") return "white";
  if (noAlpha === "oklch(0 0 0)") return "black";

  const family = OKLCH_TO_FAMILY.get(noAlpha);
  if (!family) return null;
  for (const scale of TAILWIND_COLOR_SCALES) {
    if (normalizeColorValue(TAILWIND_COLORS[family][scale]) === noAlpha) {
      return `${family}/${scale}`;
    }
  }
  return null;
}

// Legacy name kept so the generator's call site stays small.
export function findTailwindColor(
  value: string | undefined,
): { family: TailwindColorFamily; scale: TailwindColorScale } | null {
  const key = findTailwindAlias(value);
  if (!key) return null;
  const slash = key.indexOf("/");
  if (slash === -1) return null;
  return {
    family: key.slice(0, slash) as TailwindColorFamily,
    scale: key.slice(slash + 1) as TailwindColorScale,
  };
}
