// Login block: shadcn's `login-01` — a centered card on a plain background with
// a title, description, an email field, a password field with a "Forgot your
// password?" link beside its label, a primary submit button, an outline social
// button, and a centered "sign up" footer line.
//
// The fields reuse the page-built Label + Input instances and the buttons reuse
// the page-built Button instances (default + outline variants), so a designer
// editing the Button or Input once sees every auth screen update.

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
  buildField,
  buildOutlineButton,
  buildPasswordField,
  buildPrimaryButton,
} from "../field";

const CARD_WIDTH = 360;
const FIELD_WIDTH = CARD_WIDTH - 48; // card width minus 24px padding each side

export async function addLoginBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const canvas = createBlockCanvas(
    inputs,
    "Login",
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
  );
  // Center the card both axes.
  canvas.primaryAxisAlignItems = "CENTER";
  canvas.counterAxisAlignItems = "CENTER";

  const card = await createSurface(inputs, CARD_WIDTH, {
    gap: 24,
    name: "Card",
  });

  // Header: title + supporting copy.
  const header = createColumn("Header", 6);
  const title = createBody(
    inputs,
    "Login to your account",
    24,
    "card-foreground",
    "Medium",
  );
  header.appendChild(title);
  header.appendChild(
    createBody(
      inputs,
      "Enter your email below to login to your account",
      14,
      "muted-foreground",
    ),
  );
  card.appendChild(header);
  fillWidth(header);

  // Fields.
  const fields = createColumn("Fields", 16);
  fields.appendChild(buildField(inputs, FIELD_WIDTH, "Email", "m@example.com"));
  fields.appendChild(buildPasswordField(inputs, FIELD_WIDTH));
  card.appendChild(fields);
  fillWidth(fields);
  for (const field of fields.children) fillWidth(field as SceneNode);

  // Actions.
  const actions = createColumn("Actions", 12);
  const submit = buildPrimaryButton(inputs, FIELD_WIDTH, "Login");
  actions.appendChild(submit);
  fillWidth(submit);
  const social = buildOutlineButton(inputs, FIELD_WIDTH, "Login with Google");
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
      "Don't have an account? Sign up",
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
