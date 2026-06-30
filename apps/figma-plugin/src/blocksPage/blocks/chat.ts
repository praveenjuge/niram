// Chat block: a conversation screen built from the June 2026 shadcn chat
// components (https://ui.shadcn.com/docs/changelog/2026-06-chat-components). It
// frames a MessageScroller-style conversation between a header bar and a prompt
// composer, the same way shadcn's chat examples compose the conversation layer.
//
// Like the dashboard block, the chrome (header, scroller, composer) is drawn
// here while the conversation itself reuses live instances of the page-built
// Bubble, Marker, and Attachment components — edit a component once and the
// chat updates. Each reuse falls back to a drawn stand-in when the page has no
// matching component (isolated callers / tests on a bare page).

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../../componentsPage/bindings";
import { applyFont } from "../../fonts";
import { applyEffectStyle } from "../../effectStyles";
import { createIcon, resolveIconLibrary } from "../../icons";
import {
  createBlockCanvas,
  createBody,
  createColumn,
  createRow,
} from "../layout";
import type { BlocksInputs } from "../types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../types";
import { countDescendants, fillWidth, instanceFromComponents } from "../utils";

const CARD_WIDTH = 760;
const CARD_HEIGHT = 760;
const PAD = 16;
const CONTENT_WIDTH = CARD_WIDTH - PAD * 2;
const AVATAR_SIZE = 32;

// One conversation turn the block renders. The bubble surface reuses the
// page-built Bubble (by variant + align); the rest of the row is drawn.
type Turn = {
  align: "start" | "end";
  name: string;
  initials: string;
  time: string;
  bubbleVariant: string;
  message: string;
  attachment?: boolean;
};

const TURNS: Turn[] = [
  {
    align: "start",
    name: "Acme AI",
    initials: "AI",
    time: "10:24 AM",
    bubbleVariant: "muted",
    message: "Hi! How can I help you build your design system today?",
  },
  {
    align: "end",
    name: "You",
    initials: "JD",
    time: "10:25 AM",
    bubbleVariant: "default",
    message: "Can you turn this spec into Figma components?",
    attachment: true,
  },
  {
    align: "start",
    name: "Acme AI",
    initials: "AI",
    time: "10:25 AM",
    bubbleVariant: "muted",
    message: "Done. I generated the full component set on the Niram page.",
  },
];

export async function addChatBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const canvas = createBlockCanvas(inputs, "Chat", CANVAS_WIDTH, CANVAS_HEIGHT);
  canvas.primaryAxisAlignItems = "CENTER";
  canvas.counterAxisAlignItems = "CENTER";

  const card = await buildChatWindow(inputs);
  canvas.appendChild(card);

  page.appendChild(canvas);
  return countDescendants(canvas);
}

// The chat window card: a header bar, the conversation scroller (grows to fill),
// and the composer, stacked in a bordered card.
async function buildChatWindow(inputs: BlocksInputs): Promise<FrameNode> {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const card = figma.createFrame();
  card.name = "Chat Window";
  card.layoutMode = "VERTICAL";
  card.primaryAxisSizingMode = "FIXED";
  card.counterAxisSizingMode = "FIXED";
  card.resize(CARD_WIDTH, CARD_HEIGHT);
  card.itemSpacing = 0;
  card.cornerRadius = 12;
  bindCornerRadii(card, p.get("radius/xl"));
  bindFill(card, t.get("card"));
  bindStrokeColor(card, t.get("border"));
  card.strokeWeight = 1;
  card.strokeAlign = "INSIDE";
  card.clipsContent = true;
  await applyEffectStyle(card, inputs.effectStyles?.idFor("Shadow/sm"));

  const header = buildHeader(inputs);
  card.appendChild(header);
  fillWidth(header);

  const conversation = buildConversation(inputs);
  card.appendChild(conversation);
  fillWidth(conversation);
  try {
    (conversation as unknown as { layoutGrow: number }).layoutGrow = 1;
  } catch {
    // Keep intrinsic height when the host rejects grow.
  }

  const composer = buildComposer(inputs);
  card.appendChild(composer);
  fillWidth(composer);

  return card;
}

