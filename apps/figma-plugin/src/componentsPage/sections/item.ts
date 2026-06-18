// Item: a flexible list row with a media slot, content (title + description),
// and a trailing actions slot. Mirrors radix-nova's Item primitives:
//
//   Item             `flex w-full items-center rounded-lg border gap-2.5
//                     px-3 py-2.5 text-sm`
//   ItemMedia        `size-4` icon / avatar / image, self-start with a desc
//   ItemContent      `flex flex-1 flex-col gap-1`
//   ItemTitle        `text-sm font-medium leading-snug` (foreground)
//   ItemDescription  `text-sm text-muted-foreground leading-normal`
//   ItemActions      `flex items-center gap-2`
//
// We surface the common compositions designers actually swap as a curated
// `Variant` axis — the border/background and the media/actions slots change:
//   default — `border-transparent`, icon media, trailing chevron
//   outline — `border-border`, icon media, trailing chevron
//   muted   — `bg-muted/50`, icon media, trailing chevron
//   avatar  — outline, avatar media, trailing action button
//   action  — outline, icon media, trailing primary button
//
// Every variant binds the selected preset's semantic tokens, radius, font, and
// icon library.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const ITEM_VARIANTS = [
  "default",
  "outline",
  "muted",
  "avatar",
  "action",
] as const;
type ItemVariant = (typeof ITEM_VARIANTS)[number];

const ITEM_WIDTH = 360;

