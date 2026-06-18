// Field: the form-field wrapper that groups a label, control, and description
// (plus an optional error). Mirrors radix-nova's Field primitives:
//
//   Field        `flex w-full gap-2`, vertical or horizontal orientation
//   FieldLabel   `text-sm font-medium leading-snug` (foreground)
//   FieldDescription `text-sm text-muted-foreground`
//   FieldError   `text-sm font-normal text-destructive`
//
// We surface the common compositions designers actually swap as a curated
// `Variant` axis — the control changes, not the orientation:
//   input     — label over a text input over a description (the default)
//   textarea  — label over a multi-line textarea over a description
//   select    — label over a select trigger (chevron) over a description
//   checkbox  — a switch-style row with the label/description beside it
//   invalid   — the input layout with a destructive error message
//
// Controls are faithful copies of radix-nova's Input (`h-8 px-2.5 rounded-lg
// border-input`), Textarea, Select trigger, and Switch so the field reads as a
// real form row. Everything binds the selected preset's semantic tokens,
// radius, and font.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { styleComponentSet } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const FIELD_VARIANTS = [
  "input",
  "textarea",
  "select",
  "checkbox",
  "invalid",
] as const;
type FieldVariant = (typeof FIELD_VARIANTS)[number];

const FIELD_WIDTH = 320;

export async function addFieldSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of FIELD_VARIANTS) {
    const comp = buildFieldComponent(inputs, variant);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Field";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildFieldComponent(
  inputs: ComponentsInputs,
  variant: FieldVariant,
): ComponentNode {
  const comp = figma.createComponent();
  comp.name = `Variant=${variant}`;
  comp.resize(FIELD_WIDTH, 10);

  if (variant === "checkbox") {
    return buildHorizontalField(comp, inputs);
  }
  return buildVerticalField(comp, inputs, variant);
}

// Vertical field: `flex-col gap-2` — label, control, description (and an error
// message replacing the description when invalid).
function buildVerticalField(
  comp: ComponentNode,
  inputs: ComponentsInputs,
  variant: Exclude<FieldVariant, "checkbox">,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const invalid = variant === "invalid";

  comp.layoutMode = "VERTICAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  // `gap-2`.
  comp.itemSpacing = 8;
  comp.fills = [];
  comp.strokes = [];

  const label = buildLabel(inputs, "Email", invalid);
  comp.appendChild(label);

  // The control swaps with the variant; the field shell stays identical. It
  // lives in a Control slot so instances can drop in any input/control.
  let control: FrameNode;
  if (variant === "textarea") {
    control = buildTextarea(inputs, "Tell us a little about yourself…");
  } else if (variant === "select") {
    control = buildSelectTrigger(inputs, "Select an option");
  } else {
    control = buildInput(inputs, "you@example.com", invalid);
  }
  const controlSlot = createConfiguredSlot(comp, "Control", [control], {
    description: "Field control (input, textarea, select, …).",
    settings: { minChildren: 1, maxChildren: 1 },
  });
  controlSlot.layoutMode = "VERTICAL";
  controlSlot.primaryAxisSizingMode = "AUTO";
  controlSlot.counterAxisSizingMode = "FIXED";
  controlSlot.fills = [];
  controlSlot.strokes = [];
  controlSlot.layoutSizingHorizontal = "FILL";
  control.layoutSizingHorizontal = "FILL";

  if (invalid) {
    const error = figma.createText();
    applyFont(error, "body", "Regular");
    error.characters = "Enter a valid email address.";
    error.fontSize = 14;
    bindFontSize(error, p.get("font/size/sm"));
    bindFill(error, t.get("destructive"));
    const errorSlot = createConfiguredSlot(comp, "Error", [error], {
      description: "Field error message.",
    });
    errorSlot.layoutMode = "VERTICAL";
    errorSlot.primaryAxisSizingMode = "AUTO";
    errorSlot.counterAxisSizingMode = "FIXED";
    errorSlot.fills = [];
    errorSlot.strokes = [];
    errorSlot.layoutSizingHorizontal = "FILL";
    error.layoutSizingHorizontal = "FILL";
  } else {
    const desc = buildDescription(
      inputs,
      "We'll use this to send you receipts.",
    );
    const descSlot = createConfiguredSlot(comp, "Description", [desc], {
      description: "Field description / helper text.",
    });
    descSlot.layoutMode = "VERTICAL";
    descSlot.primaryAxisSizingMode = "AUTO";
    descSlot.counterAxisSizingMode = "FIXED";
    descSlot.fills = [];
    descSlot.strokes = [];
    descSlot.layoutSizingHorizontal = "FILL";
    desc.layoutSizingHorizontal = "FILL";
  }

  return comp;
}

