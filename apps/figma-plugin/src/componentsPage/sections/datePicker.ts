// Date Picker: the trigger surfaces for a calendar popover. shadcn builds the
// Date Picker by composing a Popover trigger (an outline button with a leading
// calendar icon showing the selected date) over the Calendar. The Calendar
// itself already has its own section, so here we render the curated trigger
// compositions designers actually swap:
//   basic    — a single picked date in an outline button
//   range    — a from–to range in an outline button
//   dropdown — month / year dropdown selects (the date-of-birth pattern)
//   input    — a date input field with a trailing calendar icon button
//   time     — a date button paired with a time input
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
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const DATE_PICKER_VARIANTS = [
  "basic",
  "range",
  "dropdown",
  "input",
  "time",
] as const;
type DatePickerVariant = (typeof DATE_PICKER_VARIANTS)[number];

const TRIGGER_HEIGHT = 32;

export async function addDatePickerSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of DATE_PICKER_VARIANTS) {
    const comp = buildDatePickerComponent(inputs, variant);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Date Picker";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildDatePickerComponent(
  inputs: ComponentsInputs,
  variant: DatePickerVariant,
): ComponentNode {
  const comp = figma.createComponent();
  comp.name = `Variant=${variant}`;

  if (variant === "dropdown") return buildDropdownVariant(comp, inputs);
  if (variant === "input") return buildInputVariant(comp, inputs);
  if (variant === "time") return buildTimeVariant(comp, inputs);

  // basic / range: a single outline button with a leading calendar icon.
  const label = variant === "range" ? "Jun 1 – Jun 17, 2025" : "June 17, 2025";
  const width = variant === "range" ? 260 : 240;
  styleOutlineTrigger(comp, inputs, width);
  appendCalendarIcon(comp, inputs);
  appendValueText(comp, inputs, label, false);
  return comp;
}

// month / year dropdown selects laid out in a row (the date-of-birth pattern).
function buildDropdownVariant(
  comp: ComponentNode,
  inputs: ComponentsInputs,
): ComponentNode {
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  comp.itemSpacing = 8;
  comp.fills = [];
  comp.strokes = [];

  comp.appendChild(buildSelect(inputs, "June", 110));
  comp.appendChild(buildSelect(inputs, "17", 72));
  comp.appendChild(buildSelect(inputs, "2025", 90));

  return comp;
}

// A date input field with a trailing calendar icon button.
function buildInputVariant(
  comp: ComponentNode,
  inputs: ComponentsInputs,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(240, TRIGGER_HEIGHT);
  comp.itemSpacing = 6;
  comp.paddingLeft = 10;
  comp.paddingRight = 4;
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("background"));
  bindStrokeColor(comp, t.get("input"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.characters = "06/17/2025";
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get("foreground"));
  comp.appendChild(text);
  text.layoutGrow = 1;

  // Trailing ghost icon button.
  const btn = figma.createFrame();
  btn.name = "Calendar Button";
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "FIXED";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.resize(24, 24);
  btn.cornerRadius = 6;
  bindCornerRadii(btn, p.get("radius/md"));
  btn.fills = [];
  btn.strokes = [];
  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "folder",
    size: 16,
    color: t.get("muted-foreground"),
  });
  if (icon) {
    icon.name = "Icon";
    btn.appendChild(icon);
  }
  comp.appendChild(btn);

  return comp;
}

// A date button paired with a time input.
function buildTimeVariant(
  comp: ComponentNode,
  inputs: ComponentsInputs,
): ComponentNode {
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  comp.itemSpacing = 8;
  comp.fills = [];
  comp.strokes = [];

  // Date button (outline + calendar icon).
  const date = figma.createFrame();
  styleOutlineFrame(date, inputs, 160);
  date.name = "Date";
  appendCalendarIcon(date, inputs);
  appendValueTextTo(date, inputs, "June 17, 2025", false);
  comp.appendChild(date);

  // Time input.
  comp.appendChild(buildPlainInput(inputs, "10:30 AM", 96));

  return comp;
}

// ---- shared trigger helpers -------------------------------------------------

