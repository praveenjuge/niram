// Message: a single message row in a conversation (shadcn's Message +
// MessageAvatar / Content / Header / Footer, new in the June 2026 chat
// components). It lays out the avatar, header, message surface, and footer, and
// flips sides via the `align` prop.
//
// Mirrors apps/v4/registry/new-york-v4/ui/message.tsx: a `flex gap-2` row with a
// `self-end` avatar beside a `flex-col gap-2.5` content column (a muted-text
// header, the bubble surface, and a footer). `align=end` reverses the row and
// right-aligns the content (the sender's own messages); `align=start` is the
// incoming/assistant side. The bubble surface is drawn inline here so Message
// stands on its own; the standalone Bubble component covers the full variant
// range.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
} from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";
import { collectByTypeAndName, defineTextProperty } from "../properties";

const MESSAGE_WIDTH = 420;
const AVATAR_SIZE = 32;

const MESSAGE_ALIGNMENTS = ["start", "end"] as const;
type MessageAlign = (typeof MESSAGE_ALIGNMENTS)[number];

// Per-side defaults: the assistant/incoming side (start) vs. the sender's own
// side (end).
type SideCopy = {
  name: string;
  initials: string;
  time: string;
  message: string;
  footer: string;
};
const SIDE_COPY: Record<MessageAlign, SideCopy> = {
  start: {
    name: "Acme AI",
    initials: "AI",
    time: "10:24 AM",
    message: "Here's the summary you asked for.",
    footer: "Delivered",
  },
  end: {
    name: "You",
    initials: "JD",
    time: "10:25 AM",
    message: "Perfect, thanks!",
    footer: "Read",
  },
};

export async function addMessageSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const align of MESSAGE_ALIGNMENTS) {
    const comp = buildMessageComponent(inputs, align);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Message";
  componentSet.layoutMode = "VERTICAL";
  componentSet.itemSpacing = 24;
  styleComponentSet(componentSet);

  defineTextProperty(
    componentSet,
    "Name",
    SIDE_COPY.start.name,
    collectByTypeAndName(componentSet, "TEXT", "Name"),
  );
  defineTextProperty(
    componentSet,
    "Message",
    SIDE_COPY.start.message,
    collectByTypeAndName(componentSet, "TEXT", "Message"),
  );

  return countDescendants(componentSet);
}

function buildMessageComponent(
  inputs: ComponentsInputs,
  align: MessageAlign,
): ComponentNode {
  const copy = SIDE_COPY[align];
  const isEnd = align === "end";

  const comp = figma.createComponent();
  comp.name = `Align=${align}`;
  comp.layoutMode = "HORIZONTAL";
  // `gap-2`; the avatar is `self-end`, so bottom-align the row.
  comp.itemSpacing = 8;
  comp.counterAxisAlignItems = "MAX";
  comp.resize(MESSAGE_WIDTH, 1);
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "AUTO";
  comp.fills = [];
  comp.strokes = [];

  const avatar = buildAvatar(inputs, copy.initials);
  const content = buildContent(inputs, align, copy);

  // `align=end` reverses the row (content then avatar) so the sender's avatar
  // sits on the right.
  if (isEnd) {
    comp.appendChild(content);
    comp.appendChild(avatar);
  } else {
    comp.appendChild(avatar);
    comp.appendChild(content);
  }

  // The content column fills the remaining width (`w-full min-w-0`).
  try {
    (content as unknown as { layoutGrow: number }).layoutGrow = 1;
  } catch {
    // Keep intrinsic width when the host rejects grow.
  }

  return comp;
}

// MessageAvatar: a `size-8 rounded-full bg-muted` tile with initials.
function buildAvatar(inputs: ComponentsInputs, initials: string): FrameNode {
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

// MessageContent: the `flex-col gap-2.5` column holding the header, the bubble
// surface, and the footer. For `align=end` every child self-ends (right).
function buildContent(
  inputs: ComponentsInputs,
  align: MessageAlign,
  copy: SideCopy,
): FrameNode {
  const isEnd = align === "end";

  const content = figma.createFrame();
  content.name = "Content";
  content.layoutMode = "VERTICAL";
  content.primaryAxisSizingMode = "AUTO";
  content.counterAxisSizingMode = "FIXED";
  content.resize(MESSAGE_WIDTH - AVATAR_SIZE - 8, 1);
  content.primaryAxisSizingMode = "AUTO";
  // `gap-2.5`.
  content.itemSpacing = 10;
  content.counterAxisAlignItems = isEnd ? "MAX" : "MIN";
  content.fills = [];
  content.strokes = [];

  content.appendChild(buildHeader(inputs, copy));
  content.appendChild(buildBubble(inputs, align, copy.message));
  content.appendChild(buildFooter(inputs, align, copy.footer));

  return content;
}

// MessageHeader: `px-3 text-xs font-medium text-muted-foreground` — the sender
// name and a timestamp.
function buildHeader(inputs: ComponentsInputs, copy: SideCopy): FrameNode {
  const row = figma.createFrame();
  row.name = "Header";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "AUTO";
  row.counterAxisAlignItems = "CENTER";
  row.itemSpacing = 8;
  row.paddingLeft = 12;
  row.paddingRight = 12;
  row.fills = [];
  row.strokes = [];

  const name = buildMutedText(inputs, copy.name, "Medium");
  name.name = "Name";
  row.appendChild(name);
  row.appendChild(buildMutedText(inputs, copy.time, "Regular"));

  return row;
}

// The bubble surface. `align=start` is muted; `align=end` is the primary
// (sender) fill.
function buildBubble(
  inputs: ComponentsInputs,
  align: MessageAlign,
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
  bubble.counterAxisAlignItems = "CENTER";
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

// MessageFooter: `px-3 text-xs font-medium text-muted-foreground`; `align=end`
// justifies to the end. Shows a small status (a check + label).
function buildFooter(
  inputs: ComponentsInputs,
  align: MessageAlign,
  status: string,
): FrameNode {
  const t = inputs.theme.light;
  const isEnd = align === "end";

  const row = figma.createFrame();
  row.name = "Footer";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "AUTO";
  row.counterAxisAlignItems = "CENTER";
  row.primaryAxisAlignItems = isEnd ? "MAX" : "MIN";
  row.itemSpacing = 4;
  row.paddingLeft = 12;
  row.paddingRight = 12;
  row.fills = [];
  row.strokes = [];

  const check = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "check",
    size: 12,
    color: t.get("muted-foreground"),
  });
  if (check) {
    check.name = "Status Icon";
    row.appendChild(check);
  }
  row.appendChild(buildMutedText(inputs, status, "Medium"));

  return row;
}

function buildMutedText(
  inputs: ComponentsInputs,
  text: string,
  weight: "Regular" | "Medium",
): TextNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const node = figma.createText();
  applyFont(node, "body", weight);
  node.characters = text;
  node.fontSize = 12;
  bindFontSize(node, p.get("font/size/xs"));
  bindFill(node, t.get("muted-foreground"));
  return node;
}
