// Spinner: a loading indicator. Mirrors radix-nova's Spinner, which renders
// lucide's `Loader2Icon` at `size-4` with `animate-spin`.
//
// Figma can't animate, so we draw the loader as a near-full circular arc with
// a rounded cap — the same silhouette as Loader2 frozen mid-spin — bound to
// `text-current` (foreground). Two sizes mirror the common `size-4` default
// and a larger `size-6` usage.

import { bindStrokeColor } from "../bindings";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const SPINNER_SIZES = ["sm", "default"] as const;
type SpinnerSize = (typeof SPINNER_SIZES)[number];

// size-4 (16) default, size-6 (24) larger. Stroke ~2px like lucide's default.
const SPINNER_DIMS: Record<SpinnerSize, { size: number; stroke: number }> = {
  sm: { size: 16, stroke: 2 },
  default: { size: 24, stroke: 2.5 },
};

export async function addSpinnerSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const size of SPINNER_SIZES) {
    const comp = buildSpinnerComponent(inputs, size);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Spinner";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.primaryAxisAlignItems = "MIN";
  componentSet.counterAxisAlignItems = "CENTER";
  componentSet.itemSpacing = 24;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildSpinnerComponent(
  inputs: ComponentsInputs,
  size: SpinnerSize,
): ComponentNode {
  const t = inputs.theme.light;
  const dims = SPINNER_DIMS[size];

  const comp = figma.createComponent();
  comp.name = `Size=${size}`;
  comp.layoutMode = "NONE";
  comp.resize(dims.size, dims.size);
  comp.fills = [];
  comp.strokes = [];
  comp.clipsContent = false;

  // A ~270° arc approximating Loader2's broken ring. Drawn as an open vector
  // path inside the square; the rounded cap mirrors lucide's `stroke-linecap`.
  const r = dims.size / 2 - dims.stroke / 2;
  const cx = dims.size / 2;
  const cy = dims.size / 2;

  const arc = figma.createVector();
  arc.name = "Arc";
  arc.resize(dims.size, dims.size);
  arc.x = 0;
  arc.y = 0;
  arc.vectorPaths = [
    {
      windingRule: "NONZERO",
      // Figma's vector parser only supports M/L/C/Q/Z (no SVG `A` arc), so the
      // ~270° ring is drawn as three cubic-bezier quarter circles using the
      // kappa approximation. Sweeps clockwise from 12 o'clock → 3 → 6 → 9.
      data: threeQuarterArcPath(cx, cy, r),
    },
  ];
  arc.fills = [];
  arc.strokeWeight = dims.stroke;
  arc.strokeCap = "ROUND";
  arc.strokeJoin = "ROUND";
  bindStrokeColor(arc, t.get("foreground"));

  comp.appendChild(arc);
  return comp;
}

// A 270° open arc centred at (cx, cy), drawn clockwise from the top (12
// o'clock) through 3 and 6 to 9 o'clock, as three cubic-bezier quarter
// circles. Kappa is the standard circular-bezier control-handle ratio.
function threeQuarterArcPath(cx: number, cy: number, r: number): string {
  const k = r * 0.5522847498307936;
  // Quarter 1: top → right.
  const q1 = `C ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy}`;
  // Quarter 2: right → bottom.
  const q2 = `C ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r}`;
  // Quarter 3: bottom → left.
  const q3 = `C ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy}`;
  return `M ${cx} ${cy - r} ${q1} ${q2} ${q3}`;
}
