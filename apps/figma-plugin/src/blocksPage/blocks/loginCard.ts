// Login (Card) block: shadcn's `login-04` — a wide split card on a muted
// background. The left half is a padded form (centered "Welcome back" heading +
// "Login to your Acme Inc account" copy, an email field, a password field with
// a "Forgot your password?" link, a primary submit, an "Or continue with"
// separator, a 3-up grid of outline social icon buttons, and a centered
// "sign up" footer), and the right half is a muted cover panel. A terms note
// sits below the card.
//
// Every field reuses the page-built Label + Input instances and every button
// reuses the page-built Button instances (default + outline + outline icon),
// so editing a component once updates this screen too.

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
  buildField,
  buildOutlineIconButton,
  buildPasswordField,
  buildPrimaryButton,
} from "../field";

const CARD_WIDTH = 896; // `md:max-w-4xl`
const CARD_HEIGHT = 560;
const PANE_WIDTH = CARD_WIDTH / 2;
const FORM_PADDING = 32; // `md:p-8`
const FORM_WIDTH = PANE_WIDTH - FORM_PADDING * 2;

export async function addLoginCardBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const canvas = createBlockCanvas(
    inputs,
    "Login (Card)",
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
  );
  canvas.primaryAxisAlignItems = "CENTER";
  canvas.counterAxisAlignItems = "CENTER";
  bindFill(canvas, inputs.theme.light.get("muted"));

  // The card + terms note stack centered.
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
    createBody(inputs, "Welcome back", 24, "card-foreground", "Medium"),
  );
  header.appendChild(
    createBody(
      inputs,
      "Login to your Acme Inc account",
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

  // Password field with a "Forgot your password?" link.
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

  // 3-up grid of outline social icon buttons.
  const socials = createRow("Socials", 16);
  socials.primaryAxisSizingMode = "FIXED";
  for (const label of [
    "Login with Apple",
    "Login with Google",
    "Login with Meta",
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
    "Don't have an account? Sign up",
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
