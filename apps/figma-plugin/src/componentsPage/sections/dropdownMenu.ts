// Dropdown Menu: the open menu panel. Mirrors radix-nova's
// DropdownMenuContent: `min-w-32 rounded-lg bg-popover p-1 text-popover-
// foreground shadow-md ring-1 ring-foreground/10`.
//
// Items mirror DropdownMenuItem (`gap-1.5 rounded-md px-1.5 py-1 text-sm`) with
// a trailing `ml-auto text-xs tracking-widest text-muted-foreground` shortcut.
// A DropdownMenuLabel (`text-xs font-medium text-muted-foreground`) sits on top,
// a `-mx-1 my-1 h-px bg-border` separator splits the groups, and the final item
// is the `destructive` variant (`text-destructive`).

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { applyEffectStyle } from "../../effectStyles";
import {
  createIcon,
  resolveIconLibrary,
  type SemanticIconName,
} from "../../icons";
import { wrapInSectionCard } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const MENU_WIDTH = 224;

type MenuItem = {
  label: string;
  icon: SemanticIconName;
  shortcut?: string;
  destructive?: boolean;
};

const ITEMS: MenuItem[] = [
  { label: "Profile", icon: "info", shortcut: "Cmd+P" },
  { label: "Notifications", icon: "bell", shortcut: "Cmd+N" },
  { label: "Add team", icon: "plus" },
];

export async function addDropdownMenuSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = buildDropdownMenuComponent(inputs);
  // radix-nova DropdownMenuContent uses `shadow-md`.
  await applyEffectStyle(comp, inputs.effectStyles?.idFor("Shadow/md"));
  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

function buildDropdownMenuComponent(inputs: ComponentsInputs): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = "Dropdown Menu";
  comp.layoutMode = "VERTICAL";
  comp.resize(MENU_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  // `p-1 rounded-lg`. Item gap is 0 (items carry their own py-1).
  comp.itemSpacing = 0;
  comp.paddingTop = 4;
  comp.paddingBottom = 4;
  comp.paddingLeft = 4;
  comp.paddingRight = 4;
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("popover"));
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  // The menu body (label + items + separator + destructive item) lives in a
  // slot so instances can add/remove/reorder rows without detaching.
  const rows: SceneNode[] = [buildLabelRow(inputs, "My Account")];
  for (const item of ITEMS) rows.push(buildItemRow(inputs, item));
  rows.push(buildSeparator(inputs));
  rows.push(
    buildItemRow(inputs, {
      label: "Delete",
      icon: "close",
      shortcut: "Del",
      destructive: true,
    }),
  );

  const items = createConfiguredSlot(comp, "Items", rows, {
    description: "Menu items.",
    settings: { minChildren: 1 },
  });
  items.layoutMode = "VERTICAL";
  items.primaryAxisSizingMode = "AUTO";
  items.counterAxisSizingMode = "FIXED";
  items.itemSpacing = 0;
  items.fills = [];
  items.strokes = [];
  items.layoutSizingHorizontal = "FILL";
  for (const row of rows) (row as FrameNode).layoutSizingHorizontal = "FILL";

  return comp;
}

function buildLabelRow(inputs: ComponentsInputs, text: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = "Label";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.counterAxisAlignItems = "CENTER";
  row.paddingLeft = 6;
  row.paddingRight = 6;
  row.paddingTop = 4;
  row.paddingBottom = 4;
  row.fills = [];
  row.strokes = [];

  const label = figma.createText();
  applyFont(label, "body", "Medium");
  label.characters = text;
  label.fontSize = 12;
  bindFontSize(label, p.get("font/size/xs"));
  bindFill(label, t.get("muted-foreground"));
  row.appendChild(label);

  return row;
}

function buildItemRow(inputs: ComponentsInputs, item: MenuItem): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const colorVar = item.destructive
    ? t.get("destructive")
    : t.get("popover-foreground");

  const row = figma.createFrame();
  row.name = item.destructive ? "Item (destructive)" : "Item";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.primaryAxisAlignItems = "MIN";
  row.counterAxisAlignItems = "CENTER";
  // `gap-1.5 rounded-md px-1.5 py-1`.
  row.itemSpacing = 6;
  row.paddingLeft = 6;
  row.paddingRight = 6;
  row.paddingTop = 4;
  row.paddingBottom = 4;
  row.cornerRadius = 6;
  bindCornerRadii(row, p.get("radius/md"));
  row.fills = [];
  row.strokes = [];

  // Leading icon (`size-4`), tinted to the item colour.
  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: item.icon,
    size: 16,
    color: colorVar,
  });
  if (icon) {
    icon.name = "Icon";
    row.appendChild(icon);
  }

  const label = figma.createText();
  applyFont(label, "body", "Regular");
  label.characters = item.label;
  label.fontSize = 14;
  bindFontSize(label, p.get("font/size/sm"));
  bindFill(label, colorVar);
  row.appendChild(label);
  // Let the label take the remaining space so the shortcut pins right.
  label.layoutGrow = 1;

  if (item.shortcut) {
    const shortcut = figma.createText();
    applyFont(shortcut, "body", "Regular");
    shortcut.characters = item.shortcut;
    shortcut.fontSize = 12;
    bindFontSize(shortcut, p.get("font/size/xs"));
    // `text-muted-foreground` regardless of the item colour.
    bindFill(shortcut, t.get("muted-foreground"));
    shortcut.letterSpacing = { unit: "PIXELS", value: 1 };
    row.appendChild(shortcut);
  }

  return row;
}

function buildSeparator(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;

  // Wrapper carries the `my-1` vertical spacing; the line is `h-px bg-border`
  // spanning the panel width (the `-mx-1` is approximated by full-width fill).
  const wrap = figma.createFrame();
  wrap.name = "Separator";
  wrap.layoutMode = "VERTICAL";
  // AUTO on the primary (vertical) axis so the wrapper hugs to its 4+1+4 = 9px
  // content height. A fresh frame defaults to 100px tall, and FIXED would keep
  // that, leaving a large gap below the separator.
  wrap.primaryAxisSizingMode = "AUTO";
  wrap.counterAxisSizingMode = "AUTO";
  wrap.counterAxisAlignItems = "CENTER";
  wrap.paddingTop = 4;
  wrap.paddingBottom = 4;
  wrap.fills = [];
  wrap.strokes = [];

  const line = figma.createRectangle();
  line.name = "Line";
  // Fixed to the panel's inner content width (MENU_WIDTH minus the p-1 padding
  // on both sides). This matches the fill-width the wrapper takes inside the
  // menu, so the rule spans edge to edge like radix-nova's `-mx-1`.
  line.resize(MENU_WIDTH - 8, 1);
  bindFill(line, t.get("border"));
  wrap.appendChild(line);

  return wrap;
}