// Horizontal field: `flex-row items-start gap-2` — a switch control with the
// label + description stacked to its right (FieldContent).
function buildHorizontalField(
  comp: ComponentNode,
  inputs: ComponentsInputs,
): ComponentNode {
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "AUTO";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "MIN";
  // `gap-2`.
  comp.itemSpacing = 8;
  comp.fills = [];
  comp.strokes = [];

  const content = figma.createFrame();
  content.name = "Field Content";
  content.layoutMode = "VERTICAL";
  content.primaryAxisSizingMode = "AUTO";
  content.counterAxisSizingMode = "AUTO";
  // FieldContent: `gap-0.5 leading-snug`.
  content.itemSpacing = 2;
  content.fills = [];
  content.strokes = [];

  content.appendChild(buildLabel(inputs, "Marketing emails", false));
  content.appendChild(
    buildDescription(inputs, "Receive product updates and announcements."),
  );

  comp.appendChild(content);
  content.layoutGrow = 1;
  content.layoutSizingHorizontal = "FILL";

  // The switch control lives in a Control slot so instances can swap it.
  const control = buildSwitch(inputs);
  const controlSlot = createConfiguredSlot(comp, "Control", [control], {
    description: "Field control.",
    settings: { minChildren: 1, maxChildren: 1 },
  });
  controlSlot.layoutMode = "HORIZONTAL";
  controlSlot.primaryAxisSizingMode = "AUTO";
  controlSlot.counterAxisSizingMode = "AUTO";
  controlSlot.primaryAxisAlignItems = "CENTER";
  controlSlot.counterAxisAlignItems = "CENTER";
  controlSlot.fills = [];
  controlSlot.strokes = [];

  return comp;
}

function buildLabel(
  inputs: ComponentsInputs,
  text: string,
  invalid: boolean,
): TextNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const label = figma.createText();
  applyFont(label, "body", "Medium");
  label.characters = text;
  label.fontSize = 14;
  bindFontSize(label, p.get("font/size/sm"));
  // `data-[invalid=true]:text-destructive` propagates to the label.
  bindFill(label, invalid ? t.get("destructive") : t.get("foreground"));
  return label;
}

function buildDescription(inputs: ComponentsInputs, text: string): TextNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const desc = figma.createText();
  applyFont(desc, "body", "Regular");
  desc.characters = text;
  desc.fontSize = 14;
  bindFontSize(desc, p.get("font/size/sm"));
  bindFill(desc, t.get("muted-foreground"));
  return desc;
}

// Mirrors radix-nova's Input (`h-8 px-2.5 py-1 rounded-lg border-input`).
function buildInput(
  inputs: ComponentsInputs,
  value: string,
  invalid: boolean,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const input = figma.createFrame();
  input.name = "Input";
  input.layoutMode = "HORIZONTAL";
  input.primaryAxisSizingMode = "FIXED";
  input.counterAxisSizingMode = "FIXED";
  input.counterAxisAlignItems = "CENTER";
  input.resize(FIELD_WIDTH, 32);
  input.paddingLeft = 10;
  input.paddingRight = 10;
  input.paddingTop = 4;
  input.paddingBottom = 4;
  input.cornerRadius = 8;
  bindCornerRadii(input, p.get("radius/lg"));
  bindFill(input, t.get("background"));
  bindStrokeColor(input, invalid ? t.get("destructive") : t.get("input"));
  input.strokeWeight = 1;

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.characters = value;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get("muted-foreground"));
  input.appendChild(text);

  return input;
}

// Mirrors radix-nova's Textarea (`min-h-16 px-3 py-2 rounded-lg border-input`).
function buildTextarea(inputs: ComponentsInputs, value: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const area = figma.createFrame();
  area.name = "Textarea";
  area.layoutMode = "HORIZONTAL";
  area.primaryAxisSizingMode = "FIXED";
  area.counterAxisSizingMode = "FIXED";
  area.primaryAxisAlignItems = "MIN";
  area.counterAxisAlignItems = "MIN";
  area.resize(FIELD_WIDTH, 64);
  area.paddingLeft = 12;
  area.paddingRight = 12;
  area.paddingTop = 8;
  area.paddingBottom = 8;
  area.cornerRadius = 8;
  bindCornerRadii(area, p.get("radius/lg"));
  bindFill(area, t.get("background"));
  bindStrokeColor(area, t.get("input"));
  area.strokeWeight = 1;

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.characters = value;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get("muted-foreground"));
  area.appendChild(text);

  return area;
}

// Mirrors radix-nova's Select trigger (`h-8 px-2.5 rounded-lg border-input`
// with a trailing chevron).
function buildSelectTrigger(
  inputs: ComponentsInputs,
  placeholder: string,
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
  trigger.resize(FIELD_WIDTH, 32);
  trigger.itemSpacing = 6;
  trigger.paddingLeft = 10;
  trigger.paddingRight = 8;
  trigger.cornerRadius = 8;
  bindCornerRadii(trigger, p.get("radius/lg"));
  bindFill(trigger, t.get("background"));
  bindStrokeColor(trigger, t.get("input"));
  trigger.strokeWeight = 1;

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.characters = placeholder;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get("muted-foreground"));
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

// A small "on" switch (mirrors radix-nova's Switch: `h-[1.15rem] w-8 rounded-
// full bg-primary` with a `size-4` thumb pushed to the right).
function buildSwitch(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;

  const track = figma.createFrame();
  track.name = "Switch";
  track.layoutMode = "HORIZONTAL";
  track.primaryAxisSizingMode = "FIXED";
  track.counterAxisSizingMode = "FIXED";
  track.primaryAxisAlignItems = "MAX";
  track.counterAxisAlignItems = "CENTER";
  track.resize(32, 18);
  track.paddingLeft = 2;
  track.paddingRight = 2;
  track.cornerRadius = 999;
  bindFill(track, t.get("primary"));
  track.strokes = [];

  const thumb = figma.createEllipse();
  thumb.name = "Thumb";
  thumb.resize(14, 14);
  bindFill(thumb, t.get("background"));
  track.appendChild(thumb);

  return track;
}
