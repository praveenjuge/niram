// Full Tailwind color palette grid — every family/scale plus the unscaled
// neutrals (white, black, transparent).

import { TAILWIND_COLOR_FAMILIES, TAILWIND_COLOR_SCALES } from "../../colors";
import { applyFont } from "../../fonts";
import { bindFill, bindStrokeColor } from "../bindings";
import { createDesignSystemContext } from "../context";
import {
  createSectionFrame,
  createVertical,
  sectionContentWidth,
} from "../layout";
import { solidPaint } from "../paints";
import type { DesignSystemInputs } from "../types";
import { countDescendants } from "../utils";

export async function addTailwindPalette(
  page: PageNode,
  inputs: DesignSystemInputs,
): Promise<number> {
  const ctx = createDesignSystemContext(inputs);
  const section = createSectionFrame("Tailwind palette", undefined, ctx);

  const stack = createVertical(section, 2);
  const rowWidth = sectionContentWidth();
  const labelWidth = 56;
  const rowHeight = 24; // each scale row is exactly this tall

  // Header row: the scale numbers (50…950) printed once across the columns
  // instead of repeated inside every swatch. A spacer matches the family-label
  // column so the numbers sit directly above their swatch columns.
  const header = figma.createFrame();
  header.layoutMode = "HORIZONTAL";
  header.itemSpacing = 0;
  header.fills = [];
  header.resize(rowWidth, 14);
  header.primaryAxisSizingMode = "FIXED";
  header.counterAxisSizingMode = "FIXED";
  header.counterAxisAlignItems = "CENTER";

  const spacer = figma.createText();
  spacer.characters = "";
  spacer.fontSize = 9;
  applyFont(spacer, "body", "Medium");
  spacer.resize(labelWidth, 12);
  header.appendChild(spacer);

  for (const scale of TAILWIND_COLOR_SCALES) {
    const tag = figma.createText();
    tag.characters = scale;
    tag.fontSize = 9;
    applyFont(tag, "body", "Medium");
    bindFill(tag, ctx.mutedForeground, 0.4);
    tag.textAlignHorizontal = "CENTER";
    tag.textAutoResize = "HEIGHT";
    tag.layoutGrow = 1;
    tag.layoutAlign = "STRETCH";
    header.appendChild(tag);
  }
  stack.appendChild(header);

  for (const family of TAILWIND_COLOR_FAMILIES) {
    const row = figma.createFrame();
    row.layoutMode = "HORIZONTAL";
    row.itemSpacing = 0;
    row.fills = [];
    // Pin both axes so the row keeps a consistent height regardless of how
    // tall its children would otherwise size themselves to.
    row.resize(rowWidth, rowHeight);
    row.primaryAxisSizingMode = "FIXED";
    row.counterAxisSizingMode = "FIXED";
    row.counterAxisAlignItems = "CENTER";

    const label = figma.createText();
    label.characters = family;
    label.fontSize = 10;
    applyFont(label, "body", "Medium");
    bindFill(label, ctx.mutedForeground, 0.4);
    label.resize(labelWidth, 16);
    row.appendChild(label);

    for (const scale of TAILWIND_COLOR_SCALES) {
      // Plain rectangle swatch — the scale number now lives in the shared
      // header row, so each cell is a single childless node instead of a
      // frame wrapping a tag text.
      const swatch = figma.createRectangle();
      // Grow horizontally to share the remaining row width and stretch
      // vertically to match the row height.
      swatch.layoutGrow = 1;
      swatch.layoutAlign = "STRETCH";
      bindFill(swatch, inputs.tailwindColors.get(`${family}/${scale}`));

      row.appendChild(swatch);
    }

    stack.appendChild(row);
  }

  // Neutrals that live outside the family table.
  const neutralRow = figma.createFrame();
  neutralRow.layoutMode = "HORIZONTAL";
  neutralRow.primaryAxisSizingMode = "AUTO";
  neutralRow.counterAxisSizingMode = "AUTO";
  neutralRow.itemSpacing = 12;
  neutralRow.fills = [];
  for (const name of ["white", "black", "transparent"]) {
    const cell = createVertical(neutralRow, 4);
    const swatch = figma.createRectangle();
    swatch.resize(56, 24);
    swatch.cornerRadius = 4;
    swatch.strokeWeight = 1;
    swatch.strokes = [solidPaint(0.85)];
    bindStrokeColor(swatch, ctx.border);
    bindFill(swatch, inputs.tailwindColors.get(name));

    const cap = figma.createText();
    cap.characters = name;
    cap.fontSize = 9;
    applyFont(cap, "body", "Medium");
    bindFill(cap, ctx.mutedForeground, 0.4);

    cell.appendChild(swatch);
    cell.appendChild(cap);
  }
  stack.appendChild(neutralRow);

  page.appendChild(section);
  return countDescendants(section);
}
