// Opacity scale: each token rendered as a faded tile bound to its
// opacity/<name> primitive variable.

import { OPACITY_TOKENS } from "../../primitives";
import { bindFill, bindOpacity } from "../bindings";
import { createDesignSystemContext } from "../context";
import {
  createSectionFrame,
  createSwatchCell,
  createWrappingRow,
} from "../layout";
import type { DesignSystemInputs } from "../types";
import { countDescendants } from "../utils";

export async function addOpacityScale(
  page: PageNode,
  inputs: DesignSystemInputs,
): Promise<number> {
  const ctx = createDesignSystemContext(inputs);
  const section = createSectionFrame("Opacity scale", undefined, ctx);

  const row = createWrappingRow(section, 6);

  for (const token of OPACITY_TOKENS) {
    const tile = createSwatchCell(row, {
      size: 36,
      caption: `${token.name} · ${token.value}%`,
      captionVar: ctx.foreground,
      centered: true,
    });
    tile.cornerRadius = 4;
    bindFill(tile, ctx.primary);
    tile.opacity = Math.max(0.0001, token.value / 100);
    bindOpacity(tile, inputs.primitives.get(`opacity/${token.name}`));
  }

  page.appendChild(section);
  return countDescendants(section);
}
