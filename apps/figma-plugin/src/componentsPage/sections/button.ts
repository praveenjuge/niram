// Button: 6 variants × 5 sizes, grouped into a Figma component set.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import { type ComponentsInputs } from "../types";
import { countDescendants } from "../utils";
import { collectByTypeAndName, defineTextProperty } from "../properties";

const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "ghost",
  "link",
] as const;
type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

const BUTTON_SIZES = [
  "xs",
  "sm",
  "default",
  "lg",
  "icon-xs",
  "icon-sm",
  "icon",
  "icon-lg",
] as const;
type ButtonSize = (typeof BUTTON_SIZES)[number];

// Interaction-state axis. shadcn encodes these in `hover:`, `focus-visible:`,
// and `disabled:` utilities that never survive into Figma, so we surface them
// as a pickable `State` property. They are visual deltas only (opacity, an
// accent background, or the focus ring) so the per-variant node count is
// unchanged across states.
const BUTTON_STATES = ["default", "hover", "focus", "disabled"] as const;
type ButtonState = (typeof BUTTON_STATES)[number];

function isIconSize(size: ButtonSize): boolean {
  return (
    size === "icon" ||
    size === "icon-xs" ||
    size === "icon-sm" ||
    size === "icon-lg"
  );
}

export async function addButtonSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  // Build one ComponentNode per (variant, size, state) combination, then group
  // them into a ComponentSet so Figma shows a variant picker.
  const components: ComponentNode[] = [];

  for (const variant of BUTTON_VARIANTS) {
    for (const size of BUTTON_SIZES) {
      for (const state of BUTTON_STATES) {
        const comp = buildButtonComponent(inputs, variant, size, state);
        page.appendChild(comp);
        components.push(comp);
      }
    }
  }

  // Create the component set from all variants. styleComponentSet pins the
  // set to the shared SECTION_WIDTH and wraps the variants onto new rows.
  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Button";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  // Expose the button label as an editable text property, fanned across every
  // text-bearing (non-icon) variant's "Label" node.
  defineTextProperty(
    componentSet,
    "Label",
    "Button",
    collectByTypeAndName(componentSet, "TEXT", "Label"),
  );

  return countDescendants(componentSet);
}

function buildButtonComponent(
  inputs: ComponentsInputs,
  variant: ButtonVariant,
  size: ButtonSize,
  state: ButtonState,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const dims = buttonDimensions(size);

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}, Size=${size}, State=${state}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisAlignItems = "CENTER";
  comp.counterAxisAlignItems = "CENTER";
  comp.fills = [];
  comp.strokes = [];
  // Mirrors radix-nova's per-size gap:
  //   xs/sm: gap-1 (4), default/lg: gap-1.5 (6)
  comp.itemSpacing = size === "xs" || size === "sm" ? 4 : 6;

  if (isIconSize(size)) {
    comp.primaryAxisSizingMode = "FIXED";
    comp.counterAxisSizingMode = "FIXED";
    comp.resize(dims.height, dims.height);
  } else {
    comp.primaryAxisSizingMode = "AUTO";
    comp.counterAxisSizingMode = "AUTO";
    comp.paddingLeft = dims.paddingX;
    comp.paddingRight = dims.paddingX;
    comp.paddingTop = dims.paddingY;
    comp.paddingBottom = dims.paddingY;
  }

  // radix-nova's button uses `rounded-lg` by default (8px at the default
  // 10px radius), and `rounded-[min(var(--radius-md),10/12px)]` for the
  // xs/sm and icon-xs/icon-sm sizes. Mapping:
  //   xs / icon-xs / sm / icon-sm → radius/md (6px)
  //   default / lg / icon / icon-lg → radius/lg (8px)
  const useMdRadius =
    size === "xs" || size === "sm" || size === "icon-xs" || size === "icon-sm";
  comp.cornerRadius = useMdRadius ? 6 : 8;
  bindCornerRadii(comp, p.get(useMdRadius ? "radius/md" : "radius/lg"));

  // Apply variant fill/stroke.
  applyButtonVariant(comp, variant, t);
  // Layer the interaction-state delta on top (hover accent / focus ring /
  // disabled opacity). Returns the label colour override for hover on the
  // ghost + outline variants, which shift to accent-foreground.
  const stateLabelOverride = applyButtonState(comp, variant, state, t);

  const labelColor =
    stateLabelOverride ??
    buttonLabelColorVar(variant, t, inputs.tailwindColors);

  if (isIconSize(size)) {
    // Icon-only button: render a real icon from the preset's icon library,
    // tinted to match the variant's label colour. Falls back to a `★` glyph
    // when the active library has no candidate for the semantic icon.
    const icon = createIcon({
      library: resolveIconLibrary(inputs.presetSummary),
      name: "plus",
      size: size === "icon-xs" ? 14 : 16,
      color: labelColor,
    });
    if (icon) {
      icon.name = "Icon";
      comp.appendChild(icon);
      return comp;
    }
  }

  // Label text (also the fallback glyph for icon sizes without a match — use
  // a plain "+" rather than a symbol glyph so it stays within the preset font
  // and never triggers an unloaded symbol-font substitution).
  const label = figma.createText();
  applyFont(label, "body", "Medium");
  label.characters = isIconSize(size) ? "+" : "Button";
  // Name the real text label so the section can wire a "Label" text property.
  // Icon-size fallbacks ("+") stay unnamed and out of the property.
  if (!isIconSize(size)) label.name = "Label";
  label.fontSize = size === "xs" || size === "icon-xs" ? 12 : 14;
  bindFontSize(
    label,
    size === "xs" || size === "icon-xs"
      ? p.get("font/size/xs")
      : p.get("font/size/sm"),
  );
  bindFill(label, labelColor);
  if (variant === "link") {
    label.textDecoration = "UNDERLINE";
  }
  comp.appendChild(label);

  return comp;
}

