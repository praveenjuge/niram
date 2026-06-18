// Menubar: a horizontal application menu bar. Mirrors shadcn's Menubar
// (radix-ui primitive): `flex h-9 items-center gap-1 rounded-md border
// bg-background p-1 shadow-xs`, with MenubarTrigger items
// (`rounded-sm px-2 py-1 text-sm font-medium`) — one rendered in its open
// (`bg-accent`) state.
//
// We render the classic File / Edit / View / Profiles bar with "File" open.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { applyEffectStyle } from "../../effectStyles";
import { wrapInSectionCard } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const TRIGGERS = ["File", "Edit", "View", "Profiles"];
const OPEN_INDEX = 0; // "File" reads as the active trigger.

export async function addMenubarSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = buildMenubarComponent(inputs);
  // shadcn Menubar uses `shadow-xs`.
  await applyEffectStyle(comp, inputs.effectStyles?.idFor("Shadow/xs"));
  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

function buildMenubarComponent(inputs: ComponentsInputs): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = "Menubar";
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  // `h-9 gap-1 p-1 rounded-md`.
  comp.itemSpacing = 4;
  comp.paddingTop = 4;
  comp.paddingBottom = 4;
  comp.paddingLeft = 4;
  comp.paddingRight = 4;
  comp.cornerRadius = 6;
  bindCornerRadii(comp, p.get("radius/md"));
  bindFill(comp, t.get("background"));
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  // The triggers live in a slot so instances can add/remove top-level menus.
  const triggers = TRIGGERS.map((label, i) =>
    buildTrigger(inputs, label, i === OPEN_INDEX),
  );
  const items = createConfiguredSlot(comp, "Items", triggers, {
    description: "Menubar triggers.",
    settings: { minChildren: 1 },
  });
  items.layoutMode = "HORIZONTAL";
  items.primaryAxisSizingMode = "AUTO";
  items.counterAxisSizingMode = "AUTO";
  items.primaryAxisAlignItems = "MIN";
  items.counterAxisAlignItems = "CENTER";
  items.itemSpacing = 4;
  items.fills = [];
  items.strokes = [];

  return comp;
}

function buildTrigger(
  inputs: ComponentsInputs,
  label: string,
  open: boolean,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const trigger = figma.createFrame();
  trigger.name = open ? "Trigger (open)" : "Trigger";
  trigger.layoutMode = "HORIZONTAL";
  trigger.primaryAxisSizingMode = "AUTO";
  trigger.counterAxisSizingMode = "AUTO";
  trigger.primaryAxisAlignItems = "CENTER";
  trigger.counterAxisAlignItems = "CENTER";
  // `rounded-sm px-2 py-1`.
  trigger.paddingLeft = 8;
  trigger.paddingRight = 8;
  trigger.paddingTop = 4;
  trigger.paddingBottom = 4;
  trigger.cornerRadius = 4;
  bindCornerRadii(trigger, p.get("radius/sm"));
  trigger.strokes = [];

  if (open) {
    // `data-[state=open]:bg-accent`.
    bindFill(trigger, t.get("accent"));
  } else {
    trigger.fills = [];
  }

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, open ? t.get("accent-foreground") : t.get("foreground"));
  trigger.appendChild(text);

  return trigger;
}