export async function addItemSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of ITEM_VARIANTS) {
    const comp = buildItemComponent(inputs, variant);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Item";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildItemComponent(
  inputs: ComponentsInputs,
  variant: ItemVariant,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}`;
  comp.layoutMode = "HORIZONTAL";
  comp.resize(ITEM_WIDTH, 10);
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "AUTO";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  // `gap-2.5 px-3 py-2.5 rounded-lg border`.
  comp.itemSpacing = 10;
  comp.paddingLeft = 12;
  comp.paddingRight = 12;
  comp.paddingTop = 10;
  comp.paddingBottom = 10;
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  // `muted` fills with a muted surface; `outline`/`avatar`/`action` show a
  // border; `default` is transparent (borderless).
  if (variant === "muted") {
    bindFill(comp, t.get("muted"));
    comp.strokes = [];
  } else if (variant === "default") {
    comp.fills = [];
    comp.strokes = [];
  } else {
    comp.fills = [];
    bindStrokeColor(comp, t.get("border"));
  }

  // Media slot ("Leading"): an avatar for the `avatar` variant, otherwise a
  // `size-4` icon. Wrapped in a slot so instances can swap the media.
  const media =
    variant === "avatar" ? buildAvatarMedia(inputs) : buildIconMedia(inputs);
  const leading = createConfiguredSlot(comp, "Leading", [media], {
    description: "Item media (icon, avatar, image).",
    settings: { maxChildren: 1 },
  });
  leading.layoutMode = "HORIZONTAL";
  leading.primaryAxisSizingMode = "AUTO";
  leading.counterAxisSizingMode = "AUTO";
  leading.primaryAxisAlignItems = "CENTER";
  leading.counterAxisAlignItems = "CENTER";
  leading.fills = [];
  leading.strokes = [];

  // Content slot: title + description (`flex-1 flex-col gap-1`).
  const titleText = variant === "avatar" ? "Sofia Davis" : "Project files";
  const descText =
    variant === "avatar"
      ? "sofia@example.com"
      : "12 files · updated 2 hours ago";

  const title = figma.createText();
  applyFont(title, "body", "Medium");
  title.characters = titleText;
  title.fontSize = 14;
  bindFontSize(title, p.get("font/size/sm"));
  bindFill(title, t.get("foreground"));

  const desc = figma.createText();
  applyFont(desc, "body", "Regular");
  desc.characters = descText;
  desc.fontSize = 14;
  bindFontSize(desc, p.get("font/size/sm"));
  bindFill(desc, t.get("muted-foreground"));

  const content = createConfiguredSlot(comp, "Content", [title, desc], {
    description: "Item content (title + description).",
  });
  content.layoutMode = "VERTICAL";
  content.primaryAxisSizingMode = "AUTO";
  content.counterAxisSizingMode = "AUTO";
  content.itemSpacing = 4;
  content.fills = [];
  content.strokes = [];
  content.layoutGrow = 1;
  content.layoutSizingHorizontal = "FILL";
  title.layoutSizingHorizontal = "FILL";
  desc.layoutSizingHorizontal = "FILL";

  // Actions slot ("Trailing"): a trailing button for avatar/action variants,
  // otherwise a chevron.
  let trailingChild: SceneNode;
  if (variant === "avatar" || variant === "action") {
    trailingChild = buildActionButton(inputs, variant === "avatar");
  } else {
    const chevronWrap = figma.createFrame();
    chevronWrap.name = "Chevron Wrap";
    chevronWrap.layoutMode = "HORIZONTAL";
    chevronWrap.primaryAxisSizingMode = "FIXED";
    chevronWrap.counterAxisSizingMode = "FIXED";
    chevronWrap.primaryAxisAlignItems = "CENTER";
    chevronWrap.counterAxisAlignItems = "CENTER";
    chevronWrap.resize(20, 20);
    chevronWrap.fills = [];
    chevronWrap.strokes = [];
    chevronWrap.appendChild(buildChevronRight(t));
    trailingChild = chevronWrap;
  }
  const trailing = createConfiguredSlot(comp, "Trailing", [trailingChild], {
    description: "Item actions (button, chevron, controls).",
  });
  trailing.layoutMode = "HORIZONTAL";
  trailing.primaryAxisSizingMode = "AUTO";
  trailing.counterAxisSizingMode = "AUTO";
  trailing.primaryAxisAlignItems = "CENTER";
  trailing.counterAxisAlignItems = "CENTER";
  trailing.itemSpacing = 8;
  trailing.fills = [];
  trailing.strokes = [];

  return comp;
}

// A `size-4` icon media slot.
function buildIconMedia(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;

  const media = figma.createFrame();
  media.name = "Item Media";
  media.layoutMode = "HORIZONTAL";
  media.primaryAxisSizingMode = "FIXED";
  media.counterAxisSizingMode = "FIXED";
  media.primaryAxisAlignItems = "CENTER";
  media.counterAxisAlignItems = "CENTER";
  media.resize(20, 20);
  media.fills = [];
  media.strokes = [];
  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "folder",
    size: 16,
    color: t.get("foreground"),
  });
  if (icon) {
    icon.name = "Icon";
    media.appendChild(icon);
  }
  return media;
}

// An avatar media slot (`size-8 rounded-full bg-muted` with initials).
function buildAvatarMedia(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const media = figma.createFrame();
  media.name = "Item Media";
  media.layoutMode = "HORIZONTAL";
  media.primaryAxisSizingMode = "FIXED";
  media.counterAxisSizingMode = "FIXED";
  media.primaryAxisAlignItems = "CENTER";
  media.counterAxisAlignItems = "CENTER";
  media.resize(32, 32);
  media.cornerRadius = 9999;
  bindCornerRadii(media, p.get("radius/full"));
  bindFill(media, t.get("muted"));
  media.strokes = [];

  const initials = figma.createText();
  applyFont(initials, "body", "Medium");
  initials.characters = "SD";
  initials.fontSize = 12;
  bindFontSize(initials, p.get("font/size/xs"));
  bindFill(initials, t.get("muted-foreground"));
  media.appendChild(initials);

  return media;
}

// A trailing action button: outline ("View") for the avatar variant, primary
// ("Open") for the action variant.
function buildActionButton(
  inputs: ComponentsInputs,
  outline: boolean,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = "Item Actions";
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "AUTO";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.resize(btn.width, 28);
  btn.primaryAxisSizingMode = "AUTO";
  btn.paddingLeft = 10;
  btn.paddingRight = 10;
  btn.cornerRadius = 6;
  bindCornerRadii(btn, p.get("radius/md"));

  if (outline) {
    bindFill(btn, t.get("background"));
    bindStrokeColor(btn, t.get("input"));
    btn.strokeWeight = 1;
  } else {
    bindFill(btn, t.get("primary"));
    btn.strokes = [];
  }

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = outline ? "View" : "Open";
  text.fontSize = 13;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, outline ? t.get("foreground") : t.get("primary-foreground"));
  btn.appendChild(text);

  return btn;
}

function buildChevronRight(t: Map<string, Variable>): VectorNode {
  const chevron = figma.createVector();
  chevron.name = "Chevron";
  chevron.resize(16, 16);
  chevron.vectorPaths = [
    {
      windingRule: "NONZERO",
      data: "M 6 4 L 10 8 L 6 12",
    },
  ];
  chevron.strokeWeight = 1.5;
  chevron.strokeCap = "ROUND";
  chevron.strokeJoin = "ROUND";
  chevron.fills = [];
  bindStrokeColor(chevron, t.get("muted-foreground"));
  return chevron;
}
