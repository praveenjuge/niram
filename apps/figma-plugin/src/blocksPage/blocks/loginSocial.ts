// Login (Social) block: shadcn's `login-03` — a centered "Acme Inc." brand
// lockup above a card on a muted background led by two outline social buttons
// (Apple + Google), an "Or continue with" separator, an email field, a password
// field with a "Forgot your password?" link beside its label, a primary submit,
// a centered "sign up" footer line, and a terms-of-service note below the card.
//
// The fields reuse the page-built Label + Input instances and every button
// reuses the page-built Button instances (default + outline), so editing a
// component once updates this screen too.

import {
  createBody,
  createBlockCanvas,
  createBrand,
  createColumn,
  createSeparatorLabel,
  createSurface,
} from "../layout";
import { bindFill } from "../../componentsPage/bindings";
import type { BlocksInputs } from "../types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../types";
import { countDescendants, fillWidth } from "../utils";
import {
  buildOutlineButton,
  buildPasswordField,
  buildPrimaryButton,
  buildField,
} from "../field";

const CARD_WIDTH = 384; // `max-w-sm`
const FIELD_WIDTH = CARD_WIDTH - 48; // card width minus 24px padding each side

export async function addLoginSocialBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const canvas = createBlockCanvas(
    inputs,
    "Login (Social)",
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
  );
  // The card sits on a muted background, centered both axes.
  canvas.primaryAxisAlignItems = "CENTER";
  canvas.counterAxisAlignItems = "CENTER";
  bindFill(canvas, inputs.theme.light.get("muted"));

  // The card + terms note stack in a centered max-w-sm column.
  const stack = createColumn("Stack", 24);
  stack.resize(CARD_WIDTH, 10);
  stack.primaryAxisSizingMode = "AUTO";
  stack.counterAxisSizingMode = "FIXED";
  stack.counterAxisAlignItems = "CENTER";

  // Brand lockup centered above the card (`self-center` Acme Inc. link).
  stack.appendChild(createBrand(inputs));

  const card = await createSurface(inputs, CARD_WIDTH, {
    gap: 24,
    name: "Card",
  });

  // Header: centered title + supporting copy (`CardHeader text-center`).
  const header = createColumn("Header", 6);
  header.counterAxisAlignItems = "CENTER";
  header.appendChild(
    createBody(inputs, "Welcome back", 20, "card-foreground", "Medium"),
  );
  header.appendChild(
    createBody(
      inputs,
      "Login with your Apple or Google account",
      14,
      "muted-foreground",
    ),
  );
  card.appendChild(header);
  fillWidth(header);

  // Social-first buttons.
  const socials = createColumn("Socials", 12);
  const apple = buildOutlineButton(inputs, FIELD_WIDTH, "Login with Apple");
  socials.appendChild(apple);
  fillWidth(apple);
  const google = buildOutlineButton(inputs, FIELD_WIDTH, "Login with Google");
  socials.appendChild(google);
  fillWidth(google);
  card.appendChild(socials);
  fillWidth(socials);

  // Separator.
  const sep = createSeparatorLabel(inputs, "Or continue with");
  card.appendChild(sep);
  fillWidth(sep);

  // Fields.
  const fields = createColumn("Fields", 16);
  fields.appendChild(buildField(inputs, FIELD_WIDTH, "Email", "m@example.com"));
  fields.appendChild(buildPasswordField(inputs, FIELD_WIDTH));
  card.appendChild(fields);
  fillWidth(fields);
  for (const field of fields.children) fillWidth(field as SceneNode);

  // Submit + footer prompt.
  const actions = createColumn("Actions", 12);
  const submit = buildPrimaryButton(inputs, FIELD_WIDTH, "Login");
  actions.appendChild(submit);
  fillWidth(submit);
  const footer = createBody(
    inputs,
    "Don't have an account? Sign up",
    14,
    "muted-foreground",
  );
  actions.appendChild(footer);
  fillWidth(footer);
  actions.counterAxisAlignItems = "CENTER";
  card.appendChild(actions);
  fillWidth(actions);

  stack.appendChild(card);
  fillWidth(card);

  // Terms note below the card (`FieldDescription px-6 text-center`).
  const terms = createBody(
    inputs,
    "By clicking continue, you agree to our Terms of Service and Privacy Policy.",
    12,
    "muted-foreground",
  );
  stack.appendChild(terms);
  fillWidth(terms);

  canvas.appendChild(stack);
  page.appendChild(canvas);
  return countDescendants(canvas);
}
