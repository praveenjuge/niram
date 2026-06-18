// Navigation Menu: a horizontal site nav with a trigger row over an open
// content panel. Mirrors shadcn's NavigationMenu (radix-ui primitive): a
// trigger list (`gap-1`) of items styled with `navigationMenuTriggerStyle`
// (`h-9 rounded-md px-4 py-2 text-sm font-medium bg-background
// hover:bg-accent`), one shown in its open (`bg-accent`) state with a trailing
// chevron, over a NavigationMenuContent panel (`rounded-md border bg-popover
// p-2 shadow`) listing a few links.

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

const NAV_WIDTH = 380;

const TRIGGERS = ["Getting started", "Components", "Docs"];
const OPEN_INDEX = 1; // "Components" reads as the active trigger.

type Link = { title: string; desc: string };
const LINKS: Link[] = [
  { title: "Alert Dialog", desc: "A modal dialog that interrupts the user." },
  { title: "Hover Card", desc: "For sighted users to preview content." },
  { title: "Progress", desc: "Displays a task's completion progress." },
];

export async function addNavigationMenuSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = await buildNavigationMenuComponent(inputs);
  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

async function buildNavigationMenuComponent(
  inputs: ComponentsInputs,
): Promise<ComponentNode> {
  const comp = figma.createComponent();
  comp.name = "Navigation Menu";
  comp.layoutMode = "VERTICAL";
  comp.resize(NAV_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  comp.itemSpacing = 8;
  comp.fills = [];
  comp.strokes = [];

  // Trigger row.
  const triggers = figma.createFrame();
  triggers.name = "Triggers";
  triggers.layoutMode = "HORIZONTAL";
  triggers.primaryAxisSizingMode = "AUTO";
  triggers.counterAxisSizingMode = "AUTO";
  triggers.counterAxisAlignItems = "CENTER";
  triggers.itemSpacing = 4;
  triggers.fills = [];
  triggers.strokes = [];
  comp.appendChild(triggers);

  for (let i = 0; i < TRIGGERS.length; i++) {
    triggers.appendChild(buildTrigger(inputs, TRIGGERS[i]!, i === OPEN_INDEX));
  }

  // Open content panel with the popover `shadow-md`.
  const panel = buildPanel(inputs);
  await applyEffectStyle(panel, inputs.effectStyles?.idFor("Shadow/md"));
  comp.appendChild(panel);
  panel.layoutSizingHorizontal = "FILL";

  // Links live in a slot nested in the content panel so instances can
  // add/remove/reorder navigation links.
  const links = LINKS.map((link) => buildLink(inputs, link));
  const list = createConfiguredSlot(comp, "Items", links, {
    description: "Navigation links.",
    settings: { minChildren: 1 },
  });
  panel.appendChild(list);
  list.layoutMode = "VERTICAL";
  list.primaryAxisSizingMode = "AUTO";
  list.counterAxisSizingMode = "FIXED";
  list.itemSpacing = 2;
  list.fills = [];
  list.strokes = [];
  list.layoutSizingHorizontal = "FILL";
  for (const link of links) link.layoutSizingHorizontal = "FILL";

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
  trigger.counterAxisSizingMode = "FIXED";
  trigger.primaryAxisAlignItems = "CENTER";
  trigger.counterAxisAlignItems = "CENTER";
  // `h-9 rounded-md px-4 py-2 gap-1`.
  trigger.itemSpacing = 4;
  trigger.paddingLeft = 16;
  trigger.paddingRight = 16;
  trigger.resize(trigger.width, 36);
  trigger.primaryAxisSizingMode = "AUTO";
  trigger.cornerRadius = 6;
  bindCornerRadii(trigger, p.get("radius/md"));
  trigger.strokes = [];

  if (open) {
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

  // Open trigger carries a trailing chevron-down.
  if (open) {
    const chevron = figma.createVector();
    chevron.name = "Chevron";
    chevron.resize(12, 12);
    chevron.vectorPaths = [
      { windingRule: "NONZERO", data: "M 3 4.5 L 6 7.5 L 9 4.5" },
    ];
    chevron.strokeWeight = 1.5;
    chevron.strokeCap = "ROUND";
    chevron.strokeJoin = "ROUND";
    chevron.fills = [];
    bindStrokeColor(chevron, t.get("accent-foreground"));
    trigger.appendChild(chevron);
  }

  return trigger;
}

function buildPanel(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const panel = figma.createFrame();
  panel.name = "Content";
  panel.layoutMode = "VERTICAL";
  panel.primaryAxisSizingMode = "AUTO";
  panel.counterAxisSizingMode = "FIXED";
  panel.itemSpacing = 2;
  panel.paddingTop = 8;
  panel.paddingBottom = 8;
  panel.paddingLeft = 8;
  panel.paddingRight = 8;
  panel.cornerRadius = 6;
  bindCornerRadii(panel, p.get("radius/md"));
  bindFill(panel, t.get("popover"));
  bindStrokeColor(panel, t.get("border"));
  panel.strokeWeight = 1;
  panel.strokeAlign = "INSIDE";

  return panel;
}

function buildLink(inputs: ComponentsInputs, link: Link): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = "Link";
  row.layoutMode = "VERTICAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "FIXED";
  row.itemSpacing = 2;
  row.paddingLeft = 12;
  row.paddingRight = 12;
  row.paddingTop = 8;
  row.paddingBottom = 8;
  row.cornerRadius = 6;
  bindCornerRadii(row, p.get("radius/md"));
  row.fills = [];
  row.strokes = [];

  const title = figma.createText();
  applyFont(title, "body", "Medium");
  title.characters = link.title;
  title.fontSize = 14;
  bindFontSize(title, p.get("font/size/sm"));
  bindFill(title, t.get("popover-foreground"));
  row.appendChild(title);
  title.layoutSizingHorizontal = "FILL";

  const desc = figma.createText();
  applyFont(desc, "body", "Regular");
  desc.characters = link.desc;
  desc.fontSize = 14;
  bindFontSize(desc, p.get("font/size/sm"));
  bindFill(desc, t.get("muted-foreground"));
  row.appendChild(desc);
  desc.layoutSizingHorizontal = "FILL";

  return row;
}