// The header bar: an avatar, the contact name + presence, and a trailing ghost
// action, over a bottom border.
function buildHeader(inputs: BlocksInputs): FrameNode {
  const t = inputs.theme.light;

  const header = figma.createFrame();
  header.name = "Header";
  header.layoutMode = "HORIZONTAL";
  header.primaryAxisSizingMode = "FIXED";
  header.counterAxisSizingMode = "FIXED";
  header.counterAxisAlignItems = "CENTER";
  header.resize(CARD_WIDTH, 64);
  header.itemSpacing = 12;
  header.paddingLeft = PAD;
  header.paddingRight = PAD;
  header.fills = [];
  bindStrokeColor(header, t.get("border"));
  header.strokeWeight = 1;
  header.strokeAlign = "INSIDE";
  header.strokeBottomWeight = 1;
  header.strokeTopWeight = 0;
  header.strokeLeftWeight = 0;
  header.strokeRightWeight = 0;

  header.appendChild(buildAvatar(inputs, "AI"));

  const meta = createColumn("Meta", 2);
  meta.appendChild(createBody(inputs, "Acme AI", 14, "foreground", "Medium"));
  meta.appendChild(createBody(inputs, "Online", 12, "muted-foreground"));
  header.appendChild(meta);

  const spacer = figma.createFrame();
  spacer.name = "Spacer";
  spacer.fills = [];
  spacer.strokes = [];
  spacer.resize(10, 1);
  header.appendChild(spacer);
  try {
    (spacer as unknown as { layoutGrow: number }).layoutGrow = 1;
  } catch {
    // Keep intrinsic width.
  }

  // Trailing ghost action (a command/menu glyph).
  const action = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "command",
    size: 18,
    color: t.get("muted-foreground"),
  });
  if (action) {
    action.name = "Action";
    header.appendChild(action);
  }

  return header;
}

// The MessageScroller: a clipped, vertically-scrolling column of markers and
// message rows. It grows to fill the card height between the header and
// composer.
function buildConversation(inputs: BlocksInputs): FrameNode {
  const scroller = figma.createFrame();
  scroller.name = "Conversation";
  scroller.layoutMode = "VERTICAL";
  scroller.primaryAxisSizingMode = "FIXED";
  scroller.counterAxisSizingMode = "FIXED";
  scroller.resize(CARD_WIDTH, 600);
  scroller.itemSpacing = 16;
  scroller.paddingTop = PAD;
  scroller.paddingBottom = PAD;
  scroller.paddingLeft = PAD;
  scroller.paddingRight = PAD;
  scroller.fills = [];
  scroller.strokes = [];
  scroller.clipsContent = true;

  // Opening separator marker.
  const opener = reuseMarker(inputs, "separator", "Today");
  scroller.appendChild(opener);
  fillWidth(opener);

  for (const turn of TURNS) {
    const row = buildMessageRow(inputs, turn);
    scroller.appendChild(row);
    fillWidth(row);
  }

  // Trailing status marker.
  const typing = reuseMarker(inputs, "default", "Acme AI is typing...");
  scroller.appendChild(typing);
  fillWidth(typing);

  return scroller;
}

