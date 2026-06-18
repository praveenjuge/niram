// Toggle Group: a row of connected toggle items where one (or more) is
// pressed. Two variants (default / outline) × three sizes mirroring
// radix-nova.
//
// Mirrors radix-nova's ToggleGroup (radix-ui primitive) built on the shared
// `toggleVariants`: default size is `h-8 min-w-8 px-2.5 rounded-lg`, sm is
// `h-7 min-w-7`, lg is `h-9 min-w-9`; pressed items get `bg-muted`, and the
// outline variant adds an `input` border. The default `spacing` is 2 → an 8px
// gap between items.
//
// Each item embeds an instance of the Design System icon set (bold / italic /
// underline — the classic text-formatting group) so the glyphs are swappable
// from Figma's instance menu and stay in sync with the published icon set.
// Falls back to bold "B" / italic "I" / underlined "U" text when the icon set
// isn't available (older callers/tests).

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import {
  instantiateIcon,
  resolveIconLibrary,
  type SemanticIconName,
} from "../../icons";
import { styleComponentSet } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const TOGGLE_GROUP_VARIANTS = ["default", "outline"] as const;
type ToggleGroupVariant = (typeof TOGGLE_GROUP_VARIANTS)[number];

// Mirrors radix-nova's toggleVariants `size` axis (shared with Toggle).
const TOGGLE_GROUP_SIZES = ["sm", "default", "lg"] as const;
type ToggleGroupSize = (typeof TOGGLE_GROUP_SIZES)[number];

// radix-nova sizes: sm `h-7` (28), default `h-8` (32), lg `h-9` (36). The sm
// size rounds with `radius-md` (6); default/lg use `radius-lg` (8).
const TOGGLE_GROUP_DIMS: Record<
  ToggleGroupSize,
  { size: number; radius: number; radiusToken: string; fontSize: number }
> = {
  sm: { size: 28, radius: 6, radiusToken: "radius/md", fontSize: 13 },
  default: { size: 32, radius: 8, radiusToken: "radius/lg", fontSize: 14 },
  lg: { size: 36, radius: 8, radiusToken: "radius/lg", fontSize: 14 },
};

// A classic text-formatting group. The first item starts pressed so the
// "on" surface is visible at a glance. `icon` selects the Design System icon
// instance; `glyph` is the text fallback when the icon set isn't available.
type ItemData = {
  icon: SemanticIconName;
  glyph: string;
  pressed: boolean;
};
const ITEMS: ItemData[] = [
  { icon: "bold", glyph: "B", pressed: true },
  { icon: "italic", glyph: "I", pressed: false },
  { icon: "underline", glyph: "U", pressed: false },
];

export async function addToggleGroupSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of TOGGLE_GROUP_VARIANTS) {
    for (const size of TOGGLE_GROUP_SIZES) {
      const comp = buildToggleGroupComponent(inputs, variant, size);
      page.appendChild(comp);
      components.push(comp);
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Toggle Group";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildToggleGroupComponent(
  inputs: ComponentsInputs,
  variant: ToggleGroupVariant,
  size: ToggleGroupSize,
): ComponentNode {
  const p = inputs.primitives;
  const dims = TOGGLE_GROUP_DIMS[size];

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}, Size=${size}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  // radix-nova ToggleGroup default `spacing` is 2 → 8px gap.
  comp.itemSpacing = 8;
  comp.cornerRadius = dims.radius;
  bindCornerRadii(comp, p.get(dims.radiusToken));
  comp.fills = [];
  comp.strokes = [];

  // Toggle items live in a slot so instances can add/remove/reorder them.
  const items: FrameNode[] = [];
  for (let i = 0; i < ITEMS.length; i++) {
    items.push(buildToggleGroupItem(inputs, ITEMS[i]!, variant, dims));
  }
  const slot = createConfiguredSlot(comp, "Items", items, {
    description: "Toggle items.",
    settings: { minChildren: 1 },
  });
  slot.layoutMode = "HORIZONTAL";
  slot.primaryAxisSizingMode = "AUTO";
  slot.counterAxisSizingMode = "AUTO";
  slot.primaryAxisAlignItems = "MIN";
  slot.counterAxisAlignItems = "CENTER";
  slot.itemSpacing = 8;
  slot.fills = [];
  slot.strokes = [];

  return comp;
}

function buildToggleGroupItem(
  inputs: ComponentsInputs,
  data: ItemData,
  variant: ToggleGroupVariant,
  dims: { size: number; radius: number; radiusToken: string; fontSize: number },
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const item = figma.createFrame();
  item.name = data.pressed ? "Item (on)" : "Item";
  item.layoutMode = "HORIZONTAL";
  item.primaryAxisSizingMode = "FIXED";
  item.counterAxisSizingMode = "FIXED";
  item.primaryAxisAlignItems = "CENTER";
  item.counterAxisAlignItems = "CENTER";
  item.resize(dims.size, dims.size);
  item.cornerRadius = dims.radius;
  bindCornerRadii(item, p.get(dims.radiusToken));
  item.strokes = [];

  if (data.pressed) {
    // radix-nova: `aria-pressed:bg-muted` / `data-[state=on]:bg-muted`.
    bindFill(item, t.get("muted"));
  } else if (variant === "outline") {
    // radix-nova outline: `border border-input bg-transparent`.
    bindFill(item, t.get("background"));
    bindStrokeColor(item, t.get("input"));
    item.strokeWeight = 1;
  } else {
    item.fills = [];
  }

  // Prefer an instance of the Design System icon set (bold / italic /
  // underline) so the glyphs are swappable and track the published set. The
  // instance inherits the set's theme-bound `foreground` paint. radix sizes
  // toggle-group icons at `size-4` (16).
  const icon = inputs.iconComponents
    ? instantiateIcon({
        icons: inputs.iconComponents,
        library: resolveIconLibrary(inputs.presetSummary),
        name: data.icon,
        size: 16,
      })
    : undefined;
  if (icon) {
    item.appendChild(icon);
    return item;
  }

  // Fallback: a text glyph (bold "B" / medium italic "I" / underlined "U")
  // when the icon set isn't available.
  const glyph = figma.createText();
  applyFont(glyph, "body", data.glyph === "I" ? "Medium" : "Bold");
  glyph.characters = data.glyph;
  glyph.fontSize = dims.fontSize;
  bindFontSize(glyph, p.get("font/size/sm"));
  // radix-nova items inherit `text-foreground` (no colour swap on press).
  bindFill(glyph, t.get("foreground"));
  if (data.glyph === "U") glyph.textDecoration = "UNDERLINE";
  item.appendChild(glyph);

  return item;
}
