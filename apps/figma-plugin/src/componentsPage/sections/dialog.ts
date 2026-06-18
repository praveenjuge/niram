// Dialog: a modal card with header (title + description), body, and a footer
// row of actions plus a close button.
//
// Mirrors radix-nova's DialogContent: `max-w-sm gap-4 rounded-xl bg-popover
// p-4 text-sm text-popover-foreground ring-1 ring-foreground/10`. The title
// is `text-base font-medium`, the description `text-sm text-muted-foreground`,
// and the footer is `-mx-4 -mb-4 border-t bg-muted/50 p-4` justified to the
// end. A ghost icon-sm close button sits top-right.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary } from "../../icons";
import { wrapInSectionCard } from "../layout";
import { createCloseGlyph } from "../glyphs";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";
import {
  collectByTypeAndName,
  createConfiguredSlot,
  defineBooleanProperty,
  defineTextProperty,
} from "../properties";

const DIALOG_WIDTH = 384; // max-w-sm

export async function addDialogSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = buildDialogComponent(inputs);

  // Expose the dialog title/description copy and a toggle for the description.
  defineTextProperty(
    comp,
    "Title",
    "Are you absolutely sure?",
    collectByTypeAndName(comp, "TEXT", "Title"),
  );
  const descNodes = collectByTypeAndName(comp, "TEXT", "Description");
  defineTextProperty(
    comp,
    "Description",
    "This action cannot be undone. This will permanently delete your account.",
    descNodes,
  );
  defineBooleanProperty(comp, "Show Description", true, descNodes);

  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

function buildDialogComponent(inputs: ComponentsInputs): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = "Dialog";
  comp.layoutMode = "VERTICAL";
  // Resize before declaring sizing modes — resize() pins both axes to FIXED;
  // re-setting the primary axis to AUTO lets Figma hug the content vertically.
  comp.resize(DIALOG_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  // radix-nova DialogContent: `gap-4 rounded-xl p-4`. The footer extends to
  // the edges with negative margins, so we keep the body padding on the
  // inner sections instead of the root and add it per-section below.
  comp.itemSpacing = 16;
  comp.paddingTop = 16;
  comp.paddingBottom = 0; // footer carries the bottom edge.
  comp.paddingLeft = 0;
  comp.paddingRight = 0;
  comp.cornerRadius = 12;
  bindCornerRadii(comp, p.get("radius/xl"));
  bindFill(comp, t.get("popover"));
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";
  comp.clipsContent = true;

  // Header: title + description (`flex flex-col gap-2`), with a trailing
  // close button laid over the top-right corner.
  const headerRow = figma.createFrame();
  headerRow.name = "Header Row";
  headerRow.layoutMode = "HORIZONTAL";
  headerRow.primaryAxisSizingMode = "FIXED";
  headerRow.counterAxisSizingMode = "AUTO";
  headerRow.primaryAxisAlignItems = "SPACE_BETWEEN";
  headerRow.counterAxisAlignItems = "MIN";
  headerRow.itemSpacing = 8;
  headerRow.paddingLeft = 16;
  headerRow.paddingRight = 16;
  headerRow.fills = [];
  headerRow.strokes = [];
  comp.appendChild(headerRow);
  headerRow.layoutSizingHorizontal = "FILL";

  const header = figma.createFrame();
  header.name = "Header";
  header.layoutMode = "VERTICAL";
  header.primaryAxisSizingMode = "AUTO";
  header.counterAxisSizingMode = "AUTO";
  header.itemSpacing = 8;
  header.fills = [];
  header.strokes = [];
  headerRow.appendChild(header);
  header.layoutSizingHorizontal = "FILL";

  const title = figma.createText();
  applyFont(title, "heading", "Medium");
  title.name = "Title";
  title.characters = "Are you absolutely sure?";
  title.fontSize = 16;
  bindFontSize(title, p.get("font/size/base"));
  bindFill(title, t.get("popover-foreground"));
  header.appendChild(title);
  title.layoutSizingHorizontal = "FILL";

  const desc = figma.createText();
  applyFont(desc, "body", "Regular");
  desc.name = "Description";
  desc.characters =
    "This action cannot be undone. This will permanently delete your account.";
  desc.fontSize = 14;
  bindFontSize(desc, p.get("font/size/sm"));
  bindFill(desc, t.get("muted-foreground"));
  header.appendChild(desc);
  desc.layoutSizingHorizontal = "FILL";

  // Close button: ghost icon-sm (28×28, rounded-md) with an "✕" glyph.
  headerRow.appendChild(buildCloseButton(inputs));

  // Footer: `-mx-4 -mb-4 border-t bg-muted/50 p-4` justify-end with two
  // buttons (outline "Cancel" + solid "Continue").
  const footer = figma.createFrame();
  footer.name = "Footer";
  footer.layoutMode = "HORIZONTAL";
  footer.primaryAxisSizingMode = "FIXED";
  footer.counterAxisSizingMode = "AUTO";
  footer.primaryAxisAlignItems = "MAX";
  footer.counterAxisAlignItems = "CENTER";
  footer.itemSpacing = 8;
  footer.paddingTop = 16;
  footer.paddingBottom = 16;
  footer.paddingLeft = 16;
  footer.paddingRight = 16;
  bindFill(footer, t.get("muted"));
  bindStrokeColor(footer, t.get("border"));
  footer.strokeWeight = 1;
  footer.strokeAlign = "INSIDE";
  footer.strokeTopWeight = 1;
  footer.strokeBottomWeight = 0;
  footer.strokeLeftWeight = 0;
  footer.strokeRightWeight = 0;
  comp.appendChild(footer);
  footer.layoutSizingHorizontal = "FILL";

  // Footer actions live in a slot so instances can swap their own buttons in
  // without detaching; the footer frame stays as fixed chrome.
  const actions = createConfiguredSlot(
    comp,
    "Actions",
    [
      buildButton(inputs, "Cancel", "outline"),
      buildButton(inputs, "Continue", "default"),
    ],
    { description: "Dialog footer actions." },
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

function buildCloseButton(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = "Close";
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.resize(28, 28);
  btn.primaryAxisSizingMode = "FIXED";
  btn.counterAxisSizingMode = "FIXED";
  btn.cornerRadius = 6;
  bindCornerRadii(btn, p.get("radius/md"));
  btn.fills = [];
  btn.strokes = [];

  // Close button glyph: a real `close` icon from the preset's icon library,
  // tinted muted-foreground. Falls back to a vector "✕" when the active library
  // has no candidate — never a text glyph, since "✕" (U+2715) forces an
  // unloaded symbol-font substitution that breaks setValueForMode on re-run.
  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "close",
    size: 16,
    color: t.get("muted-foreground"),
  });
  if (icon) icon.name = "Icon";
  btn.appendChild(icon ?? createCloseGlyph(t.get("muted-foreground")));

  return btn;
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
  // radix-nova default button: `h-8 px-2.5 rounded-lg`.
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
