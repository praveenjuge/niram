// Login (Two Column) block: shadcn's `login-02` — a split screen with a brand
// lockup pinned top-left over a centered email + password form on the left, and
// a muted cover panel filling the right half. The form mirrors login-02's
// FieldGroup: title, email field, a password field with a "Forgot your
// password?" link beside the label, a primary submit, an "Or continue with"
// separator, an outline social button, and a "sign up" footer line.
//
// Every field reuses the page-built Label + Input instances and every button
// reuses the page-built Button instances (default + outline), so editing a
// component once updates this screen too.

import {
  createBody,
  createBlockCanvas,
  createBrand,
  createColumn,
  createCoverPanel,
  createSeparatorLabel,
} from "../layout";
import type { BlocksInputs } from "../types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../types";
import { countDescendants, fillHeight, fillWidth } from "../utils";
import {
  buildField,
  buildOutlineButton,
  buildPasswordField,
  buildPrimaryButton,
} from "../field";

// The left pane is half the canvas; the form hugs `max-w-xs` (320px) centered
// within it. The right pane is the muted cover.
const PANE_WIDTH = CANVAS_WIDTH / 2;
const FORM_WIDTH = 320;
const PANE_PADDING = 40; // `md:p-10`

export async function addLoginTwoColumnBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const canvas = createBlockCanvas(
    inputs,
    "Login (Two Column)",
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
  );
  canvas.layoutMode = "HORIZONTAL";
  canvas.itemSpacing = 0;

  // --- Left pane: brand + centered form ----------------------------------
  const left = createColumn("Left", 16);
  left.primaryAxisSizingMode = "FIXED";
  left.counterAxisSizingMode = "FIXED";
  left.resize(PANE_WIDTH, CANVAS_HEIGHT);
  left.paddingTop = PANE_PADDING;
  left.paddingBottom = PANE_PADDING;
  left.paddingLeft = PANE_PADDING;
  left.paddingRight = PANE_PADDING;
  canvas.appendChild(left);

  // Brand lockup, pinned top-left (`md:justify-start`).
  left.appendChild(createBrand(inputs));

  // The form is centered in the remaining space.
  const center = createColumn("Center", 0);
  center.primaryAxisSizingMode = "FIXED";
  center.counterAxisSizingMode = "FIXED";
  center.primaryAxisAlignItems = "CENTER";
  center.counterAxisAlignItems = "CENTER";
  left.appendChild(center);
  fillWidth(center);
  fillHeight(center);

  const form = createColumn("Form", 24);
  form.resize(FORM_WIDTH, 10);
  form.primaryAxisSizingMode = "AUTO";
  form.counterAxisSizingMode = "FIXED";
  center.appendChild(form);

  // Header: centered title + supporting copy.
  const header = createColumn("Header", 6);
  header.counterAxisAlignItems = "CENTER";
  header.appendChild(
    createBody(inputs, "Login to your account", 24, "foreground", "Medium"),
  );
  header.appendChild(
    createBody(
      inputs,
      "Enter your email below to login to your account",
      14,
      "muted-foreground",
    ),
  );
  form.appendChild(header);
  fillWidth(header);

  // Email field.
  const email = buildField(inputs, FORM_WIDTH, "Email", "m@example.com");
  form.appendChild(email);
  fillWidth(email);

  // Password field with a "Forgot your password?" link beside the label.
  const password = buildPasswordField(inputs, FORM_WIDTH);
  form.appendChild(password);
  fillWidth(password);

  // Primary submit.
  const submit = buildPrimaryButton(inputs, FORM_WIDTH, "Login");
  form.appendChild(submit);
  fillWidth(submit);

  // Separator.
  const sep = createSeparatorLabel(inputs, "Or continue with");
  form.appendChild(sep);
  fillWidth(sep);

  // Outline social button.
  const social = buildOutlineButton(inputs, FORM_WIDTH, "Login with GitHub");
  form.appendChild(social);
  fillWidth(social);

  // Footer prompt.
  const footer = createColumn("Footer", 0);
  footer.counterAxisAlignItems = "CENTER";
  footer.appendChild(
    createBody(
      inputs,
      "Don't have an account? Sign up",
      14,
      "muted-foreground",
    ),
  );
  form.appendChild(footer);
  fillWidth(footer);

  // --- Right pane: muted cover --------------------------------------------
  const cover = createCoverPanel(inputs, PANE_WIDTH, CANVAS_HEIGHT);
  canvas.appendChild(cover);

  page.appendChild(canvas);
  return countDescendants(canvas);
}
