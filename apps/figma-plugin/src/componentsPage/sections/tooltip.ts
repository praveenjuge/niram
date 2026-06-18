// Tooltip: small floating bubble with an arrow. Four placement sides, mirroring
// shadcn's Tooltip `side` prop (top / bottom / left / right).
//
// Mirrors shadcn's Tooltip (radix-ui primitive): `bg-foreground` rounded
// rectangle with `text-background` content and a small triangular arrow
// pointing toward the trigger. The arrow sits on the edge opposite the
// placement: a `top` tooltip points down, `bottom` points up, etc.

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

const ARROW_LONG = 10; // base length of the arrow triangle
const ARROW_SHORT = 5; // height of the arrow triangle

// shadcn Tooltip `side` prop. The arrow points back toward the trigger, so a
// `top`-placed tooltip (above the trigger) has its arrow on the bottom edge.
const TOOLTIP_SIDES = ["top", "bottom", "left", "right"] as const;
type TooltipSide = (typeof TOOLTIP_SIDES)[number];

// The chart tooltip (ChartTooltipContent) callouts. These are the
// ui.shadcn.com/charts tooltip examples — the value popovers a chart shows on
// hover — collapsed to the styles that read differently as a static component:
// a dot indicator, a line indicator, no indicator, a no-label layout, an icon
// indicator, and an "advanced" layout with a footer total. They live here
// (next to the Tooltip) rather than in the Chart block, since they're tooltip
// chrome, not chart shapes.
const CHART_TOOLTIPS = [
  "Default",
  "Line",
  "No Indicator",
  "No Label",
  "Icons",
  "Advanced",
] as const;
type ChartTooltipVariant = (typeof CHART_TOOLTIPS)[number];

export async function addTooltipSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  let count = 0;

  // 1) The radix Tooltip (four placement sides).
  const tooltips: ComponentNode[] = [];
  for (const side of TOOLTIP_SIDES) {
    const comp = buildTooltipComponent(inputs, side);
    page.appendChild(comp);
    tooltips.push(comp);
  }
  const tooltipSet = figma.combineAsVariants(tooltips, page);
  tooltipSet.name = "Tooltip";
  tooltipSet.layoutMode = "HORIZONTAL";
  tooltipSet.primaryAxisAlignItems = "MIN";
  tooltipSet.counterAxisAlignItems = "MIN";
  tooltipSet.itemSpacing = 24;
  styleComponentSet(tooltipSet);
  count += countDescendants(tooltipSet);

  // Expose the tooltip copy as an editable text property across the four sides.
  defineTextProperty(
    tooltipSet,
    "Text",
    "Add to library",
    collectByTypeAndName(tooltipSet, "TEXT", "Text"),
  );

  // 2) The chart tooltip callouts (ChartTooltipContent).
  const chartTooltips: ComponentNode[] = [];
  for (const variant of CHART_TOOLTIPS) {
    const comp = buildChartTooltipComponent(inputs, variant);
    page.appendChild(comp);
    chartTooltips.push(comp);
  }
  const chartTooltipSet = figma.combineAsVariants(chartTooltips, page);
  chartTooltipSet.name = "Chart Tooltip";
  chartTooltipSet.layoutMode = "HORIZONTAL";
  chartTooltipSet.layoutWrap = "WRAP";
  chartTooltipSet.counterAxisAlignItems = "MIN";
  chartTooltipSet.itemSpacing = 24;
  chartTooltipSet.counterAxisSpacing = 24;
  styleComponentSet(chartTooltipSet);
  count += countDescendants(chartTooltipSet);

  return count;
}

