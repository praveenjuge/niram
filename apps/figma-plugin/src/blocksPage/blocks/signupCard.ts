// Signup (Split) block: shadcn's `signup-04` — a wide split card on a muted
// background. The left half is a padded form (centered "Create your account"
// heading + copy, an email field with a supporting description, a two-up
// Password / Confirm Password grid with a shared description, a primary
// "Create Account" submit, an "Or continue with" separator, a 3-up grid of
// outline social icon buttons, and a centered "sign in" footer), and the right
// half is a muted cover panel. A terms note sits below the card.
//
// Every field reuses the page-built Label + Input instances and every button
// reuses the page-built Button instances (default + outline icon), so editing a
// component once updates this screen too.

import {
  createBody,
  createBlockCanvas,
  createColumn,
  createCoverPanel,
  createRow,
  createSeparatorLabel,
  createSplitCard,
} from "../layout";
import { bindFill } from "../../componentsPage/bindings";
import type { BlocksInputs } from "../types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../types";
import { countDescendants, fillHeight, fillWidth, growWidth } from "../utils";
import {
  buildDescribedField,
  buildOutlineIconButton,
  buildPasswordConfirmGrid,
  buildPrimaryButton,
} from "../field";

const CARD_WIDTH = 896; // `md:max-w-4xl`
const CARD_HEIGHT = 620;
const PANE_WIDTH = CARD_WIDTH / 2;
const FORM_PADDING = 32; // `md:p-8`
const FORM_WIDTH = PANE_WIDTH - FORM_PADDING * 2;

export async function addSignupCardBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const canvas = createBlockCanvas(
    inputs,
    "Signup (Split)",
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
  );
  canvas.primaryAxisAlignItems = "CENTER";
  canvas.counterAxisAlignItems = "CENTER";
  bindFill(canvas, inputs.theme.light.get("muted"));

  const stack = createColumn("Stack", 24);
  stack.resize(CARD_WIDTH, 10);
  stack.primaryAxisSizingMode = "AUTO";
  stack.counterAxisSizingMode = "FIXED";
  stack.counterAxisAlignItems = "CENTER";

  const card = await createSplitCard(inputs, CARD_WIDTH, CARD_HEIGHT, {
    shadow: "Shadow/sm",
  });

  // --- Left pane: padded form --------------------------------------------
  const formPane = createColumn("Form", 24);
  formPane.primaryAxisSizingMode = "FIXED";
  formPane.counterAxisSizingMode = "FIXED";
  formPane.resize(PANE_WIDTH, CARD_HEIGHT);
  formPane.primaryAxisAlignItems = "CENTER";
  formPane.paddingTop = FORM_PADDING;
  formPane.paddingBottom = FORM_PADDING;
  formPane.paddingLeft = FORM_PADDING;
  formPane.paddingRight = FORM_PADDING;
  card.appendChild(formPane);

  const form = createColumn("Field Group", 24);
  form.resize(FORM_WIDTH, 10);
  form.primaryAxisSizingMode = "AUTO";
  form.counterAxisSizingMode = "FIXED";
  formPane.appendChild(form);
  fillWidth(form);

  // Header.
  const header = createColumn("Header", 6);
  header.counterAxisAlignItems = "CENTER";
  header.appendChild(
    createBody(inputs, "Create your account", 24, "card-foreground", "Medium"),
  );
  header.appendChild(
    createBody(
      inputs,
      "Enter your email below to create your account",
      14,
      "muted-foreground",
    ),
  );
  form.appendChild(header);
  fillWidth(header);

  // Email with a description line.
  const email = buildDescribedField(
    inputs,
    FORM_WIDTH,
    "Email",
    "m@example.com",
    "We'll use this to contact you. We will not share your email with anyone else.",
  );
  form.appendChild(email);
  fillWidth(email);

  // Two-up Password / Confirm Password grid with a shared description.
  const passwords = buildPasswordConfirmGrid(inputs, FORM_WIDTH);
  form.appendChild(passwords);
  fillWidth(passwords);

  // Primary submit.
  const submit = buildPrimaryButton(inputs, FORM_WIDTH, "Create Account");
  form.appendChild(submit);
  fillWidth(submit);

  // Separator.
  const sep = createSeparatorLabel(inputs, "Or continue with");
  form.appendChild(sep);
  fillWidth(sep);

  // 3-up grid of outline social icon buttons.
  const socials = createRow("Socials", 16);
  socials.primaryAxisSizingMode = "FIXED";
  for (const label of [
    "Sign up with Apple",
    "Sign up with Google",
    "Sign up with Meta",
  ]) {
    const btn = buildOutlineIconButton(inputs, label);
    socials.appendChild(btn);
    growWidth(btn);
  }
  form.appendChild(socials);
  fillWidth(socials);

  // Footer prompt.
  const footer = createBody(
    inputs,
    "Already have an account? Sign in",
    14,
    "muted-foreground",
  );
  form.appendChild(footer);
  fillWidth(footer);

  // --- Right pane: muted cover -------------------------------------------
  const cover = createCoverPanel(inputs, PANE_WIDTH, CARD_HEIGHT);
  card.appendChild(cover);
  fillHeight(cover);

  stack.appendChild(card);

  // Terms note below the card.
  const terms = createBody(
    inputs,
    "By clicking continue, you agree to our Terms of Service and Privacy Policy.",
    12,
    "muted-foreground",
  );
  stack.appendChild(terms);

  canvas.appendChild(stack);
  page.appendChild(canvas);
  return countDescendants(canvas);
}
