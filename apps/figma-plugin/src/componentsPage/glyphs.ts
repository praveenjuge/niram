// Font-free vector glyphs shared by the Components page sections.
//
// Some UI affordances (dialog/sheet close buttons) render a small "✕". Drawing
// that as a text glyph is dangerous: "✕" (U+2715) lives in the Unicode Dingbats
// block, which preset body fonts and Inter don't cover, so Figma substitutes an
// unloaded symbol font ("Noto Sans Symbols2"). Because those text nodes bind
// fontFamily to the `font-sans` variable, a re-run's setValueForMode then
// re-validates the bound node's fonts and throws on the unloaded fallback.
//
// Rendering the X as a vector avoids fonts entirely, so there is no glyph
// substitution and no binding to break on re-run.

import { bindStrokeColor } from "./bindings";

// A square "X" stroke glyph (two diagonals), tinted to a theme colour variable.
// Mirrors lucide's `XIcon`: 16px, 1.5 stroke, round caps/joins.
export function createCloseGlyph(
  variable: Variable | undefined,
  size: number = 16,
): VectorNode {
  const glyph = figma.createVector();
  glyph.name = "Icon";
  glyph.resize(size, size);
  // lucide X viewBox is 24×24 with the strokes inset to ~6..18; scale that to
  // the requested size so the cross keeps its padding.
  const lo = (size * 6) / 24;
  const hi = (size * 18) / 24;
  glyph.vectorPaths = [
    {
      windingRule: "NONZERO",
      data: `M ${lo} ${lo} L ${hi} ${hi} M ${hi} ${lo} L ${lo} ${hi}`,
    },
  ];
  glyph.strokeWeight = 1.5;
  glyph.strokeCap = "ROUND";
  glyph.strokeJoin = "ROUND";
  glyph.fills = [];
  bindStrokeColor(glyph, variable);
  return glyph;
}