function buildTooltipComponent(
  inputs: ComponentsInputs,
  side: TooltipSide,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  // Use absolute positioning so the arrow can sit on the correct edge.
  const comp = figma.createComponent();
  comp.name = `Side=${side}`;
  comp.layoutMode = "NONE";
  comp.fills = [];
  comp.clipsContent = false;

  // Bubble — rounded rectangle with foreground fill and inner padding.
  const bubble = figma.createFrame();
  bubble.name = "Bubble";
  bubble.layoutMode = "HORIZONTAL";
  bubble.primaryAxisSizingMode = "AUTO";
  bubble.counterAxisSizingMode = "AUTO";
  bubble.primaryAxisAlignItems = "CENTER";
  bubble.counterAxisAlignItems = "CENTER";
  bubble.paddingLeft = 12;
  bubble.paddingRight = 12;
  bubble.paddingTop = 6;
  bubble.paddingBottom = 6;
  bubble.cornerRadius = 6;
  bindCornerRadii(bubble, p.get("radius/md"));
  bindFill(bubble, t.get("foreground"));
  bubble.strokes = [];

  const text = figma.createText();
  // shadcn TooltipContent uses `text-xs` with no explicit weight (Regular).
  applyFont(text, "body", "Regular");
  text.name = "Text";
  text.characters = "Add to library";
  text.fontSize = 12;
  bindFontSize(text, p.get("font/size/xs"));
  bindFill(text, t.get("background"));
  bubble.appendChild(text);

  comp.appendChild(bubble);

  // The arrow points back toward the trigger, so it sits on the edge opposite
  // the placement. Lay the bubble + arrow out and size the component to fit.
  const horizontalArrow = side === "left" || side === "right";
  // The bubble has hugged its content by now, so width/height are known.
  const bw = bubble.width;
  const bh = bubble.height;

  if (horizontalArrow) {
    comp.resize(bw + ARROW_SHORT, bh);
  } else {
    comp.resize(bw, bh + ARROW_SHORT);
  }

  // Position the bubble within the component, leaving room for the arrow.
  switch (side) {
    case "top": // tooltip above trigger → arrow on bottom edge
      bubble.x = 0;
      bubble.y = 0;
      break;
    case "bottom": // tooltip below trigger → arrow on top edge
      bubble.x = 0;
      bubble.y = ARROW_SHORT;
      break;
    case "left": // tooltip left of trigger → arrow on right edge
      bubble.x = 0;
      bubble.y = 0;
      break;
    case "right": // tooltip right of trigger → arrow on left edge
      bubble.x = ARROW_SHORT;
      bubble.y = 0;
      break;
  }

  comp.appendChild(buildArrow(inputs, side, bw, bh));

  return comp;
}

// A small triangle pointing away from the bubble toward the trigger.
function buildArrow(
  inputs: ComponentsInputs,
  side: TooltipSide,
  bubbleW: number,
  bubbleH: number,
): VectorNode {
  const t = inputs.theme.light;
  const arrow = figma.createVector();
  arrow.name = "Arrow";

  let data: string;
  switch (side) {
    case "top": {
      // Down-pointing triangle centred on the bubble's bottom edge.
      const x0 = bubbleW / 2 - ARROW_LONG / 2;
      const y0 = bubbleH;
      data = `M ${x0} ${y0} L ${x0 + ARROW_LONG} ${y0} L ${x0 + ARROW_LONG / 2} ${y0 + ARROW_SHORT} Z`;
      break;
    }
    case "bottom": {
      // Up-pointing triangle centred on the bubble's top edge.
      const x0 = bubbleW / 2 - ARROW_LONG / 2;
      const y0 = ARROW_SHORT;
      data = `M ${x0} ${y0} L ${x0 + ARROW_LONG} ${y0} L ${x0 + ARROW_LONG / 2} 0 Z`;
      break;
    }
    case "left": {
      // Right-pointing triangle centred on the bubble's right edge.
      const x0 = bubbleW;
      const y0 = bubbleH / 2 - ARROW_LONG / 2;
      data = `M ${x0} ${y0} L ${x0} ${y0 + ARROW_LONG} L ${x0 + ARROW_SHORT} ${y0 + ARROW_LONG / 2} Z`;
      break;
    }
    case "right": {
      // Left-pointing triangle centred on the bubble's left edge.
      const x0 = ARROW_SHORT;
      const y0 = bubbleH / 2 - ARROW_LONG / 2;
      data = `M ${x0} ${y0} L ${x0} ${y0 + ARROW_LONG} L 0 ${y0 + ARROW_LONG / 2} Z`;
      break;
    }
  }

  arrow.vectorPaths = [{ windingRule: "NONZERO", data }];
  arrow.strokes = [];
  bindFill(arrow, t.get("foreground"));
  return arrow;
}

// --- Chart tooltip (ChartTooltipContent) -----------------------------------

type TooltipRow = { label: string; value: string; key: string };

const CHART_TOOLTIP_ROWS: TooltipRow[] = [
  { label: "Desktop", value: "186", key: "chart-1" },
  { label: "Mobile", value: "80", key: "chart-2" },
];

