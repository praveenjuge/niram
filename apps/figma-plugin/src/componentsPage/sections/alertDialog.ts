// Alert Dialog: a modal confirmation. Mirrors shadcn's AlertDialog (radix-ui
// primitive): `max-w-lg gap-4 rounded-lg border bg-background p-6 shadow-lg`
// with an AlertDialogHeader (`gap-2`) holding a `text-lg font-semibold` title
// and a `text-sm text-muted-foreground` description, then an
// AlertDialogFooter (`flex justify-end gap-2`) with a "Cancel" outline button
// and a solid "Continue" action.
//
// Unlike Dialog, there is no close (✕) button — alert dialogs force an
// explicit choice. We render the destructive-confirmation demo content.

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

const ALERT_DIALOG_WIDTH = 448; // max-w-lg-ish, sized for the card

export async function addAlertDialogSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = buildAlertDialogComponent(inputs);
  // shadcn AlertDialogContent uses `shadow-lg`.
  await applyEffectStyle(comp, inputs.effectStyles?.idFor("Shadow/lg"));
  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

function buildAlertDialogComponent(inputs: ComponentsInputs): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = "Alert Dialog";
  comp.layoutMode = "VERTICAL";
  comp.resize(ALERT_DIALOG_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  // `gap-4 rounded-lg p-6`.
  comp.itemSpacing = 16;
  comp.paddingTop = 24;
  comp.paddingBottom = 24;
  comp.paddingLeft = 24;
  comp.paddingRight = 24;
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("background"));
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  // Header: title + description (`gap-2`).
  const header = figma.createFrame();
  header.name = "Header";
  header.layoutMode = "VERTICAL";
  header.primaryAxisSizingMode = "AUTO";
  header.counterAxisSizingMode = "AUTO";
  header.itemSpacing = 8;
  header.fills = [];
  header.strokes = [];
  comp.appendChild(header);
  header.layoutSizingHorizontal = "FILL";

  const title = figma.createText();
  applyFont(title, "heading", "Semi Bold");
  title.characters = "Are you absolutely sure?";
  title.fontSize = 18;
  bindFontSize(title, p.get("font/size/lg"));
  bindFill(title, t.get("foreground"));
  header.appendChild(title);
  title.layoutSizingHorizontal = "FILL";

  const desc = figma.createText();
  applyFont(desc, "body", "Regular");
  desc.characters =
    "This action cannot be undone. This will permanently delete your account and remove your data from our servers.";
  desc.fontSize = 14;
  bindFontSize(desc, p.get("font/size/sm"));
  bindFill(desc, t.get("muted-foreground"));
  header.appendChild(desc);
  desc.layoutSizingHorizontal = "FILL";

  // Footer: justify-end with Cancel (outline) + Continue (solid).
  const footer = figma.createFrame();
  footer.name = "Footer";
  footer.layoutMode = "HORIZONTAL";
  footer.primaryAxisSizingMode = "FIXED";
  footer.counterAxisSizingMode = "AUTO";
  footer.primaryAxisAlignItems = "MAX";
  footer.counterAxisAlignItems = "CENTER";
  footer.itemSpacing = 8;
  footer.fills = [];
  footer.strokes = [];
  comp.appendChild(footer);
  footer.layoutSizingHorizontal = "FILL";

  // Footer actions live in a slot so instances can compose their own
  // confirm/cancel buttons without detaching.
  const actions = createConfiguredSlot(
    comp,
    "Actions",
    [
      buildButton(inputs, "Cancel", "outline"),
      buildButton(inputs, "Continue", "default"),
    ],
    { description: "Alert dialog footer actions." },
  );
  footer.appendChild(actions);
  actions.layoutMode = "HORIZONTAL";
  actions.primaryAxisSizingMode = "FIXED";
  actions.counterAxisSizingMode = "AUTO";
  actions.primaryAxisAlignItems = "MAX";
  actions.counterAxisAlignItems = "CENTER";
  actions.itemSpacing = 8;
  actions.fills = [];
  actions.layoutSizingHorizontal = "FILL";

  return comp;
}

function buildButton(
  inputs: ComponentsInputs,
  label: string,
  variant: "default" | "outline",
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = `Button (${variant})`;
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "AUTO";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.paddingLeft = 10;
  btn.paddingRight = 10;
  btn.resize(80, 32);
  btn.primaryAxisSizingMode = "AUTO";
  btn.cornerRadius = 8;
  bindCornerRadii(btn, p.get("radius/lg"));
  btn.strokes = [];

  if (variant === "outline") {
    bindFill(btn, t.get("background"));
    bindStrokeColor(btn, t.get("border"));
    btn.strokeWeight = 1;
  } else {
    bindFill(btn, t.get("primary"));
  }

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(
    text,
    t.get(variant === "outline" ? "foreground" : "primary-foreground"),
  );
  btn.appendChild(text);

  return btn;
}
