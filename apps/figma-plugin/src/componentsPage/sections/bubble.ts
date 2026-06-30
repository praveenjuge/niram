// Bubble: the message surface in a conversation (shadcn's Bubble /
// BubbleContent / BubbleReactions, new in the June 2026 chat components). It's
// the rounded chat bubble a Message wraps around its content.
//
// Mirrors shadcn's `bubbleVariants` (apps/v4/registry/new-york-v4/ui/bubble.tsx):
// seven content treatments — default (primary), secondary, muted, tinted (a
// light primary wash), outline, ghost (chrome-less), and destructive — crossed
// with the `align` prop (start / end) that flips a bubble to the sender's side.
// A BOOLEAN `Reactions` property toggles the little reactions pill that sits on
// the bubble's bottom edge.

import {
  addTintedSurface,
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";
import {
  collectByTypeAndName,
  defineBooleanProperty,
  defineTextProperty,
} from "../properties";

// shadcn's seven bubble variants.
const BUBBLE_VARIANTS = [
  "default",
  "secondary",
  "muted",
  "tinted",
  "outline",
  "ghost",
  "destructive",
] as const;
type BubbleVariant = (typeof BUBBLE_VARIANTS)[number];

// The `align` prop: assistant/system bubbles sit at the start, the sender's own
// bubbles at the end.
const BUBBLE_ALIGNMENTS = ["start", "end"] as const;
type BubbleAlign = (typeof BUBBLE_ALIGNMENTS)[number];

// Sample copy each bubble ships with (editable via the `Message` text property).
const SAMPLE_MESSAGE = "Sounds great, let's ship it.";

export async function addBubbleSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of BUBBLE_VARIANTS) {
    for (const align of BUBBLE_ALIGNMENTS) {
      const comp = buildBubbleComponent(inputs, variant, align);
      page.appendChild(comp);
      components.push(comp);
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Bubble";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.layoutWrap = "WRAP";
  componentSet.counterAxisAlignItems = "MIN";
  componentSet.itemSpacing = 24;
  componentSet.counterAxisSpacing = 24;
  styleComponentSet(componentSet);

  // The bubble copy is editable across every variant.
  defineTextProperty(
    componentSet,
    "Message",
    SAMPLE_MESSAGE,
    collectByTypeAndName(componentSet, "TEXT", "Message"),
  );

  // The reactions pill is hidden by default; the property toggles it on.
  defineBooleanProperty(
    componentSet,
    "Reactions",
    false,
    collectByTypeAndName(componentSet, "FRAME", "Reactions"),
  );

  return countDescendants(componentSet);
}

function buildBubbleComponent(
  inputs: ComponentsInputs,
  variant: BubbleVariant,
  align: BubbleAlign,
): ComponentNode {
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}, Align=${align}`;
  comp.layoutMode = "VERTICAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  // Bubble: `flex flex-col gap-1`; align=end self-ends the surface.
  comp.itemSpacing = 4;
  comp.counterAxisAlignItems = align === "end" ? "MAX" : "MIN";
  comp.fills = [];
  comp.strokes = [];
  comp.clipsContent = false;

  // BubbleContent: the rounded surface holding the message text.
  const content = figma.createFrame();
  content.name = "Content";
  content.layoutMode = "HORIZONTAL";
  content.primaryAxisSizingMode = "AUTO";
  content.counterAxisSizingMode = "AUTO";
  content.counterAxisAlignItems = "CENTER";
  // `rounded-xl px-3 py-2` (ghost is chrome-less: no padding, no radius).
  if (variant === "ghost") {
    content.paddingLeft = 0;
    content.paddingRight = 0;
    content.paddingTop = 0;
    content.paddingBottom = 0;
    content.cornerRadius = 0;
  } else {
    content.paddingLeft = 12;
    content.paddingRight = 12;
    content.paddingTop = 8;
    content.paddingBottom = 8;
    content.cornerRadius = 12;
    bindCornerRadii(content, p.get("radius/xl"));
  }
  content.strokes = [];
  applyBubbleSurface(inputs, content, variant);

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.name = "Message";
  text.characters = SAMPLE_MESSAGE;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, bubbleForegroundVar(variant, inputs));
  content.appendChild(text);

  comp.appendChild(content);

  // BubbleReactions: a muted pill (a reaction glyph + count) ringed by the card
  // colour, sitting on the bubble's bottom edge. Hidden until the `Reactions`
  // property turns it on.
  const reactions = buildReactionsPill(inputs);
  reactions.visible = false;
  comp.appendChild(reactions);
  try {
    reactions.layoutPositioning = "ABSOLUTE";
    // Bottom edge, on the bubble's own side (end → right, start → left).
    const contentWidth = content.width || 0;
    const contentHeight = content.height || 0;
    const pillWidth = reactions.width || 0;
    const pillHeight = reactions.height || 0;
    reactions.x =
      align === "end" ? Math.max(0, contentWidth - pillWidth - 12) : 12;
    reactions.y = Math.max(0, contentHeight - pillHeight / 2);
  } catch {
    // Host rejected absolute positioning — the pill stays in flow below the
    // bubble, still toggled by the property.
  }

  return comp;
}

// Paint the BubbleContent surface per variant. Most variants are solid theme
// fills; `tinted` and `destructive` are semi-transparent washes drawn as a
// faded background layer (Figma ignores paint opacity on a variable-bound
// fill), and `outline` is a bordered background surface. `ghost` paints
// nothing. Runs before the message text is appended so a wash sits behind it.
function applyBubbleSurface(
  inputs: ComponentsInputs,
  content: FrameNode,
  variant: BubbleVariant,
): void {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  content.fills = [];
  switch (variant) {
    case "default":
      bindFill(content, t.get("primary"));
      break;
    case "secondary":
      bindFill(content, t.get("secondary"));
      break;
    case "muted":
      bindFill(content, t.get("muted"));
      break;
    case "tinted":
      // A light primary wash (`oklch(from var(--primary) 0.93 …)`), drawn as a
      // 12%-opacity primary layer so it still tracks the theme.
      addTintedSurface(content, t.get("primary"), 0.12, p.get("radius/xl"));
      break;
    case "outline":
      bindFill(content, t.get("background"));
      bindStrokeColor(content, t.get("border"));
      content.strokeWeight = 1;
      content.strokeAlign = "INSIDE";
      break;
    case "ghost":
      content.fills = [];
      break;
    case "destructive":
      // `bg-destructive/10 text-destructive` — a 10% destructive wash.
      addTintedSurface(content, t.get("destructive"), 0.1, p.get("radius/xl"));
      break;
  }
}

// The text/icon colour that reads against each bubble surface.
function bubbleForegroundVar(
  variant: BubbleVariant,
  inputs: ComponentsInputs,
): Variable | undefined {
  const t = inputs.theme.light;
  switch (variant) {
    case "default":
      return t.get("primary-foreground");
    case "secondary":
      return t.get("secondary-foreground");
    case "destructive":
      return t.get("destructive");
    case "muted":
    case "tinted":
    case "outline":
    case "ghost":
      return t.get("foreground");
  }
}

// A reactions pill: `rounded-full bg-muted px-1.5 py-0.5 ring-3 ring-card` with
// a reaction glyph + count. Named "Reactions" so the section can bind its
// visibility to the BOOLEAN property.
function buildReactionsPill(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const pill = figma.createFrame();
  pill.name = "Reactions";
  pill.layoutMode = "HORIZONTAL";
  pill.primaryAxisSizingMode = "AUTO";
  pill.counterAxisSizingMode = "AUTO";
  pill.counterAxisAlignItems = "CENTER";
  pill.itemSpacing = 4;
  pill.paddingLeft = 6;
  pill.paddingRight = 6;
  pill.paddingTop = 2;
  pill.paddingBottom = 2;
  pill.cornerRadius = 9999;
  bindCornerRadii(pill, p.get("radius/full"));
  bindFill(pill, t.get("muted"));
  // `ring-3 ring-card`: a 3px card-coloured ring separates the pill from the
  // bubble it overlaps.
  bindStrokeColor(pill, t.get("card"));
  pill.strokeWeight = 3;
  pill.strokeAlign = "OUTSIDE";

  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "star",
    size: 12,
    color: t.get("muted-foreground"),
  });
  if (icon) {
    icon.name = "Reaction";
    pill.appendChild(icon);
  }

  const count = figma.createText();
  applyFont(count, "body", "Medium");
  count.characters = "12";
  count.fontSize = 12;
  bindFontSize(count, p.get("font/size/xs"));
  bindFill(count, t.get("muted-foreground"));
  pill.appendChild(count);

  return pill;
}
