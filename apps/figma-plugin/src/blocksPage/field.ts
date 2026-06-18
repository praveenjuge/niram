// Shared form-field builder for the auth blocks (login, signup).
//
// A field is a Label over an Input — the same FormItem composition shadcn ships
// and the Components page's Form section models. We embed live instances of the
// page-built Label and Input components so editing either updates every field
// in every block. When the Components page isn't available (isolated callers /
// tests) we fall back to a plain drawn label + input so the block still renders.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../componentsPage/bindings";
import { applyFont } from "../fonts";
import { createBody, createColumn, createRow } from "./layout";
import type { BlocksInputs } from "./types";
import {
  fillWidth,
  growWidth,
  instanceFromComponents,
  overrideFirstText,
} from "./utils";

// Build one label-over-input field. Reuses the Label + Input instances when the
// Components page is present; otherwise draws plain stand-ins.
export function buildField(
  inputs: BlocksInputs,
  width: number,
  label: string,
  placeholder: string,
): FrameNode {
  const col = createColumn("Field", 8);
  col.resize(width, 10);
  col.primaryAxisSizingMode = "AUTO";
  col.counterAxisSizingMode = "FIXED";

  // Label — reuse the published Label component.
  const labelInstance = instanceFromComponents(
    inputs,
    "Label",
    undefined,
    label,
  );
  if (labelInstance) {
    col.appendChild(labelInstance);
  } else {
    col.appendChild(buildFallbackLabel(inputs, label));
  }

  // Input — reuse the resting default variant so the field reads as a clean
  // empty state, then relabel its placeholder text.
  const inputInstance = instanceFromComponents(
    inputs,
    "Input",
    "State=default, Leading=none",
  );
  if (inputInstance) {
    overrideFirstText(inputInstance, placeholder);
    col.appendChild(inputInstance);
    fillWidth(inputInstance);
  } else {
    const input = buildFallbackInput(inputs, placeholder, width);
    col.appendChild(input);
    fillWidth(input);
  }

  return col;
}

// A field carrying a muted `FieldDescription` line below the input, as several
// signup blocks do. Built on top of buildField (so it reuses the page-built
// Label + Input instances), then appends the description text.
export function buildDescribedField(
  inputs: BlocksInputs,
  width: number,
  label: string,
  placeholder: string,
  description: string,
): FrameNode {
  const field = buildField(inputs, width, label, placeholder);
  const desc = createBody(inputs, description, 14, "muted-foreground");
  field.appendChild(desc);
  fillWidth(desc);
  return field;
}

// A password field whose label row carries a right-aligned "Forgot your
// password?" link (`<div className="flex items-center">` with `ml-auto` on the
// link). Reuses the published Label + Input instances via buildField, then
// wraps the field's label node together with a link in a space-between row.
export function buildPasswordField(
  inputs: BlocksInputs,
  width: number,
  link = "Forgot your password?",
): FrameNode {
  const field = buildField(inputs, width, "Password", "••••••••");

  // The field's first child is the Label instance / fallback. Wrap it together
  // with a "forgot" link in a space-between row so the link sits flush right.
  const labelNode = field.children[0] as SceneNode | undefined;
  if (!labelNode) return field;

  const row = createRow("Label Row", 8);
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisAlignItems = "CENTER";
  row.primaryAxisAlignItems = "SPACE_BETWEEN";
  field.insertChild(0, row);
  row.appendChild(labelNode);

  const linkNode = createBody(inputs, link, 14, "foreground");
  row.appendChild(linkNode);
  fillWidth(row);

  return field;
}

// A two-up Password / Confirm Password grid with a single shared description
// line beneath it (`<Field className="grid grid-cols-2 gap-4">` wrapped in a
// FieldGroup with a trailing FieldDescription), as signup-03 / signup-04 use.
// Each cell reuses the page-built Label + Input instances via buildField.
export function buildPasswordConfirmGrid(
  inputs: BlocksInputs,
  width: number,
  description = "Must be at least 8 characters long.",
): FrameNode {
  const wrap = createColumn("Field", 8);
  wrap.resize(width, 10);
  wrap.primaryAxisSizingMode = "AUTO";
  wrap.counterAxisSizingMode = "FIXED";

  const grid = createRow("Password Grid", 16);
  grid.resize(width, 10);
  grid.primaryAxisSizingMode = "FIXED";
  grid.counterAxisSizingMode = "AUTO";
  grid.counterAxisAlignItems = "MIN";

  const password = buildField(inputs, width, "Password", "••••••••");
  grid.appendChild(password);
  growWidth(password);

  const confirm = buildField(inputs, width, "Confirm Password", "••••••••");
  grid.appendChild(confirm);
  growWidth(confirm);

  wrap.appendChild(grid);
  fillWidth(grid);

  const desc = createBody(inputs, description, 14, "muted-foreground");
  wrap.appendChild(desc);
  fillWidth(desc);

  return wrap;
}

