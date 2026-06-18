// Toggle: pressable square / pill that holds an "on" or "off" state.
// Two variants × three sizes × two states for a quick component-set picker.
//
// Mirrors radix-nova's Toggle (radix-ui primitive): `bg-transparent` by
// default, `aria-pressed:bg-muted` (or `data-[state=on]:bg-muted`) when on;
// outline variant adds an `input` border. The `size` axis mirrors the source
// CVA: default `h-8 min-w-8 rounded-lg`, sm `h-7 min-w-7 rounded-[min(
// --radius-md,12px)]`, lg `h-9 min-w-9 rounded-lg`.
//
// The glyph is an instance of the Design System icon set's `bold` icon (radix
// renders an svg inside the toggle), so designers can swap it from Figma's
// instance menu and it stays in sync with the published icon set. When the icon
// set isn't available (older callers/tests) it falls back to a bold "B" glyph.

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
  resolveIconName,
} from "../../icons";
import { styleComponentSet } from "../layout";
import { type ComponentsInputs } from "../types";
import { countDescendants } from "../utils";
import { collectByTypeAndName, defineIconSwapProperty } from "../properties";

const TOGGLE_VARIANTS = ["default", "outline"] as const;
type ToggleVariant = (typeof TOGGLE_VARIANTS)[number];

// Mirrors radix-nova's toggleVariants `size` axis.
const TOGGLE_SIZES = ["sm", "default", "lg"] as const;
type ToggleSize = (typeof TOGGLE_SIZES)[number];

// Boolean variant: shadcn / Radix Toggle exposes a `pressed` prop, so we
// expose `Pressed=True/False`. Figma promotes a property to a boolean toggle
// in the inspector when its values are exactly `True`/`False`.
const TOGGLE_STATES = ["False", "True"] as const;
type ToggleState = (typeof TOGGLE_STATES)[number];

// radix-nova sizes: sm `h-7` (28), default `h-8` (32), lg `h-9` (36). The
// caps are square (min-w matches the height for a single glyph). The sm size
// rounds with `radius-md` (6); default/lg use `radius-lg` (8).
const TOGGLE_DIMS: Record<
  ToggleSize,
  { size: number; radius: number; radiusToken: string }
> = {
  sm: { size: 28, radius: 6, radiusToken: "radius/md" },
  default: { size: 32, radius: 8, radiusToken: "radius/lg" },
  lg: { size: 36, radius: 8, radiusToken: "radius/lg" },
};

export async function addToggleSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of TOGGLE_VARIANTS) {
    for (const size of TOGGLE_SIZES) {
      for (const state of TOGGLE_STATES) {
        const comp = buildToggleComponent(inputs, variant, size, state);
        page.appendChild(comp);
        components.push(comp);
      }
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Toggle";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  // When the published icon set is available, the glyph is a real instance of
  // it — expose an "Icon" instance-swap property so designers can swap it,
  // with the icon set offered as the preferred choice.
  if (inputs.iconComponents) {
    const iconName = resolveIconName(
      resolveIconLibrary(inputs.presetSummary),
      "bold",
    );
    const source = iconName ? inputs.iconComponents.get(iconName) : undefined;
    defineIconSwapProperty(
      componentSet,
      "Icon",
      source as unknown as { key?: string; parent?: { type: string } },
      collectByTypeAndName(componentSet, "INSTANCE", "Icon"),
    );
  }

  return countDescendants(componentSet);
}

function buildToggleComponent(
  inputs: ComponentsInputs,
  variant: ToggleVariant,
  size: ToggleSize,
  state: ToggleState,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const dims = TOGGLE_DIMS[size];

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}, Size=${size}, Pressed=${state}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "CENTER";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(dims.size, dims.size);
  comp.cornerRadius = dims.radius;
  bindCornerRadii(comp, p.get(dims.radiusToken));
  comp.strokes = [];

  if (state === "True") {
    // radix-nova: `aria-pressed:bg-muted` / `data-[state=on]:bg-muted`.
    bindFill(comp, t.get("muted"));
  } else if (variant === "outline") {
    // radix-nova outline: `border border-input bg-transparent`.
    bindFill(comp, t.get("background"));
    bindStrokeColor(comp, t.get("input"));
    comp.strokeWeight = 1;
  } else {
    comp.fills = [];
  }

  // radix renders an svg inside the toggle. Prefer an instance of the Design
  // System icon set's `bold` icon so designers can swap it from the instance
  // menu and it tracks the published set; the instance inherits the set's
  // theme-bound `foreground` paint. radix-nova sizes the icon at `size-4` (16).
  const icon = inputs.iconComponents
    ? instantiateIcon({
        icons: inputs.iconComponents,
        library: resolveIconLibrary(inputs.presetSummary),
        name: "bold",
        size: 16,
      })
    : undefined;
  if (icon) {
    comp.appendChild(icon);
    return comp;
  }

  // Fallback: a bold "B" glyph (text-formatting is the canonical toggle use
  // case) when the icon set isn't available.
  const glyph = figma.createText();
  applyFont(glyph, "body", "Bold");
  glyph.characters = "B";
  // radix-nova: sm uses `text-[0.8rem]` (~13), default/lg use `text-sm` (14).
  glyph.fontSize = size === "sm" ? 13 : 14;
  bindFontSize(glyph, p.get("font/size/sm"));

  // radix-nova doesn't change the text colour on press — both states use the
  // hover colour `text-foreground` (default state has no explicit colour, so
  // it inherits the surrounding `foreground`).
  bindFill(glyph, t.get("foreground"));
  comp.appendChild(glyph);

  return comp;
}
