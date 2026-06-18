// Sonner (Toast): a transient notification. Mirrors radix-nova's Toaster,
// which themes sonner with `--normal-bg: var(--popover)`, `--normal-text:
// var(--popover-foreground)`, `--normal-border: var(--border)` and the
// `.cn-toast` rule `rounded-2xl`. The default toast carries `shadow-lg`.
//
// Demo content (sonner-demo): a title "Event has been created", a
// `text-muted-foreground` description "Sunday, December 03, 2023 at 9:00 AM",
// and a trailing "Undo" action button. A leading status icon mirrors the
// `toast.success` icon set radix-nova wires up (CircleCheckIcon at size-4).

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
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const TOAST_WIDTH = 356; // sonner's default toast width.

// sonner exposes `toast`, `toast.success`, `toast.error`, `toast.warning`.
// Each tints the leading status icon; the surface stays neutral (popover).
const TOAST_TYPES = ["default", "success", "error", "warning"] as const;
type ToastType = (typeof TOAST_TYPES)[number];

export async function addSonnerSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const type of TOAST_TYPES) {
    const comp = buildToastComponent(inputs, type);
    // sonner's default toast uses `shadow-lg`; reference the published style.
    await applyEffectStyle(comp, inputs.effectStyles?.idFor("Shadow/lg"));
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Sonner";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildToastComponent(
  inputs: ComponentsInputs,
  type: ToastType,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const tw = inputs.tailwindColors;

  const comp = figma.createComponent();
  comp.name = `Type=${type}`;
  comp.layoutMode = "HORIZONTAL";
  // resize() pins both axes to FIXED; re-set the counter axis to AUTO so the
  // toast hugs its content height at the fixed width.
  comp.resize(TOAST_WIDTH, 10);
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "AUTO";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  // sonner default toast: `gap-1.5 p-4`, `.cn-toast` rounds it `rounded-2xl`.
  comp.itemSpacing = 12;
  comp.paddingTop = 16;
  comp.paddingBottom = 16;
  comp.paddingLeft = 16;
  comp.paddingRight = 16;
  comp.cornerRadius = 16;
  bindCornerRadii(comp, p.get("radius/2xl"));
  bindFill(comp, t.get("popover"));
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  // Leading status icon (`size-4`), tinted per toast type. The default toast
  // uses an `info` glyph in the neutral text colour.
  const iconColor = toastIconColor(type, t, tw);
  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: toastIconName(type),
    size: 16,
    color: iconColor,
  });
  if (icon) {
    icon.name = "Icon";
    comp.appendChild(icon);
  }

  // Text column: title + description (`flex flex-col gap-0.5`).
  const textCol = figma.createFrame();
  textCol.name = "Text";
  textCol.layoutMode = "VERTICAL";
  textCol.primaryAxisSizingMode = "AUTO";
  textCol.counterAxisSizingMode = "AUTO";
  textCol.itemSpacing = 2;
  textCol.fills = [];
  textCol.strokes = [];
  comp.appendChild(textCol);
  textCol.layoutGrow = 1;
  textCol.layoutSizingHorizontal = "FILL";

  const title = figma.createText();
  applyFont(title, "body", "Medium");
  title.characters = toastTitle(type);
  title.fontSize = 14;
  bindFontSize(title, p.get("font/size/sm"));
  bindFill(title, t.get("popover-foreground"));
  textCol.appendChild(title);
  title.layoutSizingHorizontal = "FILL";

  const desc = figma.createText();
  applyFont(desc, "body", "Regular");
  desc.characters = toastDescription(type);
  desc.fontSize = 12;
  bindFontSize(desc, p.get("font/size/xs"));
  bindFill(desc, t.get("muted-foreground"));
  textCol.appendChild(desc);
  desc.layoutSizingHorizontal = "FILL";

  // Action button: sonner's action button uses the `--normal` button styling;
  // we render the default solid button at the compact h-6 sonner size.
  comp.appendChild(buildActionButton(inputs, "Undo"));

  return comp;
}

function toastIconName(type: ToastType): SemanticIconName {
  switch (type) {
    case "default":
      return "info";
    case "success":
      return "success";
    case "error":
    case "warning":
      return "warning";
  }
}

function toastIconColor(
  type: ToastType,
  t: Map<string, Variable>,
  tw: Map<string, Variable>,
): Variable | undefined {
  switch (type) {
    case "default":
      return t.get("popover-foreground");
    case "success":
      return tw.get("green/600");
    case "error":
      return t.get("destructive");
    case "warning":
      return tw.get("amber/600");
  }
}

function toastTitle(type: ToastType): string {
  switch (type) {
    case "default":
      return "Event has been created";
    case "success":
      return "Changes saved";
    case "error":
      return "Something went wrong";
    case "warning":
      return "Heads up";
  }
}

function toastDescription(type: ToastType): string {
  switch (type) {
    case "default":
      return "Sunday, December 03, 2023 at 9:00 AM";
    case "success":
      return "Your profile has been updated.";
    case "error":
      return "We couldn't save your changes. Try again.";
    case "warning":
      return "Your session will expire in 5 minutes.";
  }
}

function buildActionButton(inputs: ComponentsInputs, label: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = "Action";
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "AUTO";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.paddingLeft = 8;
  btn.paddingRight = 8;
  btn.resize(60, 24);
  btn.primaryAxisSizingMode = "AUTO";
  btn.cornerRadius = 6;
  bindCornerRadii(btn, p.get("radius/md"));
  bindFill(btn, t.get("primary"));
  btn.strokes = [];

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 12;
  bindFontSize(text, p.get("font/size/xs"));
  bindFill(text, t.get("primary-foreground"));
  btn.appendChild(text);

  return btn;
}
