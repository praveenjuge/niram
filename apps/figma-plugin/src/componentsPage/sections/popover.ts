// Popover: floating content panel anchored to a trigger. Mirrors radix-nova's
// PopoverContent: `w-72 flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm
// text-popover-foreground shadow-md ring-1 ring-foreground/10`.
//
// The panel holds a PopoverHeader (`flex-col gap-0.5`) with a `font-medium`
// title and a `text-muted-foreground` description, then a short form row of
// label + input pairs to show the typical "Dimensions" demo content.

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

const POPOVER_WIDTH = 288; // w-72

export async function addPopoverSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = buildPopoverComponent(inputs);
  // radix-nova PopoverContent uses `shadow-md`; reference the published style.
  await applyEffectStyle(comp, inputs.effectStyles?.idFor("Shadow/md"));
  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

function buildPopoverComponent(inputs: ComponentsInputs): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = "Popover";
  comp.layoutMode = "VERTICAL";
  // resize() pins both axes to FIXED; re-set the primary axis to AUTO so the
  // panel hugs its content vertically at the fixed w-72 width.
  comp.resize(POPOVER_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  // `gap-2.5 p-2.5 rounded-lg`.
  comp.itemSpacing = 10;
  comp.paddingTop = 10;
  comp.paddingBottom = 10;
  comp.paddingLeft = 10;
  comp.paddingRight = 10;
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("popover"));
  // `ring-1 ring-foreground/10` — approximate with a 1px border.
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  // Header: title + description (`gap-0.5`).
  const header = figma.createFrame();
  header.name = "Popover Header";
  header.layoutMode = "VERTICAL";
  header.primaryAxisSizingMode = "AUTO";
  header.counterAxisSizingMode = "AUTO";
  header.itemSpacing = 2;
  header.fills = [];
  header.strokes = [];
  comp.appendChild(header);
  header.layoutSizingHorizontal = "FILL";

  const title = figma.createText();
  applyFont(title, "body", "Medium");
  title.characters = "Dimensions";
  title.fontSize = 14;
  bindFontSize(title, p.get("font/size/sm"));
  bindFill(title, t.get("popover-foreground"));
  header.appendChild(title);
  title.layoutSizingHorizontal = "FILL";

  const desc = figma.createText();
  applyFont(desc, "body", "Regular");
  desc.characters = "Set the dimensions for the layer.";
  desc.fontSize = 14;
  bindFontSize(desc, p.get("font/size/sm"));
  bindFill(desc, t.get("muted-foreground"));
  header.appendChild(desc);
  desc.layoutSizingHorizontal = "FILL";

  // Form: two label + input rows, wrapped in a Content slot so instances can
  // compose their own popover body.
  const widthRow = buildFieldRow(inputs, "Width", "100%");
  const heightRow = buildFieldRow(inputs, "Height", "25px");
  const form = createConfiguredSlot(comp, "Content", [widthRow, heightRow], {
    description: "Popover content.",
  });
  form.layoutMode = "VERTICAL";
  form.primaryAxisSizingMode = "AUTO";
  form.counterAxisSizingMode = "AUTO";
  form.itemSpacing = 8;
  form.fills = [];
  form.strokes = [];
  form.layoutSizingHorizontal = "FILL";
  for (const row of form.children) {
    (row as FrameNode).layoutSizingHorizontal = "FILL";
  }

  return comp;
}

// A label + input pair laid out as a row, matching the popover demo where the
// label sits left of a flexible input.
function buildFieldRow(
  inputs: ComponentsInputs,
  labelText: string,
  value: string,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = "Field";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.primaryAxisAlignItems = "MIN";
  row.counterAxisAlignItems = "CENTER";
  row.itemSpacing = 8;
  row.fills = [];
  row.strokes = [];

  const label = figma.createText();
  applyFont(label, "body", "Regular");
  label.characters = labelText;
  label.fontSize = 14;
  bindFontSize(label, p.get("font/size/sm"));
  bindFill(label, t.get("foreground"));
  row.appendChild(label);
  // Fixed label column so the inputs align.
  label.resize(64, label.height);
  label.layoutSizingHorizontal = "FIXED";

  // Input — mirrors radix-nova's compact Input (`h-8 px-2.5 rounded-lg`).
  const input = figma.createFrame();
  input.name = "Input";
  input.layoutMode = "HORIZONTAL";
  input.counterAxisSizingMode = "FIXED";
  input.primaryAxisSizingMode = "FIXED";
  input.counterAxisAlignItems = "CENTER";
  input.resize(160, 32);
  input.paddingLeft = 10;
  input.paddingRight = 10;
  input.cornerRadius = 8;
  bindCornerRadii(input, p.get("radius/lg"));
  bindFill(input, t.get("background"));
  bindStrokeColor(input, t.get("input"));
  input.strokeWeight = 1;
  row.appendChild(input);
  input.layoutSizingHorizontal = "FILL";

  const inputText = figma.createText();
  applyFont(inputText, "body", "Regular");
  inputText.characters = value;
  inputText.fontSize = 14;
  bindFontSize(inputText, p.get("font/size/sm"));
  bindFill(inputText, t.get("foreground"));
  input.appendChild(inputText);

  return row;
}