// One chart tooltip callout: a popover card with an optional label line and a
// row per series (indicator + name + value). Each series indicator binds to a
// `chart-*` theme variable so it recolours with the preset.
function buildChartTooltipComponent(
  inputs: ComponentsInputs,
  variant: ChartTooltipVariant,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}`;
  comp.layoutMode = "VERTICAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  comp.itemSpacing = 6;
  comp.paddingTop = 8;
  comp.paddingBottom = 8;
  comp.paddingLeft = 10;
  comp.paddingRight = 10;
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("popover") ?? t.get("card"));
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  // Label line (the hovered category) — omitted by the "No Label" variant.
  if (variant !== "No Label") {
    const label = tooltipText(
      inputs,
      "January",
      "popover-foreground",
      "Medium",
    );
    comp.appendChild(label);
  }

  for (const row of CHART_TOOLTIP_ROWS) {
    comp.appendChild(buildChartTooltipRow(inputs, variant, row));
  }

  // Advanced layout adds a separator + a bold total footer.
  if (variant === "Advanced") {
    const rule = figma.createRectangle();
    rule.name = "Separator";
    rule.resize(160, 1);
    bindFill(rule, t.get("border"));
    comp.appendChild(rule);
    (
      rule as unknown as { layoutSizingHorizontal: string }
    ).layoutSizingHorizontal = "FILL";

    const total = buildTooltipValueRow(
      inputs,
      "Total",
      "266",
      "popover-foreground",
      "Bold",
    );
    comp.appendChild(total);
    (
      total as unknown as { layoutSizingHorizontal: string }
    ).layoutSizingHorizontal = "FILL";
  }

  return comp;
}

function buildChartTooltipRow(
  inputs: ComponentsInputs,
  variant: ChartTooltipVariant,
  row: TooltipRow,
): FrameNode {
  const t = inputs.theme.light;

  const frame = figma.createFrame();
  frame.name = "Series";
  frame.layoutMode = "HORIZONTAL";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "AUTO";
  frame.counterAxisAlignItems = "CENTER";
  frame.primaryAxisAlignItems = "SPACE_BETWEEN";
  frame.itemSpacing = 12;
  frame.resize(160, 16);
  frame.fills = [];
  frame.strokes = [];

  // Left group: indicator (per variant) + series name.
  const left = figma.createFrame();
  left.name = "Label";
  left.layoutMode = "HORIZONTAL";
  left.primaryAxisSizingMode = "AUTO";
  left.counterAxisSizingMode = "AUTO";
  left.counterAxisAlignItems = "CENTER";
  left.itemSpacing = 6;
  left.fills = [];
  left.strokes = [];

  const indicator = buildIndicator(inputs, variant, row.key);
  if (indicator) left.appendChild(indicator);
  left.appendChild(
    tooltipText(inputs, row.label, "muted-foreground", "Regular"),
  );
  frame.appendChild(left);

  frame.appendChild(
    tooltipText(inputs, row.value, "popover-foreground", "Medium"),
  );
  return frame;
}

// A standalone label/value row (used for the Advanced total footer).
function buildTooltipValueRow(
  inputs: ComponentsInputs,
  label: string,
  value: string,
  valueColor: string,
  valueWeight: "Regular" | "Medium" | "Bold",
): FrameNode {
  const frame = figma.createFrame();
  frame.name = "Total";
  frame.layoutMode = "HORIZONTAL";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "AUTO";
  frame.counterAxisAlignItems = "CENTER";
  frame.primaryAxisAlignItems = "SPACE_BETWEEN";
  frame.itemSpacing = 12;
  frame.resize(160, 16);
  frame.fills = [];
  frame.strokes = [];
  frame.appendChild(tooltipText(inputs, label, "muted-foreground", "Regular"));
  frame.appendChild(tooltipText(inputs, value, valueColor, valueWeight));
  return frame;
}

// The per-series indicator: a dot, a line, an icon, or nothing, per variant.
function buildIndicator(
  inputs: ComponentsInputs,
  variant: ChartTooltipVariant,
  colorKey: string,
): SceneNode | undefined {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  if (variant === "No Indicator") return undefined;

  if (variant === "Icons") {
    const icon = createIcon({
      library: resolveIconLibrary(inputs.presetSummary),
      name: "arrow-right",
      size: 12,
      color: t.get(colorKey),
    });
    if (icon) {
      icon.name = "Indicator";
      return icon;
    }
    // Fall through to a dot when the library lacks the glyph.
  }

  const shape = figma.createRectangle();
  shape.name = "Indicator";
  if (variant === "Line") {
    shape.resize(12, 3);
    shape.cornerRadius = 1;
  } else {
    shape.resize(10, 10);
    shape.cornerRadius = 2;
    bindCornerRadii(shape as unknown as FrameNode, p.get("radius/xs"));
  }
  bindFill(shape, t.get(colorKey));
  return shape;
}

function tooltipText(
  inputs: ComponentsInputs,
  chars: string,
  colorKey: string,
  weight: "Regular" | "Medium" | "Bold",
): TextNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const node = figma.createText();
  applyFont(node, "body", weight);
  node.characters = chars;
  node.fontSize = 12;
  bindFontSize(node, p.get("font/size/xs"));
  bindFill(node, t.get(colorKey));
  return node;
}
