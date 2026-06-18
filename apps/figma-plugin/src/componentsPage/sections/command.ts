// Command: a command palette / searchable menu. Mirrors radix-nova's Command:
// `flex flex-col rounded-xl bg-popover p-1 text-popover-foreground` (the demo
// adds `max-w-sm rounded-lg border`). A CommandInput sits on top inside an
// InputGroup (`h-8 rounded-lg border-input/30 bg-input/30`) with a leading
// search icon, then a CommandList of groups.
//
// Groups carry a heading (`px-2 py-1.5 text-xs font-medium text-muted-
// foreground`); items mirror CommandItem (`gap-2 rounded-lg px-2 py-1.5
// text-sm`) with a leading `size-4` icon and an optional trailing shortcut
// (`ml-auto text-xs tracking-widest text-muted-foreground`). A
// CommandSeparator (`-mx-1 h-px bg-border`) splits the two groups.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import {
  createIcon,
  resolveIconLibrary,
  type SemanticIconName,
} from "../../icons";
import { wrapInSectionCard } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const COMMAND_WIDTH = 384; // max-w-sm

type CommandEntry = {
  label: string;
  icon: SemanticIconName;
  shortcut?: string;
  disabled?: boolean;
};

const SUGGESTIONS: CommandEntry[] = [
  { label: "Calendar", icon: "folder" },
  { label: "Search Emoji", icon: "star" },
  { label: "Calculator", icon: "plus", disabled: true },
];

const SETTINGS: CommandEntry[] = [
  { label: "Profile", icon: "info", shortcut: "Cmd+P" },
  { label: "Billing", icon: "bell", shortcut: "Cmd+B" },
  { label: "Settings", icon: "command", shortcut: "Cmd+S" },
];

export async function addCommandSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = buildCommandComponent(inputs);
  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

function buildCommandComponent(inputs: ComponentsInputs): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = "Command";
  comp.layoutMode = "VERTICAL";
  comp.resize(COMMAND_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  // `p-1 rounded-lg border` (demo). Item/group gaps are handled per-section.
  comp.itemSpacing = 4;
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

  // Search input (InputGroup): `h-8 rounded-lg border-input/30 bg-input/30`
  // with a leading search icon and a muted placeholder.
  const search = buildSearchInput(inputs);
  comp.appendChild(search);
  search.layoutSizingHorizontal = "FILL";

  // The command list (groups + separator) lives in a slot so instances can
  // add/remove/reorder groups and items. The search input stays fixed on top.
  const listChildren: SceneNode[] = [
    buildGroup(inputs, "Suggestions", SUGGESTIONS),
    buildSeparator(inputs),
    buildGroup(inputs, "Settings", SETTINGS),
  ];
  const list = createConfiguredSlot(comp, "Items", listChildren, {
    description: "Command list groups and items.",
    settings: { minChildren: 1 },
  });
  list.layoutMode = "VERTICAL";
  list.primaryAxisSizingMode = "AUTO";
  list.counterAxisSizingMode = "FIXED";
  list.itemSpacing = 4;
  list.fills = [];
  list.strokes = [];
  list.layoutSizingHorizontal = "FILL";
  for (const child of listChildren) {
    (child as FrameNode).layoutSizingHorizontal = "FILL";
  }

  return comp;
}

function buildSearchInput(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const group = figma.createFrame();
  group.name = "Command Input";
  group.layoutMode = "HORIZONTAL";
  group.primaryAxisSizingMode = "FIXED";
  group.counterAxisSizingMode = "FIXED";
  group.primaryAxisAlignItems = "MIN";
  group.counterAxisAlignItems = "CENTER";
  group.resize(COMMAND_WIDTH - 8, 32);
  // InputGroup: `h-8 rounded-lg`, addon `pl-2 gap-2`.
  group.itemSpacing = 8;
  group.paddingLeft = 8;
  group.paddingRight = 10;
  group.cornerRadius = 8;
  bindCornerRadii(group, p.get("radius/lg"));
  // radix-nova uses `bg-input/30`; we can't carry alpha on a bound fill, so
  // mirror the other input sections with a background surface + input border.
  bindFill(group, t.get("background"));
  bindStrokeColor(group, t.get("input"));
  group.strokeWeight = 1;
  group.strokeAlign = "INSIDE";

  // Leading search icon (`size-4 opacity-50`). The semantic library has no
  // dedicated "search" entry, so we approximate with the command glyph; it
  // falls back gracefully when missing.
  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "command",
    size: 16,
    color: t.get("muted-foreground"),
  });
  if (icon) {
    icon.name = "Icon";
    group.appendChild(icon);
  }

  const placeholder = figma.createText();
  applyFont(placeholder, "body", "Regular");
  placeholder.characters = "Type a command or search...";
  placeholder.fontSize = 14;
  bindFontSize(placeholder, p.get("font/size/sm"));
  bindFill(placeholder, t.get("muted-foreground"));
  group.appendChild(placeholder);

  return group;
}

