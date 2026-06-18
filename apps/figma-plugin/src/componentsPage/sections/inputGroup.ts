// Input Group: an input shell that hosts inline addons (icons, text, buttons,
// kbd hints, loading spinners) before/after the control. Mirrors radix-nova's
// InputGroup: `flex h-8 w-full items-center rounded-lg border border-input`,
// with InputGroupAddon (`text-sm text-muted-foreground`, `inline-start` adds
// `pl-2`, `inline-end` adds `pr-2`) and a flexible InputGroupInput in the
// middle.
//
// We surface the common compositions designers actually swap as a curated
// `Variant` axis:
//   icon      — a leading search icon + placeholder text
//   text      — a leading `text-muted-foreground` prefix (e.g. "https://")
//   kbd       — a trailing keyboard-shortcut hint chip (`⌘K`)
//   button    — a trailing ghost button addon
//   spinner   — a trailing loading spinner (the async/pending state)
//   textarea  — a multi-line shell with a block addon row beneath the control
//
// Every variant binds the selected preset's semantic tokens, radius, and font.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const INPUT_GROUP_VARIANTS = [
  "icon",
  "text",
  "kbd",
  "button",
  "spinner",
  "textarea",
] as const;
type InputGroupVariant = (typeof INPUT_GROUP_VARIANTS)[number];

const INPUT_GROUP_WIDTH = 320;
const INPUT_GROUP_HEIGHT = 32;

