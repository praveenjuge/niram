// Scroll Area: a bounded viewport with a visible scrollbar thumb. Mirrors
// shadcn's ScrollArea (radix-ui primitive): a `rounded-md border` viewport
// over content, with a ScrollAreaScrollbar (`w-2.5 p-px`) holding a
// `rounded-full bg-border` thumb on the right edge.
//
// We render the "Tags" demo: a `text-sm` heading over a stack of rows
// separated by rules, clipped to a fixed height, with the thumb parked near
// the top to suggest more content below.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { wrapInSectionCard } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const SCROLL_WIDTH = 240;
const SCROLL_HEIGHT = 280;
const SCROLLBAR_WIDTH = 10;

// More rows than fit, so the area reads as scrollable.
const TAGS = Array.from({ length: 14 }, (_, i) => `v1.2.0-beta.${50 - i}`);

export async function addScrollAreaSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = buildScrollAreaComponent(inputs);
  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

function buildScrollAreaComponent(inputs: ComponentsInputs): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = "Scroll Area";
  // Absolute layout so the scrollbar can pin to the right edge over the
  // clipped content.
  comp.layoutMode = "NONE";
  comp.resize(SCROLL_WIDTH, SCROLL_HEIGHT);
  comp.cornerRadius = 6;
  bindCornerRadii(comp, p.get("radius/md"));
  bindFill(comp, t.get("background"));
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";
  comp.clipsContent = true;

  // Viewport content: heading + tag rows, exposed as a Content slot so
  // instances can swap in their own scrollable content.
  const heading = figma.createText();
  applyFont(heading, "body", "Medium");
  heading.characters = "Tags";
  heading.fontSize = 14;
  bindFontSize(heading, p.get("font/size/sm"));
  bindFill(heading, t.get("foreground"));

  const rows: FrameNode[] = [];
  for (let i = 0; i < TAGS.length; i++) {
    rows.push(buildTagRow(inputs, TAGS[i]!, i > 0));
  }

  const content = createConfiguredSlot(comp, "Content", [heading, ...rows], {
    description: "Scroll area viewport content.",
  });
  content.layoutMode = "VERTICAL";
  content.primaryAxisSizingMode = "AUTO";
  content.counterAxisSizingMode = "FIXED";
  content.itemSpacing = 0;
  content.paddingTop = 16;
  content.paddingBottom = 16;
  content.paddingLeft = 16;
  content.paddingRight = 16;
  content.fills = [];
  content.strokes = [];
  content.resize(SCROLL_WIDTH - SCROLLBAR_WIDTH, content.height || 10);
  content.x = 0;
  content.y = 0;
  heading.layoutSizingHorizontal = "FILL";
  for (const row of rows) row.layoutSizingHorizontal = "FILL";

  // Scrollbar track + thumb on the right edge.
  const track = figma.createFrame();
  track.name = "Scrollbar";
  track.layoutMode = "NONE";
  track.resize(SCROLLBAR_WIDTH, SCROLL_HEIGHT);
  track.x = SCROLL_WIDTH - SCROLLBAR_WIDTH;
  track.y = 0;
  track.fills = [];
  track.strokes = [];
  comp.appendChild(track);

  const thumb = figma.createRectangle();
  thumb.name = "Thumb";
  thumb.resize(SCROLLBAR_WIDTH - 2, 80);
  thumb.x = SCROLL_WIDTH - SCROLLBAR_WIDTH + 1;
  thumb.y = 2;
  thumb.cornerRadius = (SCROLLBAR_WIDTH - 2) / 2;
  bindFill(thumb, t.get("border"));
  comp.appendChild(thumb);

  return comp;
}

function buildTagRow(
  inputs: ComponentsInputs,
  text: string,
  withBorder: boolean,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = "Tag";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.counterAxisAlignItems = "CENTER";
  row.paddingTop = 8;
  row.paddingBottom = 8;
  row.fills = [];
  row.strokes = [];
  if (withBorder) {
    bindStrokeColor(row, t.get("border"));
    row.strokeWeight = 1;
    row.strokeAlign = "INSIDE";
    row.strokeTopWeight = 1;
    row.strokeBottomWeight = 0;
    row.strokeLeftWeight = 0;
    row.strokeRightWeight = 0;
  }

  const label = figma.createText();
  applyFont(label, "body", "Regular");
  label.characters = text;
  label.fontSize = 14;
  bindFontSize(label, p.get("font/size/sm"));
  bindFill(label, t.get("foreground"));
  row.appendChild(label);

  return row;
}
