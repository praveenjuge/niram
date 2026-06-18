// Border width scale: outlined tile per token bound to border-width
// primitive variables.

import { BORDER_WIDTH_TOKENS } from "../../primitives";
import { bindStrokeColor, bindStrokeWeight } from "../bindings";
import { createDesignSystemContext } from "../context";
import {
  createSectionFrame,
  createSwatchCell,
  createWrappingRow,
} from "../layout";
import { solidPaint } from "../paints";
import type { DesignSystemInputs } from "../types";
import { countDescendants } from "../utils";

export async function addBorderWidthScale(
  page: PageNode,
  inputs: DesignSystemInputs,
): Promise<number> {
  const ctx = createDesignSystemContext(inputs);
  const section = createSectionFrame("Border widths", undefined, ctx);

  const row = createWrappingRow(section, 16);

  for (const token of BORDER_WIDTH_TOKENS) {
    const tile = createSwatchCell(row, {
      size: 72,
      caption: `${token.name} · ${token.value}px`,
      captionVar: ctx.foreground,
    });
    tile.cornerRadius = 6;
    tile.fills = [];
    tile.strokes = [solidPaint(0.4)];
    tile.strokeWeight = Math.max(token.value, 1);
    // Use the theme primary color so the borders pick up the active palette.
    bindStrokeColor(tile, ctx.primary);
    bindStrokeWeight(tile, inputs.primitives.get(`border-width/${token.name}`));
  }

  page.appendChild(section);
  return countDescendants(section);
}
