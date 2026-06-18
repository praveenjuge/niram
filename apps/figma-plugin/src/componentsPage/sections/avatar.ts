// Avatar: circular initials/image placeholder. Three sizes × two kinds.
//
// The "image" variants use real photos bundled at build time, surfaced as
// Figma paint styles (see ../avatarStyles). A designer can swap any avatar to a
// different bundled face from the fill-style picker. The "fallback" variants
// keep the initials-on-muted treatment from shadcn's AvatarFallback.

import { ensureAvatarStyles, type AvatarStyleMap } from "../avatarStyles";
import { applyFont } from "../../fonts";
import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { styleComponentSet } from "../layout";
import { type ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const AVATAR_SIZES = ["sm", "default", "lg"] as const;
type AvatarSize = (typeof AVATAR_SIZES)[number];

const AVATAR_KINDS = ["image", "fallback"] as const;
type AvatarKind = (typeof AVATAR_KINDS)[number];

// Presence status surfaced as a corner dot. `none` hides it; online/away/
// offline tint it green/amber/muted. shadcn has no built-in status, but it is
// one of the most common avatar embellishments designers add, so we expose it.
const AVATAR_STATUSES = ["none", "online", "away", "offline"] as const;
type AvatarStatus = (typeof AVATAR_STATUSES)[number];

// Mirrors shadcn's Avatar (radix-ui primitive): size-8 default, size-6 sm,
// size-10 lg. Fallback text uses text-sm by default (text-xs for sm).
const AVATAR_DIMS: Record<
  AvatarSize,
  { size: number; fontSize: number; fontToken: string; dot: number }
> = {
  sm: { size: 24, fontSize: 12, fontToken: "font/size/xs", dot: 6 },
  default: { size: 32, fontSize: 14, fontToken: "font/size/sm", dot: 8 },
  lg: { size: 40, fontSize: 14, fontToken: "font/size/sm", dot: 10 },
};

export async function addAvatarSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const styles = await ensureAvatarStyles();

  const components: ComponentNode[] = [];
  // Give each image variant a different bundled face so the set previews a
  // range of avatars; designers can still swap any of them from the picker.
  let imageSlot = 0;
  for (const size of AVATAR_SIZES) {
    for (const kind of AVATAR_KINDS) {
      for (const status of AVATAR_STATUSES) {
        const slot = kind === "image" ? imageSlot++ : -1;
        const comp = await buildAvatarComponent(
          inputs,
          size,
          kind,
          status,
          styles,
          slot,
        );
        page.appendChild(comp);
        components.push(comp);
      }
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Avatar";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildAvatarComponent(
  inputs: ComponentsInputs,
  size: AvatarSize,
  kind: AvatarKind,
  status: AvatarStatus,
  styles: AvatarStyleMap,
  imageSlot: number,
): Promise<ComponentNode> {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const dims = AVATAR_DIMS[size];

  const comp = figma.createComponent();
  comp.name = `Size=${size}, Kind=${kind}, Status=${status}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "CENTER";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(dims.size, dims.size);
  comp.cornerRadius = 9999;
  bindCornerRadii(comp, p.get("radius/full"));
  // The status dot sits on the avatar edge, so don't clip when one is shown.
  comp.clipsContent = status === "none";

  const finish = (): ComponentNode => {
    appendStatusDot(comp, inputs, dims, status);
    return comp;
  };

  if (kind === "image") {
    // Prefer a real bundled photo via its paint style; fall back to a tinted
    // fill + initials if no style is available (e.g. data module missing).
    const styleId = imageSlot >= 0 ? styles.idAt(imageSlot) : undefined;
    if (styleId) {
      return applyImageStyle(comp, styleId).then(finish);
    }
    bindFill(comp, t.get("chart-1"));
    appendInitials(comp, inputs, dims, "PJ", t.get("primary-foreground"));
    return Promise.resolve(finish());
  }

  bindFill(comp, t.get("muted"));
  appendInitials(comp, inputs, dims, "JD", t.get("muted-foreground"));
  return Promise.resolve(finish());
}

// Append an absolutely-positioned presence dot to the avatar's bottom-right
// edge. No-op for the `none` status. The dot carries a background-coloured
// ring so it reads against both the photo and the avatar edge.
function appendStatusDot(
  comp: ComponentNode,
  inputs: ComponentsInputs,
  dims: { size: number; dot: number },
  status: AvatarStatus,
) {
  if (status === "none") return;
  const t = inputs.theme.light;
  const tw = inputs.tailwindColors;

  const dot = figma.createEllipse();
  dot.name = "Status";
  dot.resize(dims.dot, dims.dot);
  switch (status) {
    case "online":
      bindFill(dot, tw.get("green/500"));
      break;
    case "away":
      bindFill(dot, tw.get("amber/500"));
      break;
    case "offline":
      bindFill(dot, t.get("muted-foreground"));
      break;
  }
  // A ring matching the page background separates the dot from the avatar.
  bindStrokeColor(dot, t.get("background"));
  dot.strokeWeight = 1.5;
  dot.strokeAlign = "OUTSIDE";

  // Append before switching to absolute positioning: Figma only allows
  // layoutPositioning = "ABSOLUTE" once the node is a child of an auto-layout
  // frame (parent layoutMode !== "NONE"). Set the corner offset afterwards.
  comp.appendChild(dot);
  dot.layoutPositioning = "ABSOLUTE";
  // Bottom-right corner, nudged slightly inside so the ring stays on-canvas.
  dot.x = dims.size - dims.dot;
  dot.y = dims.size - dims.dot;
}

// Apply a bundled avatar photo to the component's fill via its paint style so
// the image stays editable/swappable from the Figma styles picker.
async function applyImageStyle(
  comp: ComponentNode,
  styleId: string,
): Promise<void> {
  try {
    await comp.setFillStyleIdAsync(styleId);
  } catch {
    // ignore — leaves the component's default fill in place
  }
}

function appendInitials(
  comp: ComponentNode,
  inputs: ComponentsInputs,
  dims: { fontSize: number; fontToken: string },
  characters: string,
  fillVar: Variable | undefined,
) {
  const p = inputs.primitives;
  const initials = figma.createText();
  applyFont(initials, "body", "Regular");
  initials.characters = characters;
  initials.fontSize = dims.fontSize;
  bindFontSize(initials, p.get(dims.fontToken));
  bindFill(initials, fillVar);
  comp.appendChild(initials);
}
