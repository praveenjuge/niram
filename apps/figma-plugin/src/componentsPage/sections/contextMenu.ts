// Context Menu: the open right-click menu panel. Mirrors shadcn's
// ContextMenuContent: `min-w-32 rounded-md border bg-popover p-1
// text-popover-foreground shadow-md`.
//
// We surface the richer item types shadcn ships as a curated `Variant` axis,
// so designers can drop in the exact menu shape they need:
//   basic       — plain items
//   icons       — items with leading icons
//   checkbox    — checkbox + radio items with leading indicators
//   submenu     — items plus a submenu trigger (trailing chevron)
//   shortcuts   — items with trailing keyboard shortcuts
//   destructive — items plus a destructive item, separated by a rule
//
// Every variant binds the selected preset's semantic tokens, radius, font, and
// icon library.

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
import { styleComponentSet } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const MENU_WIDTH = 240;

const CONTEXT_MENU_VARIANTS = [
  "basic",
  "icons",
  "checkbox",
  "submenu",
  "shortcuts",
  "destructive",
] as const;
type ContextMenuVariant = (typeof CONTEXT_MENU_VARIANTS)[number];

export async function addContextMenuSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of CONTEXT_MENU_VARIANTS) {
    const comp = buildContextMenuComponent(inputs, variant);
    await applyEffectStyle(comp, inputs.effectStyles?.idFor("Shadow/md"));
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Context Menu";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildContextMenuComponent(
  inputs: ComponentsInputs,
  variant: ContextMenuVariant,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}`;
  comp.layoutMode = "VERTICAL";
  comp.resize(MENU_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  comp.itemSpacing = 0;
  comp.paddingTop = 4;
  comp.paddingBottom = 4;
  comp.paddingLeft = 4;
  comp.paddingRight = 4;
  comp.cornerRadius = 6;
  bindCornerRadii(comp, p.get("radius/md"));
  bindFill(comp, t.get("popover"));
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  // Menu items live in a slot so instances can add/remove/reorder rows.
  const items = createConfiguredSlot(comp, "Items", [], {
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

  switch (variant) {
    case "basic":
      appendItem(items, inputs, { label: "Back" });
      appendItem(items, inputs, { label: "Forward", disabled: true });
      appendItem(items, inputs, { label: "Reload" });
      appendItem(items, inputs, { label: "Save As…" });
      break;
    case "icons":
      appendItem(items, inputs, { label: "Profile", icon: "info" });
      appendItem(items, inputs, { label: "Notifications", icon: "bell" });
      appendItem(items, inputs, { label: "Add Team", icon: "plus" });
      appendItem(items, inputs, { label: "Favourite", icon: "star" });
      break;
    case "checkbox":
      appendItem(items, inputs, {
        label: "Show Bookmarks",
        checkbox: "checked",
      });
      appendItem(items, inputs, {
        label: "Show Full URLs",
        checkbox: "unchecked",
      });
      appendSeparator(items, inputs);
      appendLabel(items, inputs, "People");
      appendItem(items, inputs, { label: "Pedro Duarte", radio: "selected" });
      appendItem(items, inputs, { label: "Colm Tuite", radio: "unselected" });
      break;
    case "submenu":
      appendItem(items, inputs, { label: "Back" });
      appendItem(items, inputs, { label: "Reload" });
      appendItem(items, inputs, { label: "More Tools", submenu: true });
      appendItem(items, inputs, { label: "Share", submenu: true });
      break;
    case "shortcuts":
      appendItem(items, inputs, { label: "Back", shortcut: "⌘[" });
      appendItem(items, inputs, { label: "Forward", shortcut: "⌘]" });
      appendItem(items, inputs, { label: "Reload", shortcut: "⌘R" });
      appendItem(items, inputs, { label: "Save As…", shortcut: "⌘S" });
      break;
    case "destructive":
      appendItem(items, inputs, { label: "Edit", icon: "info" });
      appendItem(items, inputs, { label: "Duplicate", icon: "plus" });
      appendSeparator(items, inputs);
      appendItem(items, inputs, {
        label: "Delete",
        shortcut: "⌫",
        destructive: true,
      });
      break;
  }

  return comp;
}

type ItemParent = { appendChild(child: SceneNode): void };

function appendItem(
  parent: ItemParent,
  inputs: ComponentsInputs,
  spec: ItemSpec,
) {
  const child = buildItem(inputs, spec);
  parent.appendChild(child);
  child.layoutSizingHorizontal = "FILL";
}

function appendSeparator(parent: ItemParent, inputs: ComponentsInputs) {
  const child = buildSeparator(inputs);
  parent.appendChild(child);
  child.layoutSizingHorizontal = "FILL";
}

function appendLabel(
  parent: ItemParent,
  inputs: ComponentsInputs,
  text: string,
) {
  const child = buildLabel(inputs, text);
  parent.appendChild(child);
  child.layoutSizingHorizontal = "FILL";
}

type ItemSpec = {
  label: string;
  shortcut?: string;
  icon?: SemanticIconName;
  disabled?: boolean;
  destructive?: boolean;
  submenu?: boolean;
  checkbox?: "checked" | "unchecked";
  radio?: "selected" | "unselected";
};

function buildItem(inputs: ComponentsInputs, spec: ItemSpec): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const colorVar = spec.destructive
    ? t.get("destructive")
    : t.get("popover-foreground");

  const row = figma.createFrame();
  row.name = spec.destructive ? "Item (destructive)" : "Item";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.primaryAxisAlignItems = "MIN";
  row.counterAxisAlignItems = "CENTER";
  row.itemSpacing = 8;
  row.paddingLeft = 8;
  row.paddingRight = 8;
  row.paddingTop = 6;
  row.paddingBottom = 6;
  row.cornerRadius = 4;
  bindCornerRadii(row, p.get("radius/sm"));
  row.fills = [];
  row.strokes = [];

  // Leading slot: checkbox/radio indicator or a semantic icon.
  if (spec.checkbox) {
    row.appendChild(buildCheckIndicator(inputs, spec.checkbox === "checked"));
  } else if (spec.radio) {
    row.appendChild(buildRadioIndicator(inputs, spec.radio === "selected"));
  } else if (spec.icon) {
    const icon = createIcon({
      library: resolveIconLibrary(inputs.presetSummary),
      name: spec.icon,
      size: 16,
      color: colorVar,
    });
    if (icon) {
      icon.name = "Icon";
      row.appendChild(icon);
    }
  }

  const label = figma.createText();
  applyFont(label, "body", "Regular");
  label.characters = spec.label;
  label.fontSize = 14;
  bindFontSize(label, p.get("font/size/sm"));
  bindFill(label, colorVar);
  row.appendChild(label);
  label.layoutGrow = 1;

  if (spec.shortcut) {
    const shortcut = figma.createText();
    applyFont(shortcut, "body", "Regular");
    shortcut.characters = spec.shortcut;
    shortcut.fontSize = 12;
    bindFontSize(shortcut, p.get("font/size/xs"));
    bindFill(shortcut, t.get("muted-foreground"));
    shortcut.letterSpacing = { unit: "PIXELS", value: 1 };
    row.appendChild(shortcut);
  }

  // Submenu trigger gets a trailing right-chevron.
  if (spec.submenu) {
    const chevron = figma.createVector();
    chevron.name = "Chevron";
    chevron.resize(16, 16);
    chevron.vectorPaths = [
      { windingRule: "NONZERO", data: "M 6 4 L 10 8 L 6 12" },
    ];
    chevron.strokeWeight = 1.5;
    chevron.strokeCap = "ROUND";
    chevron.strokeJoin = "ROUND";
    chevron.fills = [];
    bindStrokeColor(chevron, t.get("muted-foreground"));
    row.appendChild(chevron);
  }

  if (spec.disabled) row.opacity = 0.5;

  return row;
}

// A 16px slot holding a check vector when checked.
function buildCheckIndicator(
  inputs: ComponentsInputs,
  checked: boolean,
): FrameNode {
  const t = inputs.theme.light;

  const slot = figma.createFrame();
  slot.name = "Indicator";
  slot.layoutMode = "HORIZONTAL";
  slot.primaryAxisSizingMode = "FIXED";
  slot.counterAxisSizingMode = "FIXED";
  slot.primaryAxisAlignItems = "CENTER";
  slot.counterAxisAlignItems = "CENTER";
  slot.resize(16, 16);
  slot.fills = [];
  slot.strokes = [];

  if (checked) {
    const check = figma.createVector();
    check.name = "Check";
    check.vectorPaths = [
      { windingRule: "NONZERO", data: "M 3 8 L 6.5 11.5 L 13 4" },
    ];
    check.strokeWeight = 1.75;
    check.strokeCap = "ROUND";
    check.strokeJoin = "ROUND";
    check.fills = [];
    bindStrokeColor(check, t.get("popover-foreground"));
    slot.appendChild(check);
  }

  return slot;
}

// A 16px slot holding a filled dot when selected.
function buildRadioIndicator(
  inputs: ComponentsInputs,
  selected: boolean,
): FrameNode {
  const t = inputs.theme.light;

  const slot = figma.createFrame();
  slot.name = "Indicator";
  slot.layoutMode = "HORIZONTAL";
  slot.primaryAxisSizingMode = "FIXED";
  slot.counterAxisSizingMode = "FIXED";
  slot.primaryAxisAlignItems = "CENTER";
  slot.counterAxisAlignItems = "CENTER";
  slot.resize(16, 16);
  slot.fills = [];
  slot.strokes = [];

  if (selected) {
    const dot = figma.createEllipse();
    dot.name = "Dot";
    dot.resize(6, 6);
    bindFill(dot, t.get("popover-foreground"));
    slot.appendChild(dot);
  }

  return slot;
}

function buildLabel(inputs: ComponentsInputs, text: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = "Label";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.counterAxisAlignItems = "CENTER";
  row.paddingLeft = 8;
  row.paddingRight = 8;
  row.paddingTop = 6;
  row.paddingBottom = 6;
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

function buildSeparator(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;

  const wrap = figma.createFrame();
  wrap.name = "Separator";
  wrap.layoutMode = "VERTICAL";
  wrap.primaryAxisSizingMode = "AUTO";
  wrap.counterAxisSizingMode = "AUTO";
  wrap.counterAxisAlignItems = "CENTER";
  wrap.paddingTop = 4;
  wrap.paddingBottom = 4;
  wrap.fills = [];
  wrap.strokes = [];

  const line = figma.createRectangle();
  line.name = "Line";
  line.resize(MENU_WIDTH - 8, 1);
  bindFill(line, t.get("border"));
  wrap.appendChild(line);

  return wrap;
}
