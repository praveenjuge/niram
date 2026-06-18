// Login (Email) block: shadcn's `login-05` — a compact, centered, logo-led
// screen on the plain background. A stacked brand mark sits above a bold
// "Welcome to Acme Inc." title and a "sign up" prompt, then a single email
// field, a primary login button, an "Or" separator, two outline social buttons
// in a row, and a centered terms-of-service footer.
//
// The field reuses the page-built Label + Input instances and the buttons reuse
// the page-built Button instances (default + outline), so editing a component
// once updates this screen too.

import {
  createBody,
  createBlockCanvas,
  createBrand,
  createColumn,
  createRow,
  createSeparatorLabel,
} from "../layout";
import type { BlocksInputs } from "../types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../types";
import { countDescendants, fillWidth, growWidth } from "../utils";
import { buildField, buildOutlineButton, buildPrimaryButton } from "../field";

// `w-full max-w-sm` (384px) centered on the background.
const FORM_WIDTH = 384;

export async function addLoginEmailBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const canvas = createBlockCanvas(
    inputs,
    "Login (Email)",
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
  );
  canvas.primaryAxisAlignItems = "CENTER";
  canvas.counterAxisAlignItems = "CENTER";

  const form = createColumn("Form", 24);
  form.resize(FORM_WIDTH, 10);
  form.primaryAxisSizingMode = "AUTO";
  form.counterAxisSizingMode = "FIXED";

  // Header: stacked brand mark + wordmark + title + "sign up" prompt, centered.
  const header = createColumn("Header", 8);
  header.counterAxisAlignItems = "CENTER";
  header.appendChild(createBrand(inputs, "stacked"));
  header.appendChild(
    createBody(inputs, "Welcome to Acme Inc.", 20, "foreground", "Medium"),
  );
  header.appendChild(
    createBody(
      inputs,
      "Don't have an account? Sign up",
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

  // Primary submit.
  const submit = buildPrimaryButton(inputs, FORM_WIDTH, "Login");
  form.appendChild(submit);
  fillWidth(submit);

  // "Or" separator.
  const sep = createSeparatorLabel(inputs, "Or");
  form.appendChild(sep);
  fillWidth(sep);

  // Two outline social buttons in a row (`sm:grid-cols-2`).
  const socials = createRow("Socials", 16);
  socials.primaryAxisSizingMode = "FIXED";
  const apple = buildOutlineButton(inputs, FORM_WIDTH, "Continue with Apple");
  socials.appendChild(apple);
  growWidth(apple);
  const google = buildOutlineButton(inputs, FORM_WIDTH, "Continue with Google");
  socials.appendChild(google);
  growWidth(google);
  form.appendChild(socials);
  fillWidth(socials);

  // Terms footer.
  const footer = createColumn("Footer", 0);
  footer.counterAxisAlignItems = "CENTER";
  footer.appendChild(
    createBody(
      inputs,
      "By clicking continue, you agree to our Terms of Service and Privacy Policy.",
      12,
      "muted-foreground",
    ),
  );
  form.appendChild(footer);
  fillWidth(footer);

  canvas.appendChild(form);
  page.appendChild(canvas);
  return countDescendants(canvas);
}
