// Signup (Two Column) block: shadcn's `signup-02` — a split screen mirroring
// the two-column login, with a brand lockup over a centered create-account form
// on the left and a muted cover panel on the right. The form follows
// signup-02's FieldGroup: title, a full-name field, an email field with a
// supporting description line, password + confirm-password fields each with
// their own description, a "Create Account" submit, an "Or continue with"
// separator, an outline social button, and a "sign in" footer.
//
// Every field reuses the page-built Label + Input instances and every button
// reuses the page-built Button instances, so editing a component once updates
// this screen too.

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
  buildDescribedField,
  buildField,
  buildOutlineButton,
  buildPrimaryButton,
} from "../field";

const PANE_WIDTH = CANVAS_WIDTH / 2;
const FORM_WIDTH = 320;
const PANE_PADDING = 40;

export async function addSignupTwoColumnBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const canvas = createBlockCanvas(
    inputs,
    "Signup (Two Column)",
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

  left.appendChild(createBrand(inputs));

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

  // Header.
  const header = createColumn("Header", 6);
  header.counterAxisAlignItems = "CENTER";
  header.appendChild(
    createBody(inputs, "Create your account", 24, "foreground", "Medium"),
  );
  header.appendChild(
    createBody(
      inputs,
      "Fill in the form below to create your account",
      14,
      "muted-foreground",
    ),
  );
  form.appendChild(header);
  fillWidth(header);

  // Full name.
  const name = buildField(inputs, FORM_WIDTH, "Full Name", "John Doe");
  form.appendChild(name);
  fillWidth(name);

  // Email with a description line under the input.
  const email = buildDescribedField(
    inputs,
    FORM_WIDTH,
    "Email",
    "m@example.com",
    "We'll use this to contact you. We will not share your email with anyone else.",
  );
  form.appendChild(email);
  fillWidth(email);

  // Password with description.
  const password = buildDescribedField(
    inputs,
    FORM_WIDTH,
    "Password",
    "••••••••",
    "Must be at least 8 characters long.",
  );
  form.appendChild(password);
  fillWidth(password);

  // Confirm password with description.
  const confirm = buildDescribedField(
    inputs,
    FORM_WIDTH,
    "Confirm Password",
    "••••••••",
    "Please confirm your password.",
  );
  form.appendChild(confirm);
  fillWidth(confirm);

  // Submit.
  const submit = buildPrimaryButton(inputs, FORM_WIDTH, "Create Account");
  form.appendChild(submit);
  fillWidth(submit);

  // Separator + social.
  const sep = createSeparatorLabel(inputs, "Or continue with");
  form.appendChild(sep);
  fillWidth(sep);

  const social = buildOutlineButton(inputs, FORM_WIDTH, "Sign up with GitHub");
  form.appendChild(social);
  fillWidth(social);

  // Footer prompt.
  const footer = createColumn("Footer", 0);
  footer.counterAxisAlignItems = "CENTER";
  footer.appendChild(
    createBody(
      inputs,
      "Already have an account? Sign in",
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