function buildFallbackLabel(inputs: BlocksInputs, text: string): TextNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const node = figma.createText();
  applyFont(node, "body", "Medium");
  node.characters = text;
  node.fontSize = 14;
  bindFontSize(node, p.get("font/size/sm"));
  bindFill(node, t.get("foreground"));
  return node;
}

function buildFallbackInput(
  inputs: BlocksInputs,
  value: string,
  width: number,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const input = figma.createFrame();
  input.name = "Input";
  input.layoutMode = "HORIZONTAL";
  input.primaryAxisSizingMode = "FIXED";
  input.counterAxisSizingMode = "FIXED";
  input.counterAxisAlignItems = "CENTER";
  input.resize(width, 32);
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

// Build a primary action button. Reuses the published Button (default variant)
// and relabels it; falls back to a drawn button when the Components page isn't
// available. `fill` (default true) makes it stretch to its parent's width — set
// false for inline buttons sized to `width`.
export function buildPrimaryButton(
  inputs: BlocksInputs,
  width: number,
  label: string,
  fill = true,
): SceneNode {
  const instance = instanceFromComponents(
    inputs,
    "Button",
    "Variant=default, Size=default, State=default",
    label,
  );
  if (instance) {
    instance.resize(width, instance.height || 32);
    if (fill) fillWidth(instance);
    return instance;
  }
  return buildFallbackButton(inputs, width, label, "primary");
}

// Build an outline button (e.g. "Continue with Google"). Reuses the published
// outline Button variant; falls back to a drawn outline button. `fill`
// (default true) makes it stretch to its parent's width — set false for inline
// buttons sized to `width`.
export function buildOutlineButton(
  inputs: BlocksInputs,
  width: number,
  label: string,
  fill = true,
): SceneNode {
  const instance = instanceFromComponents(
    inputs,
    "Button",
    "Variant=outline, Size=default, State=default",
    label,
  );
  if (instance) {
    instance.resize(width, instance.height || 32);
    if (fill) fillWidth(instance);
    return instance;
  }
  return buildFallbackButton(inputs, width, label, "outline");
}

// Build a square outline icon-button for the 3-up social grids (login-04 /
// signup-04, `grid grid-cols-3`). Reuses the published outline *icon* Button
// variant so the row reads as real, swappable icon buttons; falls back to a
// drawn square outline button when the Components page isn't available. The
// `label` is the screen-reader text (e.g. "Login with Apple") and retitles the
// fallback's hidden glyph. `fill` (default true) stretches the button to share
// its grid cell.
export function buildOutlineIconButton(
  inputs: BlocksInputs,
  label: string,
  fill = true,
): SceneNode {
  const instance = instanceFromComponents(
    inputs,
    "Button",
    "Variant=outline, Size=icon, State=default",
  );
  if (instance) {
    if (fill) fillWidth(instance);
    return instance;
  }
  const button = buildFallbackButton(inputs, 32, label, "outline");
  // Square it up so the drawn fallback reads as an icon button, not a label.
  button.resize(32, 32);
  return button;
}

function buildFallbackButton(
  inputs: BlocksInputs,
  width: number,
  label: string,
  variant: "primary" | "outline",
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const button = figma.createFrame();
  button.name = "Button";
  button.layoutMode = "HORIZONTAL";
  button.primaryAxisSizingMode = "FIXED";
  button.counterAxisSizingMode = "FIXED";
  button.primaryAxisAlignItems = "CENTER";
  button.counterAxisAlignItems = "CENTER";
  button.resize(width, 32);
  button.cornerRadius = 8;
  bindCornerRadii(button, p.get("radius/lg"));
  if (variant === "primary") {
    bindFill(button, t.get("primary"));
  } else {
    bindFill(button, t.get("background"));
    bindStrokeColor(button, t.get("border"));
    button.strokeWeight = 1;
  }

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(
    text,
    variant === "primary" ? t.get("primary-foreground") : t.get("foreground"),
  );
  button.appendChild(text);

  return button;
}
