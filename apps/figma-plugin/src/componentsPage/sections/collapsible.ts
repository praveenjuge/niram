// Collapsible: a trigger row over disclosed content. Mirrors shadcn's
// Collapsible (radix-ui primitive): a header row with a label and a chevron
// toggle, then the open content (two short rows styled like the
// collapsible-demo's `rounded-md border px-4 py-2 font-mono text-sm`).
//
// We expose an `Open=True/False` boolean axis so designers can preview both
// states; the closed variant hides the disclosed rows and points the chevron
// right.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const COLLAPSIBLE_STATES = ["False", "True"] as const;
type CollapsibleState = (typeof COLLAPSIBLE_STATES)[number];

const COLLAPSIBLE_WIDTH = 350;

const ROWS = ["@radix-ui/colors", "@radix-ui/primitives"];

export async function addCollapsibleSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const open of COLLAPSIBLE_STATES) {
    const comp = buildCollapsibleComponent(inputs, open);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Collapsible";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildCollapsibleComponent(
  inputs: ComponentsInputs,
  open: CollapsibleState,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const isOpen = open === "True";

  const comp = figma.createComponent();
  comp.name = `Open=${open}`;
  comp.layoutMode = "VERTICAL";
  comp.resize(COLLAPSIBLE_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  // collapsible-demo: `flex flex-col gap-2`.
  comp.itemSpacing = 8;
  comp.fills = [];
  comp.strokes = [];

  // Header row: `px-4 text-sm font-semibold` label + a ghost icon toggle.
  const header = figma.createFrame();
  header.name = "Header";
  header.layoutMode = "HORIZONTAL";
  header.primaryAxisSizingMode = "FIXED";
  header.counterAxisSizingMode = "AUTO";
  header.primaryAxisAlignItems = "SPACE_BETWEEN";
  header.counterAxisAlignItems = "CENTER";
  header.itemSpacing = 16;
  header.paddingLeft = 16;
  header.fills = [];
  header.strokes = [];
  comp.appendChild(header);
  header.layoutSizingHorizontal = "FILL";

  const label = figma.createText();
  applyFont(label, "body", "Semi Bold");
  label.characters = "@peduarte starred 3 repositories";
  label.fontSize = 14;
  bindFontSize(label, p.get("font/size/sm"));
  bindFill(label, t.get("foreground"));
  header.appendChild(label);

  header.appendChild(buildToggle(inputs, isOpen));

  // First repo is always visible (`rounded-md border px-4 py-2`).
  comp.appendChild(buildRow(inputs, "@radix-ui/primitives"));
  (
    comp.children[comp.children.length - 1] as FrameNode
  ).layoutSizingHorizontal = "FILL";

  // Disclosed rows only render in the open state.
  if (isOpen) {
    for (const repo of ROWS) {
      const row = buildRow(inputs, repo);
      comp.appendChild(row);
      row.layoutSizingHorizontal = "FILL";
    }
  }

  return comp;
}

// A ghost icon button holding a chevron. Open → up/down caret; closed → a
// vertical chevron pair (the demo uses ChevronsUpDown). We keep it simple with
// a down chevron for open and a right chevron for closed.
function buildToggle(inputs: ComponentsInputs, open: boolean): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = "Toggle";
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "FIXED";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.resize(32, 32);
  btn.cornerRadius = 8;
  bindCornerRadii(btn, p.get("radius/lg"));
  btn.fills = [];
  btn.strokes = [];

  const chevron = figma.createVector();
  chevron.name = "Chevron";
  chevron.resize(16, 16);
  chevron.vectorPaths = [
    {
      windingRule: "NONZERO",
      data: open ? "M 4 10 L 8 6 L 12 10" : "M 6 4 L 10 8 L 6 12",
    },
  ];
  chevron.strokeWeight = 1.5;
  chevron.strokeCap = "ROUND";
  chevron.strokeJoin = "ROUND";
  chevron.fills = [];
  bindStrokeColor(chevron, t.get("muted-foreground"));
  btn.appendChild(chevron);

  return btn;
}

// A bordered row holding a mono-styled repo name (`rounded-md border px-4
// py-2 font-mono text-sm`).
function buildRow(inputs: ComponentsInputs, text: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = "Row";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.counterAxisAlignItems = "CENTER";
  row.paddingLeft = 16;
  row.paddingRight = 16;
  row.paddingTop = 8;
  row.paddingBottom = 8;
  row.cornerRadius = 6;
  bindCornerRadii(row, p.get("radius/md"));
  bindFill(row, t.get("background"));
  bindStrokeColor(row, t.get("border"));
  row.strokeWeight = 1;
  row.strokeAlign = "INSIDE";

  const label = figma.createText();
  applyFont(label, "body", "Regular");
  label.characters = text;
  label.fontSize = 14;
  bindFontSize(label, p.get("font/size/sm"));
  bindFill(label, t.get("foreground"));
  row.appendChild(label);

  return row;
}