type ButtonDims = { height: number; paddingX: number; paddingY: number };

function buttonDimensions(size: ButtonSize): ButtonDims {
  // Mirrors radix-nova's button size CVA:
  //   default: h-8 px-2.5 py-2 (32 / 10 / 8)
  //   xs:      h-6 px-2 (24 / 8 / 4)
  //   sm:      h-7 px-2.5 (28 / 10 / 6)
  //   lg:      h-9 px-2.5 py-2 (36 / 10 / 8)
  // Icon sizes are square (size-N).
  switch (size) {
    case "xs":
      return { height: 24, paddingX: 8, paddingY: 4 };
    case "sm":
      return { height: 28, paddingX: 10, paddingY: 6 };
    case "default":
      return { height: 32, paddingX: 10, paddingY: 8 };
    case "lg":
      return { height: 36, paddingX: 10, paddingY: 8 };
    case "icon-xs":
      return { height: 24, paddingX: 0, paddingY: 0 };
    case "icon-sm":
      return { height: 28, paddingX: 0, paddingY: 0 };
    case "icon":
      return { height: 32, paddingX: 0, paddingY: 0 };
    case "icon-lg":
      return { height: 36, paddingX: 0, paddingY: 0 };
  }
}

function applyButtonVariant(
  node: FrameNode | ComponentNode,
  variant: ButtonVariant,
  t: Map<string, Variable>,
) {
  switch (variant) {
    case "default":
      bindFill(node, t.get("primary"));
      break;
    case "secondary":
      bindFill(node, t.get("secondary"));
      break;
    case "destructive":
      // Solid destructive fill so the Tailwind white label reads against it.
      // (radix-nova's source uses `bg-destructive/10 text-destructive`, but
      // we deliberately keep the readable solid + white pairing here.)
      bindFill(node, t.get("destructive"));
      break;
    case "outline":
      bindFill(node, t.get("background"));
      bindStrokeColor(node, t.get("border"));
      node.strokeWeight = 1;
      break;
    case "ghost":
      node.fills = [];
      break;
    case "link":
      node.fills = [];
      break;
  }
}

function buttonLabelColorVar(
  variant: ButtonVariant,
  t: Map<string, Variable>,
  tw: Map<string, Variable>,
): Variable | undefined {
  switch (variant) {
    case "default":
      return t.get("primary-foreground");
    case "secondary":
      return t.get("secondary-foreground");
    case "destructive":
      // Tailwind `white` so the label stays legible on the solid destructive
      // surface regardless of the active preset.
      return tw.get("white");
    case "outline":
    case "ghost":
      return t.get("foreground");
    case "link":
      return t.get("primary");
  }
}

// Layer an interaction-state delta on top of the resting variant styling.
// shadcn expresses these via `hover:`, `focus-visible:`, and `disabled:`
// utilities; in Figma we bake one frame per state so designers can preview
// them. Returns an optional label-colour override (hover flips ghost/outline
// labels to accent-foreground); otherwise the caller keeps the variant colour.
function applyButtonState(
  node: ComponentNode,
  variant: ButtonVariant,
  state: ButtonState,
  t: Map<string, Variable>,
): Variable | undefined {
  if (state === "disabled") {
    // shadcn: `disabled:opacity-50 disabled:pointer-events-none`.
    node.opacity = 0.5;
    return undefined;
  }

  if (state === "focus") {
    // `focus-visible:ring-[3px] focus-visible:ring-ring/50` — a 3px spread
    // ring drawn as a zero-radius drop shadow, matching the Input focus look.
    node.effects = [
      {
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.08 },
        offset: { x: 0, y: 0 },
        radius: 0,
        spread: 3,
        visible: true,
        blendMode: "NORMAL",
        showShadowBehindNode: true,
      },
    ];
    return undefined;
  }

  if (state === "hover") {
    switch (variant) {
      case "default":
        // `hover:bg-primary/90` — approximate the alpha dip with opacity.
        node.opacity = 0.9;
        return undefined;
      case "secondary":
        node.opacity = 0.8;
        return undefined;
      case "destructive":
        node.opacity = 0.9;
        return undefined;
      case "outline":
      case "ghost":
        // `hover:bg-accent hover:text-accent-foreground`.
        bindFill(node, t.get("accent"));
        return t.get("accent-foreground");
      case "link":
        // Link only gains an underline on hover, handled by the resting
        // underline already applied; nothing else changes.
        return undefined;
    }
  }

  return undefined;
}
