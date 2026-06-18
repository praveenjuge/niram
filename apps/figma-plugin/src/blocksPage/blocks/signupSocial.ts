// Signup (Card) block: shadcn's `signup-03` — a centered "Acme Inc." brand
// lockup above a card on a muted background with a centered "Create your
// account" heading + supporting copy, a full-name field, an email field, a
// two-up Password / Confirm Password grid with a single "Must be at least 8
// characters long." description, a primary "Create Account" submit, a centered
// "sign in" footer line, and a terms-of-service note below the card.
//
// Every field reuses the page-built Label + Input instances and the button
// reuses the page-built default Button instance, so editing a component once
// updates this screen too.

import {
  createBody,
  createBlockCanvas,
  createBrand,
  createColumn,
  createSurface,
} from "../layout";
import { bindFill } from "../../componentsPage/bindings";
import type { BlocksInputs } from "../types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../types";
import { countDescendants, fillWidth } from "../utils";
import {
  buildField,
  buildPasswordConfirmGrid,
  buildPrimaryButton,
} from "../field";

const CARD_WIDTH = 384; // `max-w-sm`
const FIELD_WIDTH = CARD_WIDTH - 48;

export async function addSignupSocialBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const canvas = createBlockCanvas(
    inputs,
    "Signup (Card)",
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
    createBody(inputs, "Create your account", 20, "card-foreground", "Medium"),
  );
  header.appendChild(
    createBody(
      inputs,
      "Enter your email below to create your account",
      14,
      "muted-foreground",
    ),
  );
  card.appendChild(header);
  fillWidth(header);

  // Fields.
  const fields = createColumn("Fields", 16);
  fields.appendChild(buildField(inputs, FIELD_WIDTH, "Full Name", "John Doe"));
  fields.appendChild(buildField(inputs, FIELD_WIDTH, "Email", "m@example.com"));
  fields.appendChild(buildPasswordConfirmGrid(inputs, FIELD_WIDTH));
  card.appendChild(fields);
  fillWidth(fields);
  for (const field of fields.children) fillWidth(field as SceneNode);

  // Submit + footer prompt.
  const actions = createColumn("Actions", 12);
  actions.counterAxisAlignItems = "CENTER";
  const submit = buildPrimaryButton(inputs, FIELD_WIDTH, "Create Account");
  actions.appendChild(submit);
  fillWidth(submit);
  const footer = createBody(
    inputs,
    "Already have an account? Sign in",
    14,
    "muted-foreground",
  );
  actions.appendChild(footer);
  fillWidth(footer);
  card.appendChild(actions);
  fillWidth(actions);

  stack.appendChild(card);
  fillWidth(card);

  // Terms note below the card.
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
