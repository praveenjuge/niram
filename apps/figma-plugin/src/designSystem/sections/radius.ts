// Border radius scale: tile per token, corners bound to radius variables.

import { RADIUS_TOKENS } from "../../primitives";
import { bindCornerRadii, bindFill } from "../bindings";
import { createDesignSystemContext } from "../context";
import {
  createSectionFrame,
  createSwatchCell,
  createWrappingRow,
} from "../layout";
import type { DesignSystemInputs } from "../types";
import { countDescendants } from "../utils";

export async function addRadiusScale(
  page: PageNode,
  inputs: DesignSystemInputs,
): Promise<number> {
  const ctx = createDesignSystemContext(inputs);
  const section = createSectionFrame("Border radius", undefined, ctx);

  const row = createWrappingRow(section, 16);

  // This is the fixed Tailwind radius reference scale (the `radius/*`
  // primitives). It does not change with the preset — the preset's chosen
  // `--radius` drives the separate shadcn radius scale that components bind to.
  for (const token of RADIUS_TOKENS) {
    const tile = createSwatchCell(row, {
      size: 72,
      caption: `${token.name} · ${token.value}px`,
      captionVar: ctx.foreground,
    });
    bindFill(tile, ctx.primary);
    const radius = Math.min(token.value, 36);
    tile.topLeftRadius = radius;
    tile.topRightRadius = radius;
    tile.bottomLeftRadius = radius;
    tile.bottomRightRadius = radius;
    bindCornerRadii(tile, inputs.primitives.get(`radius/${token.name}`));
  }

  page.appendChild(section);
  return countDescendants(section);
}