function styleOutlineTrigger(
  comp: ComponentNode,
  inputs: ComponentsInputs,
  width: number,
): void {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(width, TRIGGER_HEIGHT);
  // Outline button: `h-8 px-2.5 rounded-lg gap-2 justify-start`.
  comp.itemSpacing = 8;
  comp.paddingLeft = 10;
  comp.paddingRight = 10;
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("background"));
  bindStrokeColor(comp, t.get("input"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";
}

function styleOutlineFrame(
  frame: FrameNode,
  inputs: ComponentsInputs,
  width: number,
): void {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  frame.layoutMode = "HORIZONTAL";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";
  frame.primaryAxisAlignItems = "MIN";
  frame.counterAxisAlignItems = "CENTER";
  frame.resize(width, TRIGGER_HEIGHT);
  frame.itemSpacing = 8;
  frame.paddingLeft = 10;
  frame.paddingRight = 10;
  frame.cornerRadius = 8;
  bindCornerRadii(frame, p.get("radius/lg"));
  bindFill(frame, t.get("background"));
  bindStrokeColor(frame, t.get("input"));
  frame.strokeWeight = 1;
  frame.strokeAlign = "INSIDE";
}

function appendCalendarIcon(
  parent: ComponentNode | FrameNode,
  inputs: ComponentsInputs,
): void {
  const t = inputs.theme.light;
  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "folder",
    size: 16,
    color: t.get("muted-foreground"),
  });
  if (icon) {
    icon.name = "Icon";
    parent.appendChild(icon);
  }
}

function appendValueText(
  parent: ComponentNode,
  inputs: ComponentsInputs,
  value: string,
  muted: boolean,
): void {
  appendValueTextTo(parent, inputs, value, muted);
}

function appendValueTextTo(
  parent: ComponentNode | FrameNode,
  inputs: ComponentsInputs,
  value: string,
  muted: boolean,
): void {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.characters = value;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, muted ? t.get("muted-foreground") : t.get("foreground"));
  parent.appendChild(text);
}

// A select trigger (chevron-terminated) used by the dropdown variant.
function buildSelect(
  inputs: ComponentsInputs,
  value: string,
  width: number,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const trigger = figma.createFrame();
  trigger.name = "Select";
  trigger.layoutMode = "HORIZONTAL";
  trigger.primaryAxisSizingMode = "FIXED";
  trigger.counterAxisSizingMode = "FIXED";
  trigger.primaryAxisAlignItems = "MIN";
  trigger.counterAxisAlignItems = "CENTER";
  trigger.resize(width, TRIGGER_HEIGHT);
  trigger.itemSpacing = 6;
  trigger.paddingLeft = 10;
  trigger.paddingRight = 8;
  trigger.cornerRadius = 8;
  bindCornerRadii(trigger, p.get("radius/lg"));
  bindFill(trigger, t.get("background"));
  bindStrokeColor(trigger, t.get("input"));
  trigger.strokeWeight = 1;
  trigger.strokeAlign = "INSIDE";

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.characters = value;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get("foreground"));
  trigger.appendChild(text);
  text.layoutGrow = 1;

  const chevron = figma.createVector();
  chevron.name = "Chevron";
  chevron.resize(16, 16);
  chevron.vectorPaths = [
    { windingRule: "NONZERO", data: "M 4 6 L 8 10 L 12 6" },
  ];
  chevron.strokeWeight = 1.5;
  chevron.strokeCap = "ROUND";
  chevron.strokeJoin = "ROUND";
  chevron.fills = [];
  bindStrokeColor(chevron, t.get("muted-foreground"));
  trigger.appendChild(chevron);

  return trigger;
}

// A plain text input (no icon) used for the time field.
function buildPlainInput(
  inputs: ComponentsInputs,
  value: string,
  width: number,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const input = figma.createFrame();
  input.name = "Time";
  input.layoutMode = "HORIZONTAL";
  input.primaryAxisSizingMode = "FIXED";
  input.counterAxisSizingMode = "FIXED";
  input.primaryAxisAlignItems = "MIN";
  input.counterAxisAlignItems = "CENTER";
  input.resize(width, TRIGGER_HEIGHT);
  input.paddingLeft = 10;
  input.paddingRight = 10;
  input.cornerRadius = 8;
  bindCornerRadii(input, p.get("radius/lg"));
  bindFill(input, t.get("background"));
  bindStrokeColor(input, t.get("input"));
  input.strokeWeight = 1;
  input.strokeAlign = "INSIDE";

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.characters = value;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get("foreground"));
  input.appendChild(text);

  return input;
}