export async function addInputGroupSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of INPUT_GROUP_VARIANTS) {
    const comp =
      variant === "textarea"
        ? buildTextareaGroup(inputs)
        : buildInputGroupComponent(inputs, variant);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Input Group";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildInputGroupComponent(
  inputs: ComponentsInputs,
  variant: Exclude<InputGroupVariant, "textarea">,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const hasTrailingButton = variant === "button";

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(INPUT_GROUP_WIDTH, INPUT_GROUP_HEIGHT);
  // InputGroup: `h-8 rounded-lg border-input`. Addons own their own padding,
  // so the shell carries a small horizontal gap and inset only.
  comp.itemSpacing = 6;
  comp.paddingLeft = hasTrailingButton ? 10 : 8;
  comp.paddingRight = hasTrailingButton ? 4 : 8;
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("background"));
  bindStrokeColor(comp, t.get("input"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  // Leading addon slot (icon or text prefix).
  const leadingChildren: SceneNode[] = [];
  if (variant === "icon") {
    const icon = createIcon({
      library: resolveIconLibrary(inputs.presetSummary),
      name: "search",
      size: 16,
      color: t.get("muted-foreground"),
    });
    if (icon) {
      icon.name = "Icon";
      leadingChildren.push(icon);
    }
  } else if (variant === "text") {
    const prefix = figma.createText();
    applyFont(prefix, "body", "Regular");
    prefix.characters = "https://";
    prefix.fontSize = 14;
    bindFontSize(prefix, p.get("font/size/sm"));
    bindFill(prefix, t.get("muted-foreground"));
    leadingChildren.push(prefix);
  }
  if (leadingChildren.length > 0) {
    const leading = createConfiguredSlot(comp, "Leading", leadingChildren, {
      description: "Leading add-on (icon, text, button).",
    });
    leading.layoutMode = "HORIZONTAL";
    leading.primaryAxisSizingMode = "AUTO";
    leading.counterAxisSizingMode = "AUTO";
    leading.counterAxisAlignItems = "CENTER";
    leading.itemSpacing = 6;
    leading.fills = [];
    leading.strokes = [];
  }

  // The control: a flexible muted placeholder that grows to fill the shell.
  const control = figma.createText();
  applyFont(control, "body", "Regular");
  control.characters = variant === "text" ? "niram.dev" : "Search components";
  control.fontSize = 14;
  bindFontSize(control, p.get("font/size/sm"));
  bindFill(
    control,
    variant === "text" ? t.get("foreground") : t.get("muted-foreground"),
  );
  comp.appendChild(control);
  control.layoutGrow = 1;

  // Trailing addon slot.
  const trailingChildren: SceneNode[] = [];
  if (variant === "button") {
    trailingChildren.push(buildAddonButton(inputs, "Submit"));
  } else if (variant === "kbd") {
    trailingChildren.push(buildKbd(inputs, "⌘K"));
  } else if (variant === "spinner") {
    trailingChildren.push(buildSpinner(inputs));
  }
  if (trailingChildren.length > 0) {
    const trailing = createConfiguredSlot(comp, "Trailing", trailingChildren, {
      description: "Trailing add-on (button, kbd, spinner).",
    });
    trailing.layoutMode = "HORIZONTAL";
    trailing.primaryAxisSizingMode = "AUTO";
    trailing.counterAxisSizingMode = "AUTO";
    trailing.counterAxisAlignItems = "CENTER";
    trailing.itemSpacing = 6;
    trailing.fills = [];
    trailing.strokes = [];
  }

  return comp;
}

// Textarea group: a vertical shell with the control on top and a block addon
// row (a small ghost button) beneath it — mirrors InputGroupTextarea with a
// `block-end` InputGroupAddon.
function buildTextareaGroup(inputs: ComponentsInputs): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = "Variant=textarea";
  comp.layoutMode = "VERTICAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "MIN";
  comp.resize(INPUT_GROUP_WIDTH, 88);
  comp.itemSpacing = 8;
  comp.paddingLeft = 12;
  comp.paddingRight = 8;
  comp.paddingTop = 8;
  comp.paddingBottom = 8;
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("background"));
  bindStrokeColor(comp, t.get("input"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  const control = figma.createText();
  applyFont(control, "body", "Regular");
  control.characters = "Ask a question…";
  control.fontSize = 14;
  bindFontSize(control, p.get("font/size/sm"));
  bindFill(control, t.get("muted-foreground"));
  comp.appendChild(control);
  control.layoutGrow = 1;
  control.layoutSizingHorizontal = "FILL";

  // `block-end` addon row, right-aligned send button.
  const addon = figma.createFrame();
  addon.name = "Addon";
  addon.layoutMode = "HORIZONTAL";
  addon.primaryAxisSizingMode = "FIXED";
  addon.counterAxisSizingMode = "AUTO";
  addon.primaryAxisAlignItems = "MAX";
  addon.counterAxisAlignItems = "CENTER";
  addon.fills = [];
  addon.strokes = [];
  comp.appendChild(addon);
  addon.layoutSizingHorizontal = "FILL";
  // The block-end addon's content lives in a Trailing slot.
  const trailing = createConfiguredSlot(
    comp,
    "Trailing",
    [buildAddonButton(inputs, "Send")],
    { description: "Trailing add-on." },
  );
  addon.appendChild(trailing);
  trailing.layoutMode = "HORIZONTAL";
  trailing.primaryAxisSizingMode = "FIXED";
  trailing.counterAxisSizingMode = "AUTO";
  trailing.primaryAxisAlignItems = "MAX";
  trailing.counterAxisAlignItems = "CENTER";
  trailing.fills = [];
  trailing.strokes = [];
  trailing.layoutSizingHorizontal = "FILL";

  return comp;
}

function buildAddonButton(inputs: ComponentsInputs, label: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = "Addon Button";
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "AUTO";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.resize(btn.width, 24);
  btn.primaryAxisSizingMode = "AUTO";
  btn.paddingLeft = 6;
  btn.paddingRight = 6;
  btn.cornerRadius = 6;
  bindCornerRadii(btn, p.get("radius/md"));
  // Ghost button addon: a muted surface so it reads as an interactive chip.
  bindFill(btn, t.get("muted"));
  btn.strokes = [];

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 12;
  bindFontSize(text, p.get("font/size/xs"));
  bindFill(text, t.get("foreground"));
  btn.appendChild(text);

  return btn;
}

// A keyboard-shortcut hint chip (`Kbd`: `h-5 rounded-sm bg-muted px-1.5
// text-xs`).
function buildKbd(inputs: ComponentsInputs, label: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const chip = figma.createFrame();
  chip.name = "Kbd";
  chip.layoutMode = "HORIZONTAL";
  chip.primaryAxisSizingMode = "AUTO";
  chip.counterAxisSizingMode = "FIXED";
  chip.primaryAxisAlignItems = "CENTER";
  chip.counterAxisAlignItems = "CENTER";
  chip.resize(chip.width, 20);
  chip.primaryAxisSizingMode = "AUTO";
  chip.paddingLeft = 6;
  chip.paddingRight = 6;
  chip.cornerRadius = 4;
  bindCornerRadii(chip, p.get("radius/sm"));
  bindFill(chip, t.get("muted"));
  chip.strokes = [];

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 12;
  bindFontSize(text, p.get("font/size/xs"));
  bindFill(text, t.get("muted-foreground"));
  chip.appendChild(text);

  return chip;
}

// A small loading spinner: a muted ring with an accent arc, as the trailing
// `pending`/`loading` addon.
function buildSpinner(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;

  const wrap = figma.createFrame();
  wrap.name = "Spinner";
  wrap.layoutMode = "HORIZONTAL";
  wrap.primaryAxisSizingMode = "FIXED";
  wrap.counterAxisSizingMode = "FIXED";
  wrap.primaryAxisAlignItems = "CENTER";
  wrap.counterAxisAlignItems = "CENTER";
  wrap.resize(16, 16);
  wrap.fills = [];
  wrap.strokes = [];

  // Muted base ring.
  const ring = figma.createEllipse();
  ring.name = "Track";
  ring.resize(14, 14);
  ring.fills = [];
  bindStrokeColor(ring, t.get("border"));
  ring.strokeWeight = 1.5;
  wrap.appendChild(ring);

  // Accent arc (open path) suggesting motion. Figma's vector path parser does
  // not support the SVG arc (`A`) command, so approximate a quarter circle
  // with a cubic bezier (control offset ≈ 0.5523·r).
  const arc = figma.createVector();
  arc.name = "Arc";
  arc.resize(14, 14);
  arc.vectorPaths = [
    { windingRule: "NONZERO", data: "M 7 0.5 C 10.59 0.5 13.5 3.41 13.5 7" },
  ];
  arc.fills = [];
  arc.strokeWeight = 1.5;
  arc.strokeCap = "ROUND";
  bindStrokeColor(arc, t.get("muted-foreground"));
  wrap.appendChild(arc);

  return wrap;
}
