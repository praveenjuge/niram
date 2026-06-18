// Signup block: shadcn's `signup-01` — a centered card with a full-name field,
// an email field (with a supporting description), password + confirm-password
// fields (each with their own description), a create-account button, an outline
// social button, and a centered "sign in" footer line.
//
// Like the Login block, every field reuses the page-built Label + Input
// instances and every button reuses the page-built Button instances.

import {
  createBody,
  createBlockCanvas,
  createColumn,
  createSurface,
} from "../layout";
import type { BlocksInputs } from "../types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../types";
import { countDescendants, fillWidth } from "../utils";
import {
  buildDescribedField,
  buildField,
  buildOutlineButton,
  buildPrimaryButton,
} from "../field";

const CARD_WIDTH = 360;
const FIELD_WIDTH = CARD_WIDTH - 48;

export async function addSignupBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const canvas = createBlockCanvas(
    inputs,
    "Signup",
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
  );
  canvas.primaryAxisAlignItems = "CENTER";
  canvas.counterAxisAlignItems = "CENTER";

  const card = await createSurface(inputs, CARD_WIDTH, {
    gap: 24,
    name: "Card",
  });

  // Header.
  const header = createColumn("Header", 6);
  header.appendChild(
    createBody(inputs, "Create an account", 24, "card-foreground", "Medium"),
  );
  header.appendChild(
    createBody(
      inputs,
      "Enter your information below to create your account",
      14,
      "muted-foreground",
    ),
  );
  card.appendChild(header);
  fillWidth(header);

  // Fields.
  const fields = createColumn("Fields", 16);
  fields.appendChild(buildField(inputs, FIELD_WIDTH, "Full Name", "John Doe"));
  fields.appendChild(
    buildDescribedField(
      inputs,
      FIELD_WIDTH,
      "Email",
      "m@example.com",
      "We'll use this to contact you. We will not share your email with anyone else.",
    ),
  );
  fields.appendChild(
    buildDescribedField(
      inputs,
      FIELD_WIDTH,
      "Password",
      "••••••••",
      "Must be at least 8 characters long.",
    ),
  );
  fields.appendChild(
    buildDescribedField(
      inputs,
      FIELD_WIDTH,
      "Confirm Password",
      "••••••••",
      "Please confirm your password.",
    ),
  );
  card.appendChild(fields);
  fillWidth(fields);
  for (const field of fields.children) fillWidth(field as SceneNode);

  // Actions.
  const actions = createColumn("Actions", 12);
  const submit = buildPrimaryButton(inputs, FIELD_WIDTH, "Create Account");
  actions.appendChild(submit);
  fillWidth(submit);
  const social = buildOutlineButton(inputs, FIELD_WIDTH, "Sign up with Google");
  actions.appendChild(social);
  fillWidth(social);
  card.appendChild(actions);
  fillWidth(actions);

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
  card.appendChild(footer);
  fillWidth(footer);

  canvas.appendChild(card);
  page.appendChild(canvas);
  return countDescendants(canvas);
}