// One message row: an avatar beside a content column (header line + bubble +
// optional attachment). `align=end` reverses the row and right-aligns content.
function buildMessageRow(inputs: BlocksInputs, turn: Turn): FrameNode {
  const isEnd = turn.align === "end";

  const messageRow = createRow("Message", 8);
  messageRow.counterAxisAlignItems = "MAX";
  messageRow.primaryAxisSizingMode = "FIXED";
  messageRow.resize(CONTENT_WIDTH, 1);
  messageRow.counterAxisSizingMode = "AUTO";

  const avatar = buildAvatar(inputs, turn.initials);

  const content = createColumn("Content", 6);
  content.counterAxisAlignItems = isEnd ? "MAX" : "MIN";

  // Header line: name + timestamp.
  const head = createRow("Head", 8);
  const name = createBody(inputs, turn.name, 12, "muted-foreground", "Medium");
  head.appendChild(name);
  head.appendChild(createBody(inputs, turn.time, 12, "muted-foreground"));
  content.appendChild(head);

  // Bubble surface — reuse the page-built Bubble where present.
  const bubble = reuseBubble(
    inputs,
    turn.align,
    turn.bubbleVariant,
    turn.message,
  );
  content.appendChild(bubble);

  // Optional attachment chip below the bubble.
  if (turn.attachment) {
    const attachment = reuseAttachment(inputs);
    content.appendChild(attachment);
  }

  if (isEnd) {
    messageRow.appendChild(content);
    messageRow.appendChild(avatar);
  } else {
    messageRow.appendChild(avatar);
    messageRow.appendChild(content);
  }
  try {
    (content as unknown as { layoutGrow: number }).layoutGrow = 1;
  } catch {
    // Keep intrinsic width.
  }

  return messageRow;
}

// The composer: a prompt input that grows beside a primary send button, over a
// top border.
function buildComposer(inputs: BlocksInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const composer = figma.createFrame();
  composer.name = "Composer";
  composer.layoutMode = "HORIZONTAL";
  composer.primaryAxisSizingMode = "FIXED";
  composer.counterAxisSizingMode = "AUTO";
  composer.counterAxisAlignItems = "CENTER";
  composer.resize(CARD_WIDTH, 1);
  composer.itemSpacing = 8;
  composer.paddingLeft = PAD;
  composer.paddingRight = PAD;
  composer.paddingTop = 12;
  composer.paddingBottom = 12;
  composer.fills = [];
  bindStrokeColor(composer, t.get("border"));
  composer.strokeWeight = 1;
  composer.strokeAlign = "INSIDE";
  composer.strokeTopWeight = 1;
  composer.strokeBottomWeight = 0;
  composer.strokeLeftWeight = 0;
  composer.strokeRightWeight = 0;

  // Prompt input (rounded surface with placeholder).
  const input = figma.createFrame();
  input.name = "Prompt Input";
  input.layoutMode = "HORIZONTAL";
  input.primaryAxisSizingMode = "FIXED";
  input.counterAxisSizingMode = "FIXED";
  input.counterAxisAlignItems = "CENTER";
  input.resize(10, 40);
  input.paddingLeft = 12;
  input.paddingRight = 12;
  input.cornerRadius = 10;
  bindCornerRadii(input, p.get("radius/lg"));
  bindFill(input, t.get("background"));
  bindStrokeColor(input, t.get("input"));
  input.strokeWeight = 1;
  input.strokeAlign = "INSIDE";
  input.appendChild(
    createBody(inputs, "Message Acme AI...", 14, "muted-foreground"),
  );
  composer.appendChild(input);
  try {
    (input as unknown as { layoutGrow: number }).layoutGrow = 1;
  } catch {
    // Keep intrinsic width.
  }

  composer.appendChild(buildSendButton(inputs));

  return composer;
}

// A primary send button with an arrow glyph (drawn, not reused, so the composer
// chrome stays self-contained).
function buildSendButton(inputs: BlocksInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = "Send";
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "FIXED";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.resize(40, 40);
  btn.cornerRadius = 10;
  bindCornerRadii(btn, p.get("radius/lg"));
  bindFill(btn, t.get("primary"));
  btn.strokes = [];

  const glyph = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "arrow-right",
    size: 18,
    color: t.get("primary-foreground"),
  });
  if (glyph) {
    glyph.name = "Glyph";
    btn.appendChild(glyph);
  }
  return btn;
}

// ----- Reuse helpers (instance the page-built component, else draw) ---------

function reuseBubble(
  inputs: BlocksInputs,
  align: "start" | "end",
  variant: string,
  message: string,
): SceneNode {
  const instance = instanceFromComponents(
    inputs,
    "Bubble",
    `Variant=${variant}, Align=${align}`,
    message,
  );
  return instance ?? drawBubble(inputs, align, message);
}

