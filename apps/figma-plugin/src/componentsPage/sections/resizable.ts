// Resizable: two panels split by a draggable handle. Mirrors shadcn's
// Resizable (react-resizable-panels): a `rounded-lg border` group holding two
// ResizablePanels separated by a ResizableHandle (`w-px bg-border` with an
// optional grip — `h-4 w-3 rounded-xs border bg-border`).
//
// We render a horizontal two-pane split with the grip handle so the divider
// reads as draggable.

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

const GROUP_WIDTH = 420;
const GROUP_HEIGHT = 200;
const HANDLE_WIDTH = 1;
const GRIP_W = 12;
const GRIP_H = 16;

export async function addResizableSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = buildResizableComponent(inputs);
  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

function buildResizableComponent(inputs: ComponentsInputs): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = "Resizable";
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  comp.itemSpacing = 0;
  comp.resize(GROUP_WIDTH, GROUP_HEIGHT);
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("background"));
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";
  comp.clipsContent = true;

  const leftWidth = Math.round((GROUP_WIDTH - HANDLE_WIDTH) * 0.4);
  const rightWidth = GROUP_WIDTH - HANDLE_WIDTH - leftWidth;

  buildPanel(comp, inputs, "Panel One", "One", leftWidth);
  comp.appendChild(buildHandle(inputs));
  buildPanel(comp, inputs, "Panel Two", "Two", rightWidth);

  return comp;
}

function buildPanel(
  comp: ComponentNode,
  inputs: ComponentsInputs,
  slotName: string,
  label: string,
  width: number,
): void {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get("foreground"));

  // Each panel is a slot so instances can compose their own panel content.
  // createConfiguredSlot appends it to the component in call order, so the two
  // panels straddle the handle correctly.
  const panel = createConfiguredSlot(comp, slotName, [text], {
    description: "Resizable panel content.",
  });
  panel.layoutMode = "HORIZONTAL";
  panel.primaryAxisSizingMode = "FIXED";
  panel.counterAxisSizingMode = "FIXED";
  panel.primaryAxisAlignItems = "CENTER";
  panel.counterAxisAlignItems = "CENTER";
  panel.resize(width, GROUP_HEIGHT);
  panel.fills = [];
  panel.strokes = [];
}

// The handle: a 1px divider line with a centred grip square. Built with
// absolute positioning so the grip overlaps the thin divider.
function buildHandle(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const handle = figma.createFrame();
  handle.name = "Handle";
  handle.layoutMode = "NONE";
  handle.resize(HANDLE_WIDTH, GROUP_HEIGHT);
  bindFill(handle, t.get("border"));
  handle.strokes = [];
  handle.clipsContent = false;

  // Grip: `h-4 w-3 rounded-xs border bg-border`, centred over the divider.
  const grip = figma.createFrame();
  grip.name = "Grip";
  grip.layoutMode = "HORIZONTAL";
  grip.primaryAxisAlignItems = "CENTER";
  grip.counterAxisAlignItems = "CENTER";
  grip.resize(GRIP_W, GRIP_H);
  grip.cornerRadius = 2;
  bindCornerRadii(grip, p.get("radius/xs"));
  bindFill(grip, t.get("border"));
  bindStrokeColor(grip, t.get("border"));
  grip.strokeWeight = 1;
  grip.strokeAlign = "INSIDE";
  handle.appendChild(grip);
  grip.x = (HANDLE_WIDTH - GRIP_W) / 2;
  grip.y = (GROUP_HEIGHT - GRIP_H) / 2;

  return handle;
}
