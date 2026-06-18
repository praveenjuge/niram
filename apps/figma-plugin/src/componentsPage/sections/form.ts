// Form: shadcn doesn't ship a visual Form primitive — a form field is a
// composition of a Label over a control (FormField/FormItem). So instead of
// redrawing those, each variant here embeds live *instances* of the Label and
// Input components the page already built, exactly like the Toggle embeds an
// instance of the published icon set. Edit the Input's radius or the Label's
// weight once and every form field variant updates with it.
//
// It's a real component *variant set* (`Field=Email`, `Field=Password`) you can
// drop in anywhere and relabel, not just a showcase. Form builds in the
// deferred phase (see componentsPage/index.ts) because its source sets (Input,
// Label) must already exist on the page before it can instantiate them. When a
// source is missing (older callers/tests building this section in isolation) it
// falls back to a plain drawn control so the variant still renders.

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
import {
  countDescendants,
  findInstanceSource,
  instantiateBuiltComponent,
} from "../utils";

const FORM_WIDTH = 360;

// A field variant: the `Field` value (variant property), the label copy, and
// the input placeholder it reuses.
type FieldData = { field: string; label: string; placeholder: string };
const FIELDS: FieldData[] = [
  { field: "Email", label: "Email", placeholder: "you@example.com" },
  { field: "Password", label: "Password", placeholder: "••••••••" },
];

export async function addFormSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const root = page as unknown as SceneNode;
  // Reuse the resting variants so each field reads as a clean default state.
  const labelSource = findInstanceSource(root, "Label");
  const inputSource = findInstanceSource(
    root,
    "Input",
    "State=default, Leading=none",
  );

  const components: ComponentNode[] = [];
  for (const data of FIELDS) {
    const comp = buildFieldVariant(inputs, data, labelSource, inputSource);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Form";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 24;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

// One label-over-control field (`FormItem`: `grid gap-2`). Reuses the Label and
// Input instances when available; otherwise draws plain stand-ins.
function buildFieldVariant(
  inputs: ComponentsInputs,
  data: FieldData,
  labelSource: ComponentNode | undefined,
  inputSource: ComponentNode | undefined,
): ComponentNode {
  const comp = figma.createComponent();
  comp.name = `Field=${data.field}`;
  comp.layoutMode = "VERTICAL";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisSizingMode = "AUTO";
  // resize() pins both axes to FIXED; re-set the primary axis to AUTO so the
  // field hugs the label + input height instead of freezing at 1px.
  comp.resize(FORM_WIDTH, 1);
  comp.primaryAxisSizingMode = "AUTO";
  // FormItem: `gap-2`.
  comp.itemSpacing = 8;
  comp.fills = [];
  comp.strokes = [];

  const label = labelSource
    ? instantiateBuiltComponent(labelSource, data.label)
    : undefined;
  const labelNode: SceneNode = label ?? buildFallbackLabel(inputs, data.label);

  const input = inputSource
    ? instantiateBuiltComponent(inputSource, data.placeholder)
    : undefined;
  const controlNode: SceneNode =
    input ?? buildFallbackInput(inputs, data.placeholder);

  // The label + control live in a Fields slot so instances can compose the
  // form (add fields, swap controls) without detaching.
  const fields = createConfiguredSlot(
    comp,
    "Fields",
    [labelNode, controlNode],
    {
      description: "Form field (label + control).",
      settings: { minChildren: 1 },
    },
  );
  fields.layoutMode = "VERTICAL";
  fields.primaryAxisSizingMode = "AUTO";
  fields.counterAxisSizingMode = "FIXED";
  fields.itemSpacing = 8;
  fields.fills = [];
  fields.strokes = [];
  fields.layoutSizingHorizontal = "FILL";
  try {
    controlNode.layoutSizingHorizontal = "FILL";
  } catch {
    // Leave the instance at its built width if the host rejects FILL.
  }

  return comp;
}

// ----- Fallbacks (used only when a source component isn't on the page) -----

function buildFallbackLabel(inputs: ComponentsInputs, text: string): TextNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const label = figma.createText();
  applyFont(label, "body", "Medium");
  label.characters = text;
  label.fontSize = 14;
  bindFontSize(label, p.get("font/size/sm"));
  bindFill(label, t.get("foreground"));
  return label;
}

function buildFallbackInput(
  inputs: ComponentsInputs,
  value: string,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const input = figma.createFrame();
  input.name = "Input";
  input.layoutMode = "HORIZONTAL";
  input.primaryAxisSizingMode = "FIXED";
  input.counterAxisSizingMode = "FIXED";
  input.counterAxisAlignItems = "CENTER";
  input.resize(FORM_WIDTH, 32);
  input.paddingLeft = 10;
  input.paddingRight = 10;
  input.cornerRadius = 8;
  bindCornerRadii(input, p.get("radius/lg"));
  bindFill(input, t.get("background"));
  bindStrokeColor(input, t.get("input"));
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