function buildGroup(
  inputs: ComponentsInputs,
  heading: string,
  entries: CommandEntry[],
): FrameNode {
  const group = figma.createFrame();
  group.name = "Group";
  group.layoutMode = "VERTICAL";
  // Resize before declaring sizing modes — resize() pins both axes to FIXED;
  // re-setting the primary axis to AUTO afterwards lets the group hug its
  // heading + items vertically while staying at the fixed (filled) width.
  group.resize(COMMAND_WIDTH - 8, 10);
  group.primaryAxisSizingMode = "AUTO";
  group.counterAxisSizingMode = "FIXED";
  // `p-1`. Items carry their own py-1.5; the heading sits on top.
  group.itemSpacing = 0;
  group.paddingTop = 4;
  group.paddingBottom = 4;
  group.fills = [];
  group.strokes = [];

  const headingRow = buildHeading(inputs, heading);
  group.appendChild(headingRow);
  headingRow.layoutSizingHorizontal = "FILL";

  for (const entry of entries) {
    const row = buildItem(inputs, entry);
    group.appendChild(row);
    row.layoutSizingHorizontal = "FILL";
  }

  return group;
}

function buildHeading(inputs: ComponentsInputs, text: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = "Heading";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.counterAxisAlignItems = "CENTER";
  // `px-2 py-1.5`.
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

function buildItem(inputs: ComponentsInputs, entry: CommandEntry): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = entry.disabled ? "Item (disabled)" : "Item";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.primaryAxisAlignItems = "MIN";
  row.counterAxisAlignItems = "CENTER";
  // `gap-2 rounded-lg px-2 py-1.5`.
  row.itemSpacing = 8;
  row.paddingLeft = 8;
  row.paddingRight = 8;
  row.paddingTop = 6;
  row.paddingBottom = 6;
  row.cornerRadius = 8;
  bindCornerRadii(row, p.get("radius/lg"));
  row.fills = [];
  row.strokes = [];

  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: entry.icon,
    size: 16,
    color: t.get("popover-foreground"),
  });
  if (icon) {
    icon.name = "Icon";
    row.appendChild(icon);
  }

  const label = figma.createText();
  applyFont(label, "body", "Regular");
  label.characters = entry.label;
  label.fontSize = 14;
  bindFontSize(label, p.get("font/size/sm"));
  bindFill(label, t.get("popover-foreground"));
  row.appendChild(label);
  label.layoutGrow = 1;

  if (entry.shortcut) {
    const shortcut = figma.createText();
    applyFont(shortcut, "body", "Regular");
    shortcut.characters = entry.shortcut;
    shortcut.fontSize = 12;
    bindFontSize(shortcut, p.get("font/size/xs"));
    bindFill(shortcut, t.get("muted-foreground"));
    shortcut.letterSpacing = { unit: "PIXELS", value: 1 };
    row.appendChild(shortcut);
  }

  // `data-[disabled=true]:opacity-50`.
  if (entry.disabled) row.opacity = 0.5;

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
  wrap.fills = [];
  wrap.strokes = [];

  const line = figma.createRectangle();
  line.name = "Line";
  // Span the panel's inner width (COMMAND_WIDTH minus the p-1 padding), like
  // radix-nova's `-mx-1`.
  line.resize(COMMAND_WIDTH - 8, 1);
  bindFill(line, t.get("border"));
  wrap.appendChild(line);

  return wrap;
}
