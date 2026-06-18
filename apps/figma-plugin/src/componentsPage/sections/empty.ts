// Empty: a centered empty-state placeholder. Mirrors radix-nova's Empty:
// `flex-col items-center justify-center gap-4 rounded-xl border-dashed p-6
// text-center`. Inside sits an EmptyMedia (`icon` or `avatar` variant), an
// EmptyTitle (`text-sm font-medium tracking-tight`), an EmptyDescription
// (`text-sm text-muted-foreground`), and an EmptyContent row with an action.
//
// We surface the common compositions designers actually swap as a curated
// `Variant` axis:
//   default    — dashed border, icon media, primary action button
//   avatar     — dashed border, avatar media, no action (e.g. "no members")
//   background — solid `bg-muted/30` surface, icon media, primary action
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

const EMPTY_VARIANTS = ["default", "avatar", "background"] as const;
type EmptyVariant = (typeof EMPTY_VARIANTS)[number];

const EMPTY_WIDTH = 384;

export async function addEmptySection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of EMPTY_VARIANTS) {
    const comp = buildEmptyComponent(inputs, variant);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Empty";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildEmptyComponent(
  inputs: ComponentsInputs,
  variant: EmptyVariant,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}`;
  comp.layoutMode = "VERTICAL";
  comp.resize(EMPTY_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "CENTER";
  comp.counterAxisAlignItems = "CENTER";
  // `gap-4 p-6 rounded-xl`.
  comp.itemSpacing = 16;
  comp.paddingTop = 24;
  comp.paddingBottom = 24;
  comp.paddingLeft = 24;
  comp.paddingRight = 24;
  comp.cornerRadius = 12;
  bindCornerRadii(comp, p.get("radius/xl"));

  // `background` fills a muted surface; the others use a dashed border.
  if (variant === "background") {
    bindFill(comp, t.get("muted"));
    comp.strokes = [];
  } else {
    comp.fills = [];
    // border-dashed — Figma renders the dash via dashPattern on the stroke.
    bindStrokeColor(comp, t.get("border"));
    comp.strokeWeight = 1;
    comp.strokeAlign = "INSIDE";
    comp.dashPattern = [4, 4];
  }

  // Header: media + title + description (`max-w-sm items-center gap-2`).
  const header = figma.createFrame();
  header.name = "Empty Header";
  header.layoutMode = "VERTICAL";
  header.primaryAxisSizingMode = "AUTO";
  header.counterAxisSizingMode = "AUTO";
  header.primaryAxisAlignItems = "CENTER";
  header.counterAxisAlignItems = "CENTER";
  header.itemSpacing = 8;
  header.fills = [];
  header.strokes = [];
  comp.appendChild(header);

  // Illustration slot: the empty-state media (icon/avatar), so instances can
  // swap in their own illustration.
  const media =
    variant === "avatar" ? buildAvatarMedia(inputs) : buildIconMedia(inputs);
  const illustration = createConfiguredSlot(comp, "Illustration", [media], {
    description: "Empty-state illustration (icon, avatar, image).",
    settings: { maxChildren: 1 },
  });
  header.appendChild(illustration);
  illustration.layoutMode = "HORIZONTAL";
  illustration.primaryAxisSizingMode = "AUTO";
  illustration.counterAxisSizingMode = "AUTO";
  illustration.primaryAxisAlignItems = "CENTER";
  illustration.counterAxisAlignItems = "CENTER";
  illustration.fills = [];
  illustration.strokes = [];

  const titleText = variant === "avatar" ? "No members yet" : "No projects yet";
  const descText =
    variant === "avatar"
      ? "Invite teammates to start collaborating on this workspace."
      : "Create your first project to get started. You can always add more later.";

  const title = figma.createText();
  applyFont(title, "heading", "Medium");
  title.characters = titleText;
  title.fontSize = 14;
  bindFontSize(title, p.get("font/size/sm"));
  bindFill(title, t.get("foreground"));
  title.textAlignHorizontal = "CENTER";
  header.appendChild(title);

  const desc = figma.createText();
  applyFont(desc, "body", "Regular");
  desc.characters = descText;
  desc.fontSize = 14;
  bindFontSize(desc, p.get("font/size/sm"));
  bindFill(desc, t.get("muted-foreground"));
  desc.textAlignHorizontal = "CENTER";
  desc.resize(288, desc.height);
  header.appendChild(desc);

  // Content: a primary action button in an Action slot — omitted for the
  // avatar variant.
  if (variant !== "avatar") {
    const content = figma.createFrame();
    content.name = "Empty Content";
    content.layoutMode = "HORIZONTAL";
    content.primaryAxisSizingMode = "AUTO";
    content.counterAxisSizingMode = "AUTO";
    content.primaryAxisAlignItems = "CENTER";
    content.counterAxisAlignItems = "CENTER";
    content.itemSpacing = 10;
    content.fills = [];
    content.strokes = [];
    comp.appendChild(content);

    const action = createConfiguredSlot(
      comp,
      "Action",
      [buildActionButton(inputs)],
      { description: "Empty-state action (button)." },
    );
    content.appendChild(action);
    action.layoutMode = "HORIZONTAL";
    action.primaryAxisSizingMode = "AUTO";
    action.counterAxisSizingMode = "AUTO";
    action.primaryAxisAlignItems = "CENTER";
    action.counterAxisAlignItems = "CENTER";
    action.itemSpacing = 10;
    action.fills = [];
    action.strokes = [];
  }

  return comp;
}

// Media (`icon` variant): `size-8 rounded-lg bg-muted` with a `size-4` icon.
function buildIconMedia(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const media = figma.createFrame();
  media.name = "Empty Media";
  media.layoutMode = "HORIZONTAL";
  media.primaryAxisSizingMode = "FIXED";
  media.counterAxisSizingMode = "FIXED";
  media.primaryAxisAlignItems = "CENTER";
  media.counterAxisAlignItems = "CENTER";
  media.resize(32, 32);
  media.cornerRadius = 8;
  bindCornerRadii(media, p.get("radius/lg"));
  bindFill(media, t.get("muted"));
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
  } else {
    const dot = figma.createFrame();
    dot.name = "Icon";
    dot.resize(16, 16);
    dot.cornerRadius = 4;
    bindCornerRadii(dot, p.get("radius/sm"));
    bindFill(dot, t.get("foreground"));
    media.appendChild(dot);
  }

  return media;
}

// Media (`avatar` variant): a `size-10 rounded-full bg-muted` circle with
// initials.
function buildAvatarMedia(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const media = figma.createFrame();
  media.name = "Empty Media";
  media.layoutMode = "HORIZONTAL";
  media.primaryAxisSizingMode = "FIXED";
  media.counterAxisSizingMode = "FIXED";
  media.primaryAxisAlignItems = "CENTER";
  media.counterAxisAlignItems = "CENTER";
  media.resize(40, 40);
  media.cornerRadius = 9999;
  bindCornerRadii(media, p.get("radius/full"));
  bindFill(media, t.get("muted"));
  media.strokes = [];

  const initials = figma.createText();
  applyFont(initials, "body", "Medium");
  initials.characters = "+";
  initials.fontSize = 16;
  bindFontSize(initials, p.get("font/size/base"));
  bindFill(initials, t.get("muted-foreground"));
  media.appendChild(initials);

  return media;
}

// A primary default-size button (`h-8 px-2.5 rounded-lg bg-primary`).
function buildActionButton(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = "Button";
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "AUTO";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.itemSpacing = 6;
  btn.paddingLeft = 10;
  btn.paddingRight = 10;
  btn.resize(btn.width, 32);
  btn.primaryAxisSizingMode = "AUTO";
  btn.cornerRadius = 8;
  bindCornerRadii(btn, p.get("radius/lg"));
  bindFill(btn, t.get("primary"));
  btn.strokes = [];

  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "plus",
    size: 16,
    color: t.get("primary-foreground"),
  });
  if (icon) {
    icon.name = "Icon";
    btn.appendChild(icon);
  }

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = "New Project";
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get("primary-foreground"));
  btn.appendChild(text);

  return btn;
}
