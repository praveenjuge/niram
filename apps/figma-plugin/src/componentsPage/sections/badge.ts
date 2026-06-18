// Badge: pill-shaped labels for status, counts, and tags. Six color variants
// crossed with a small set of content styles (plain, leading status dot,
// leading icon, closable, and a compact count pill).

import {
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
import { collectByTypeAndName, defineTextProperty } from "../properties";

const BADGE_VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "ghost",
  "link",
] as const;
type BadgeVariant = (typeof BADGE_VARIANTS)[number];

// Content styles a badge can take. These are the shapes designers reach for
// most: a plain label, a status dot, a leading icon, a dismissible pill, and a
// compact numeric count.
const BADGE_STYLES = ["plain", "dot", "icon", "closable", "count"] as const;
type BadgeStyle = (typeof BADGE_STYLES)[number];

export async function addBadgeSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of BADGE_VARIANTS) {
    for (const style of BADGE_STYLES) {
      const comp = buildBadgeComponent(inputs, variant, style);
      page.appendChild(comp);
      components.push(comp);
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Badge";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  // Expose the badge label copy as an editable text property across variants.
  defineTextProperty(
    componentSet,
    "Label",
    "Badge",
    collectByTypeAndName(componentSet, "TEXT", "Label"),
  );

  return countDescendants(componentSet);
}

function buildBadgeComponent(
  inputs: ComponentsInputs,
  variant: BadgeVariant,
  style: BadgeStyle,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}, Style=${style}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "AUTO";
  // radix-nova badge has `h-5` (20px) — fix the height and let auto-layout
  // hug the width.
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "CENTER";
  comp.counterAxisAlignItems = "CENTER";
  // Mirrors radix-nova's Badge: `h-5 gap-1 px-2 py-0.5 text-xs font-medium
  // rounded-4xl`. We use 32px ≈ rounded-4xl for the corner radius.
  comp.itemSpacing = 4;
  comp.paddingLeft = 8;
  comp.paddingRight = 8;
  comp.paddingTop = 2;
  comp.paddingBottom = 2;
  comp.resize(comp.width, 20);
  comp.cornerRadius = 32;
  bindCornerRadii(comp, p.get("radius/4xl"));
  comp.fills = [];
  comp.strokes = [];

  // The count style is a compact square-ish pill; tighten its horizontal
  // padding so single digits read as a balanced circle/pill.
  if (style === "count") {
    comp.paddingLeft = 6;
    comp.paddingRight = 6;
  }

  switch (variant) {
    case "default":
      bindFill(comp, t.get("primary"));
      break;
    case "secondary":
      bindFill(comp, t.get("secondary"));
      break;
    case "destructive":
      // Solid destructive fill so the Tailwind white label reads against it.
      bindFill(comp, t.get("destructive"));
      break;
    case "outline":
      bindStrokeColor(comp, t.get("border"));
      comp.strokeWeight = 1;
      break;
    case "ghost":
    case "link":
      // `ghost` and `link` have no resting background; they only differ in
      // hover/underline behaviour, which doesn't translate to Figma.
      break;
  }

  const fg = badgeForegroundVar(variant, t, inputs.tailwindColors);

  // Leading status dot.
  if (style === "dot") {
    const dot = figma.createEllipse();
    dot.name = "Dot";
    dot.resize(6, 6);
    bindFill(dot, fg);
    comp.appendChild(dot);
  }

  // Leading icon from the active preset library (check glyph as a generic
  // status marker). Falls back silently to no icon when unavailable.
  if (style === "icon") {
    const icon = createIcon({
      library: resolveIconLibrary(inputs.presetSummary),
      name: "check",
      size: 12,
      color: fg,
    });
    if (icon) {
      icon.name = "Icon";
      comp.appendChild(icon);
    }
  }

  const label = figma.createText();
  applyFont(label, "body", "Medium");
  label.characters = style === "count" ? "8" : "Badge";
  // Name the text label so the section can wire a "Label" text property. The
  // count style keeps its own numeric content, so it stays out of the property.
  if (style !== "count") label.name = "Label";
  label.fontSize = 12;
  bindFontSize(label, p.get("font/size/xs"));
  bindFill(label, fg);
  if (variant === "link") {
    label.textDecoration = "UNDERLINE";
  }
  comp.appendChild(label);

  // Trailing dismiss glyph for the closable style.
  if (style === "closable") {
    const close = createIcon({
      library: resolveIconLibrary(inputs.presetSummary),
      name: "close",
      size: 12,
      color: fg,
    });
    if (close) {
      close.name = "Close";
      comp.appendChild(close);
    } else {
      // Fallback "×" glyph keeps the affordance visible without a library.
      const x = figma.createText();
      applyFont(x, "body", "Medium");
      x.characters = "×";
      x.fontSize = 12;
      bindFontSize(x, p.get("font/size/xs"));
      bindFill(x, fg);
      x.name = "Close";
      comp.appendChild(x);
    }
  }

  return comp;
}

// Foreground (label/icon) colour for each badge variant.
function badgeForegroundVar(
  variant: BadgeVariant,
  t: Map<string, Variable>,
  tw: Map<string, Variable>,
): Variable | undefined {
  switch (variant) {
    case "default":
      return t.get("primary-foreground");
    case "secondary":
      return t.get("secondary-foreground");
    case "destructive":
      // Tailwind `white` for legibility on the solid destructive surface.
      return tw.get("white");
    case "outline":
    case "ghost":
      return t.get("foreground");
    case "link":
      return t.get("primary");
  }
}
