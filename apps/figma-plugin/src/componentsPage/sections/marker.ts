// Marker: inline conversation markers (shadcn's Marker / MarkerIcon /
// MarkerContent, new in the June 2026 chat components). Composed with Message
// in a thread to show status updates, system notes, and labelled separators.
//
// Mirrors shadcn's `markerVariants`
// (apps/v4/registry/new-york-v4/ui/marker.tsx): a muted, text-sm row with a
// size-4 icon slot. Three variants — `default` (a plain note row), `separator`
// (centred copy flanked by rules), and `border` (a row with a bottom border).

import { bindFill, bindFontSize, bindStrokeColor } from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary, type SemanticIconName } from "../../icons";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";
import { collectByTypeAndName, defineTextProperty } from "../properties";

const MARKER_WIDTH = 360;

const MARKER_VARIANTS = ["default", "separator", "border"] as const;
type MarkerVariant = (typeof MARKER_VARIANTS)[number];

// Per-variant sample copy + leading icon. The separator centres its label and
// drops the icon (the rules carry the structure).
const MARKER_COPY: Record<
  MarkerVariant,
  { label: string; icon?: SemanticIconName }
> = {
  default: { label: "Conversation started", icon: "info" },
  separator: { label: "December 30, 2025" },
  border: { label: "Yesterday", icon: "bell" },
};

export async function addMarkerSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of MARKER_VARIANTS) {
    const comp = buildMarkerComponent(inputs, variant);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Marker";
  componentSet.layoutMode = "VERTICAL";
  componentSet.itemSpacing = 24;
  styleComponentSet(componentSet);

  defineTextProperty(
    componentSet,
    "Label",
    MARKER_COPY.default.label,
    collectByTypeAndName(componentSet, "TEXT", "Label"),
  );

  return countDescendants(componentSet);
}

function buildMarkerComponent(
  inputs: ComponentsInputs,
  variant: MarkerVariant,
): ComponentNode {
  const t = inputs.theme.light;
  const copy = MARKER_COPY[variant];

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}`;
  comp.layoutMode = "HORIZONTAL";
  comp.counterAxisSizingMode = "AUTO";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(MARKER_WIDTH, 1);
  // resize() pins both axes FIXED; keep the width fixed and hug the height.
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "AUTO";
  // `gap-2`.
  comp.itemSpacing = 8;
  comp.fills = [];
  comp.strokes = [];

  if (variant === "separator") {
    comp.primaryAxisAlignItems = "CENTER";
    comp.appendChild(buildRule(inputs));
    comp.appendChild(buildLabel(inputs, copy.label));
    comp.appendChild(buildRule(inputs));
    return comp;
  }

  // `border`: a bottom border + `pb-2`.
  if (variant === "border") {
    comp.paddingBottom = 8;
    bindStrokeColor(comp, t.get("border"));
    comp.strokeWeight = 1;
    comp.strokeAlign = "INSIDE";
    comp.strokeBottomWeight = 1;
    comp.strokeTopWeight = 0;
    comp.strokeLeftWeight = 0;
    comp.strokeRightWeight = 0;
  }

  // `default` + `border`: optional leading icon then the label.
  if (copy.icon) {
    const icon = createIcon({
      library: resolveIconLibrary(inputs.presetSummary),
      name: copy.icon,
      size: 16,
      color: t.get("muted-foreground"),
    });
    if (icon) {
      icon.name = "Icon";
      comp.appendChild(icon);
    }
  }
  comp.appendChild(buildLabel(inputs, copy.label));

  return comp;
}

// A thin, theme-bound rule that grows to fill the space beside a separator
// label (`h-px flex-1 bg-border`).
function buildRule(inputs: ComponentsInputs): RectangleNode {
  const t = inputs.theme.light;
  const rule = figma.createRectangle();
  rule.name = "Rule";
  rule.resize(10, 1);
  bindFill(rule, t.get("border"));
  rule.strokes = [];
  try {
    (rule as unknown as { layoutGrow: number }).layoutGrow = 1;
  } catch {
    // Keep intrinsic width when the host rejects grow.
  }
  return rule;
}

function buildLabel(inputs: ComponentsInputs, text: string): TextNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const node = figma.createText();
  applyFont(node, "body", "Regular");
  node.name = "Label";
  node.characters = text;
  node.fontSize = 14;
  bindFontSize(node, p.get("font/size/sm"));
  bindFill(node, t.get("muted-foreground"));
  return node;
}
