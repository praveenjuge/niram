// A small theme/style context for the Design System region. It snapshots the
// handful of `shadcn / Theme` (light) variables the shared chrome — section
// frames, headings, subtitles, subsection labels, table labels, swatch
// captions, dividers, and chip outlines — should bind to instead of baking
// literal gray paints. Showcase nodes that intentionally demonstrate a literal
// (raw Tailwind swatches, RGBA blur samples) keep their literal paints.
//
// Kept inside `designSystem` and passed through the existing layout helpers; it
// does not wrap or re-derive any generator output, it only looks up variables
// the generator already published.

import type { DesignSystemInputs } from "./types";

export type DesignSystemContext = {
  // Surfaces.
  background?: Variable;
  card?: Variable;
  // Text.
  foreground?: Variable;
  mutedForeground?: Variable;
  // Lines (outlines, dividers, chip borders).
  border?: Variable;
  input?: Variable;
  // The brand color used by demo swatches/bars.
  primary?: Variable;
};

// Snapshot the light-scheme theme variables the chrome binds to. Each lookup is
// best-effort — a missing variable just leaves the helper to fall back to its
// literal tone, so this never throws on a sparse theme map.
export function createDesignSystemContext(
  inputs: DesignSystemInputs,
): DesignSystemContext {
  const light = inputs.theme.light;
  return {
    background: light.get("background"),
    card: light.get("card"),
    foreground: light.get("foreground"),
    mutedForeground: light.get("muted-foreground"),
    border: light.get("border"),
    input: light.get("input"),
    primary: light.get("primary"),
  };
}
