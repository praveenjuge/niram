// Layout helpers shared by the Design System page sections.

import { bindFill } from "./bindings";
import type { DesignSystemContext } from "./context";
import { applyFont } from "../fonts";
import { SECTION_WIDTH } from "./types";

export function sectionContentWidth(): number {
  // Section frame total width minus its 24px horizontal padding on each side.
  return SECTION_WIDTH - 48;
}

export function createSectionFrame(
  name: string,
  meta?: { title?: string; titleSize?: number; subtitle?: string },
  ctx?: DesignSystemContext,
): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "FIXED";
  frame.itemSpacing = 16;
  frame.paddingTop = 16;
  frame.paddingBottom = 16;
  frame.paddingLeft = 16;
  frame.paddingRight = 16;
  // The section card binds to the theme `card` surface (white-ish in light
  // mode) so the page chrome follows the preset. Falls back to a literal white
  // when no context/variable is available (older callers/tests).
  bindFill(frame, ctx?.card ?? ctx?.background, 1);
  frame.resize(SECTION_WIDTH, 100);
  // Clip so oversized children (large font sizes, shadow bleed at edges)
  // stay inside the rounded card. Sections that need bleed compensate by
  // adding internal padding on their inner rows instead.
  frame.clipsContent = true;

  const heading = figma.createText();
  applyFont(heading, "heading", "Semi Bold");
  heading.characters = meta?.title ?? name;
  heading.fontSize = meta?.titleSize ?? 16;
  bindFill(heading, ctx?.foreground, 0.1);
  frame.appendChild(heading);

  if (meta?.subtitle) {
    const sub = figma.createText();
    applyFont(sub, "body", "Regular");
    sub.characters = meta.subtitle;
    sub.fontSize = 12;
    bindFill(sub, ctx?.mutedForeground, 0.4);
    frame.appendChild(sub);
  }

  return frame;
}

export function createSubSection(
  parent: FrameNode,
  title: string,
  ctx?: DesignSystemContext,
): FrameNode {
  const frame = figma.createFrame();
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = 8;
  frame.fills = [];

  const heading = figma.createText();
  applyFont(heading, "heading", "Medium");
  heading.characters = title;
  heading.fontSize = 12;
  bindFill(heading, ctx?.mutedForeground, 0.3);

  frame.appendChild(heading);
  parent.appendChild(frame);
  return frame;
}

// Create a horizontal row whose width matches the parent's content area, so
// children can wrap predictably. Used for radius / shadow / blur grids.
export function createWrappingRow(
  parent: FrameNode,
  spacing: number,
): FrameNode {
  const frame = figma.createFrame();
  frame.layoutMode = "HORIZONTAL";
  frame.itemSpacing = spacing;
  frame.fills = [];
  const width =
    (parent.width || SECTION_WIDTH) -
    ((parent.paddingLeft ?? 0) + (parent.paddingRight ?? 0));
  frame.resize(Math.max(width, 100), 1);
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "AUTO";
  frame.layoutWrap = "WRAP";
  frame.counterAxisSpacing = spacing;
  parent.appendChild(frame);
  return frame;
}

// A single scale tile: a rectangle swatch plus one caption underneath, wrapped
// in a hugging vertical cell. Shared by the radius / opacity / border-width
// scales (they only differed in tile size, caption text, and centering), so
// each item is one rectangle + one text node instead of a frame tile + two
// labels. Returns the rectangle so the caller can apply fills/strokes/radii and
// bind the matching primitive variable.
export function createSwatchCell(
  parent: FrameNode,
  opts: {
    size: number;
    caption: string;
    captionVar?: Variable;
    centered?: boolean;
  },
): RectangleNode {
  const cell = figma.createFrame();
  cell.layoutMode = "VERTICAL";
  cell.itemSpacing = 6;
  cell.fills = [];
  cell.primaryAxisSizingMode = "AUTO";
  cell.counterAxisSizingMode = "AUTO";
  if (opts.centered) cell.counterAxisAlignItems = "CENTER";

  const tile = figma.createRectangle();
  tile.resize(opts.size, opts.size);
  cell.appendChild(tile);

  const label = figma.createText();
  applyFont(label, "body", "Medium");
  label.characters = opts.caption;
  label.fontSize = 11;
  bindFill(label, opts.captionVar);
  cell.appendChild(label);

  parent.appendChild(cell);
  return tile;
}

export function createVertical(parent: FrameNode, spacing: number): FrameNode {
  const frame = figma.createFrame();
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = spacing;
  frame.fills = [];
  parent.appendChild(frame);
  return frame;
}

// One row in a label / value table. Fixed counter-axis alignment keeps the
// label baseline aligned with the sample even when the sample is taller.
export function createTableRow(
  parent: FrameNode,
  _labelWidth: number,
): FrameNode {
  const frame = figma.createFrame();
  frame.layoutMode = "HORIZONTAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.counterAxisAlignItems = "CENTER";
  frame.itemSpacing = 16;
  frame.fills = [];
  parent.appendChild(frame);
  return frame;
}

export function addLabel(
  parent: FrameNode,
  text: string,
  variable: Variable | undefined,
  width: number,
): TextNode {
  const label = figma.createText();
  label.characters = text;
  label.fontSize = 10;
  applyFont(label, "body", "Regular");
  bindFill(label, variable);
  label.resize(width, 16);
  parent.appendChild(label);
  return label;
}