function reuseMarker(
  inputs: BlocksInputs,
  variant: "separator" | "default",
  label: string,
): SceneNode {
  const instance = instanceFromComponents(
    inputs,
    "Marker",
    `Variant=${variant}`,
    label,
  );
  return instance ?? drawMarker(inputs, label);
}

function reuseAttachment(inputs: BlocksInputs): SceneNode {
  const instance = instanceFromComponents(
    inputs,
    "Attachment",
    "Media=image, State=done",
  );
  return instance ?? drawAttachment(inputs);
}

// ----- Drawn fallbacks ------------------------------------------------------

function buildAvatar(inputs: BlocksInputs, initials: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const avatar = figma.createFrame();
  avatar.name = "Avatar";
  avatar.layoutMode = "HORIZONTAL";
  avatar.primaryAxisSizingMode = "FIXED";
  avatar.counterAxisSizingMode = "FIXED";
  avatar.primaryAxisAlignItems = "CENTER";
  avatar.counterAxisAlignItems = "CENTER";
  avatar.resize(AVATAR_SIZE, AVATAR_SIZE);
  avatar.cornerRadius = 9999;
  bindCornerRadii(avatar, p.get("radius/full"));
  bindFill(avatar, t.get("muted"));
  avatar.strokes = [];
  avatar.clipsContent = true;

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = initials;
  text.fontSize = 12;
  bindFontSize(text, p.get("font/size/xs"));
  bindFill(text, t.get("muted-foreground"));
  avatar.appendChild(text);
  return avatar;
}

function drawBubble(
  inputs: BlocksInputs,
  align: "start" | "end",
  message: string,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const isEnd = align === "end";

  const bubble = figma.createFrame();
  bubble.name = "Bubble";
  bubble.layoutMode = "HORIZONTAL";
  bubble.primaryAxisSizingMode = "AUTO";
  bubble.counterAxisSizingMode = "AUTO";
  bubble.paddingLeft = 12;
  bubble.paddingRight = 12;
  bubble.paddingTop = 8;
  bubble.paddingBottom = 8;
  bubble.cornerRadius = 12;
  bindCornerRadii(bubble, p.get("radius/xl"));
  bindFill(bubble, isEnd ? t.get("primary") : t.get("muted"));
  bubble.strokes = [];

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.name = "Message";
  text.characters = message;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, isEnd ? t.get("primary-foreground") : t.get("foreground"));
  bubble.appendChild(text);
  return bubble;
}

function drawMarker(inputs: BlocksInputs, label: string): FrameNode {
  const row = createRow("Marker", 8);
  row.primaryAxisAlignItems = "CENTER";
  row.counterAxisAlignItems = "CENTER";
  const text = createBody(inputs, label, 14, "muted-foreground");
  text.name = "Label";
  row.appendChild(text);
  return row;
}

function drawAttachment(inputs: BlocksInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const chip = figma.createFrame();
  chip.name = "Attachment";
  chip.layoutMode = "HORIZONTAL";
  chip.primaryAxisSizingMode = "AUTO";
  chip.counterAxisSizingMode = "AUTO";
  chip.counterAxisAlignItems = "CENTER";
  chip.itemSpacing = 8;
  chip.paddingLeft = 8;
  chip.paddingRight = 8;
  chip.paddingTop = 8;
  chip.paddingBottom = 8;
  chip.cornerRadius = 12;
  bindCornerRadii(chip, p.get("radius/xl"));
  bindFill(chip, t.get("card"));
  bindStrokeColor(chip, t.get("border"));
  chip.strokeWeight = 1;
  chip.strokeAlign = "INSIDE";

  const tile = figma.createFrame();
  tile.name = "Media";
  tile.resize(40, 40);
  tile.cornerRadius = 8;
  bindCornerRadii(tile, p.get("radius/lg"));
  bindFill(tile, t.get("muted"));
  tile.strokes = [];
  chip.appendChild(tile);

  chip.appendChild(
    createBody(inputs, "photo.jpg", 14, "card-foreground", "Medium"),
  );
  return chip;
}
