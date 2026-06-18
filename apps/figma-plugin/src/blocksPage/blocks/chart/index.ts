// Chart block: a single Figma component set named "Chart" holding a curated
// subset of the shadcn/ui chart catalogue (ui.shadcn.com/charts) as variants.
// Two variant properties drive the switcher:
//   Family  = Area | Bar | Line | Pie | Radar | Radial
//   Variant = the per-family pattern (Default, Stacked, Donut, …)
//
// We keep ~4 visually-distinct patterns per family rather than every official
// permutation, and ship a single (resize-friendly) size rather than a `Size`
// variant. The charts are static Figma equivalents of the live Recharts
// components — bars are editable rectangles, curves/areas/pies/arcs are
// recoloured SVG — and every series binds to the theme's `chart-1…5` variables
// so the whole set recolours with the preset. (The shadcn chart *tooltip*
// examples aren't chart shapes, so they live in the Components-page Tooltip
// section, not here.)
//
// This mirrors the Sidebar block pattern (one self-contained component set
// drawn from scratch rather than instancing other page components), and lives
// in the Blocks region rather than the Components grid.

import { styleComponentSet } from "../../../componentsPage/layout";
import { countDescendants } from "../../utils";
import type { BlocksInputs } from "../../types";
import { CHART_PATTERNS } from "./data";
import { buildChartCard } from "./renderers";

// The set spans the full block-canvas width (1512) like the Sidebar set, so the
// chart variants wrap into a roomy grid beside the other blocks.
const SET_WIDTH = 1512;

export async function addChartBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const components: ComponentNode[] = [];

  for (const pattern of CHART_PATTERNS) {
    const comp = buildChartCard(inputs, pattern);
    // Components must live in the document before combineAsVariants; park them
    // on the page, then the combine call reparents them into the set.
    page.appendChild(comp);
    components.push(comp);
    // Yield periodically so the UI stays responsive across the catalogue.
    await Promise.resolve();
  }

  const set = figma.combineAsVariants(components, page);
  set.name = "Chart";
  set.layoutMode = "HORIZONTAL";
  set.layoutWrap = "WRAP";
  set.itemSpacing = 32;
  set.counterAxisSpacing = 32;
  styleComponentSet(set);

  // styleComponentSet pins the set to the component-grid SECTION_WIDTH (1120);
  // widen it to the full block-canvas width and let the height keep hugging.
  set.resize(SET_WIDTH, set.height || 1);
  set.counterAxisSizingMode = "AUTO";

  return countDescendants(set);
}
