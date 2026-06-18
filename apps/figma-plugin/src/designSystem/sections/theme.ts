// Theme swatches grouped by purpose (Surfaces, Brand, States, …). Each swatch
// is a split chip showing the light scheme on top and the dark scheme on the
// bottom, so both schemes live in one section instead of two duplicated grids.
// Each half binds its fill to the matching light/dark theme variable, so the
// whole grid updates with the preset.

import { bindFill, bindStrokeColor } from "../bindings";
import { createDesignSystemContext } from "../context";
import { applyFont } from "../../fonts";
import { createSectionFrame, sectionContentWidth } from "../layout";
import { solidPaint } from "../paints";
import type { DesignSystemInputs } from "../types";
import { countDescendants } from "../utils";

// Theme keys grouped the way designers usually scan them. Foreground tokens
// are intentionally omitted — the swatch is just a paint chip, the name lives
// underneath in plain text.
const THEME_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "Surfaces",
    keys: ["background", "card", "popover"],
  },
  {
    title: "Brand",
    keys: ["primary", "secondary", "accent"],
  },
  {
    title: "States",
    keys: ["muted", "destructive"],
  },
  {
    title: "Lines",
    keys: ["border", "input", "ring"],
  },
  {
    title: "Sidebar",
    keys: [
      "sidebar",
      "sidebar-primary",
      "sidebar-accent",
      "sidebar-border",
      "sidebar-ring",
    ],
  },
  {
    title: "Charts",
    keys: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
  },
];

// Tunables for the compact swatch grid.
const SWATCH_WIDTH = 72;
const SWATCH_HALF = 24; // height of each scheme half within a chip
const SWATCH_GAP = 8;
const GROUP_GAP = 16;

export async function addThemeSection(
  page: PageNode,
  inputs: DesignSystemInputs,
): Promise<number> {
  const light = inputs.theme.light;
  const dark = inputs.theme.dark;
  const ctx = createDesignSystemContext(inputs);

  const section = createSectionFrame(
    "Theme",
    {
      title: "Theme",
      subtitle: "Each chip: light (top) · dark (bottom)",
    },
    ctx,
  );

  // Two-column grid of group blocks. The section content width is fixed, so
  // each column gets exactly half (minus the column gap).
  const contentWidth = sectionContentWidth();
  const columnGap = 24;
  const columnWidth = Math.floor((contentWidth - columnGap) / 2);

  const grid = figma.createFrame();
  grid.layoutMode = "HORIZONTAL";
  grid.layoutWrap = "WRAP";
  grid.itemSpacing = columnGap;
  grid.counterAxisSpacing = GROUP_GAP;
  grid.fills = [];
  grid.resize(contentWidth, 1);
  grid.primaryAxisSizingMode = "FIXED";
  grid.counterAxisSizingMode = "AUTO";
  section.appendChild(grid);

  for (const group of THEME_GROUPS) {
    const groupBlock = figma.createFrame();
    groupBlock.layoutMode = "VERTICAL";
    groupBlock.itemSpacing = 8;
    groupBlock.fills = [];
    groupBlock.resize(columnWidth, 1);
    groupBlock.primaryAxisSizingMode = "AUTO";
    groupBlock.counterAxisSizingMode = "FIXED";

    const heading = figma.createText();
    applyFont(heading, "heading", "Medium");
    heading.characters = group.title.toUpperCase();
    heading.fontSize = 10;
    heading.lineHeight = { unit: "PIXELS", value: 14 };
    heading.letterSpacing = { unit: "PERCENT", value: 4 };
    bindFill(heading, ctx.mutedForeground, 0.45);
    groupBlock.appendChild(heading);

    const swatchRow = figma.createFrame();
    swatchRow.layoutMode = "HORIZONTAL";
    swatchRow.layoutWrap = "WRAP";
    swatchRow.itemSpacing = SWATCH_GAP;
    swatchRow.counterAxisSpacing = SWATCH_GAP;
    swatchRow.fills = [];
    swatchRow.resize(columnWidth, 1);
    swatchRow.primaryAxisSizingMode = "FIXED";
    swatchRow.counterAxisSizingMode = "AUTO";
    groupBlock.appendChild(swatchRow);

    for (const key of group.keys) {
      const cell = figma.createFrame();
      cell.layoutMode = "VERTICAL";
      cell.itemSpacing = 6;
      cell.fills = [];
      cell.resize(SWATCH_WIDTH, 1);
      cell.primaryAxisSizingMode = "AUTO";
      cell.counterAxisSizingMode = "FIXED";

      // The chip is a vertical auto-layout frame stacking a light half over a
      // dark half. A hairline outline keeps chips that match the page surface
      // (e.g. the literal "background" / near-white "card") visible.
      const chip = figma.createFrame();
      chip.layoutMode = "VERTICAL";
      chip.itemSpacing = 0;
      chip.strokeWeight = 1;
      // Hairline outline so chips matching the page surface stay visible. The
      // literal is a fallback; bind it to the theme `border` when available.
      chip.strokes = [solidPaint(0.85)];
      bindStrokeColor(chip, ctx.border);
      chip.resize(SWATCH_WIDTH, SWATCH_HALF * 2);
      chip.primaryAxisSizingMode = "FIXED";
      chip.counterAxisSizingMode = "FIXED";
      chip.clipsContent = true;

      const lightHalf = figma.createRectangle();
      lightHalf.resize(SWATCH_WIDTH, SWATCH_HALF);
      lightHalf.layoutAlign = "STRETCH";
      bindFill(lightHalf, light.get(key));
      chip.appendChild(lightHalf);

      const darkHalf = figma.createRectangle();
      darkHalf.resize(SWATCH_WIDTH, SWATCH_HALF);
      darkHalf.layoutAlign = "STRETCH";
      bindFill(darkHalf, dark.get(key));
      chip.appendChild(darkHalf);

      cell.appendChild(chip);

      const caption = figma.createText();
      applyFont(caption, "body", "Regular");
      caption.characters = key;
      caption.fontSize = 9;
      bindFill(caption, ctx.mutedForeground, 0.35);
      cell.appendChild(caption);

      swatchRow.appendChild(cell);
    }

    grid.appendChild(groupBlock);
  }

  page.appendChild(section);
  return countDescendants(section);
}
