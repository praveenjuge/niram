// Select: trigger button with value and chevron, in two sizes.
//
// Mirrors shadcn's Select trigger (radix-ui primitive): `rounded-md border
// border-input bg-transparent px-3 py-2 text-sm` with a trailing chevron-down
// icon. The `data-size` prop drives the height (default h-9, sm h-8).

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

const SELECT_SIZES = ["sm", "default"] as const;
type SelectSize = (typeof SELECT_SIZES)[number];

// Trigger interaction state. shadcn renders the focus ring via
// `focus-visible:ring-[3px]` and dims disabled triggers with
// `disabled:opacity-50`; surface both as a pickable `State` axis.
const SELECT_STATES = ["default", "focus", "disabled"] as const;
type SelectState = (typeof SELECT_STATES)[number];

const SELECT_DIMS: Record<SelectSize, { height: number; width: number }> = {
  sm: { height: 28, width: 180 },
  default: { height: 32, width: 200 },
};

export async function addSelectSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const size of SELECT_SIZES) {
    for (const state of SELECT_STATES) {
      const comp = buildSelectComponent(inputs, size, state);
      page.appendChild(comp);
      components.push(comp);
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Select";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildSelectComponent(
  inputs: ComponentsInputs,
  size: SelectSize,
  state: SelectState,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const dims = SELECT_DIMS[size];

  const comp = figma.createComponent();
  comp.name = `Size=${size}, State=${state}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "SPACE_BETWEEN";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(dims.width, dims.height);
  // Mirrors radix-nova's SelectTrigger: `gap-1.5 py-2 pr-2 pl-2.5
  // rounded-lg`. Sm rounds with `radius-md` instead.
  comp.itemSpacing = 6;
  comp.paddingLeft = 10;
  comp.paddingRight = 8;
  comp.paddingTop = 8;
  comp.paddingBottom = 8;
  if (size === "sm") {
    comp.cornerRadius = 6;
    bindCornerRadii(comp, p.get("radius/md"));
  } else {
    comp.cornerRadius = 8;
    bindCornerRadii(comp, p.get("radius/lg"));
  }
  bindFill(comp, t.get("background"));
  // State-driven border + ring. Focus swaps the border to `ring` and adds the
  // 3px focus ring shadow; disabled keeps the resting border and dims the
  // whole trigger.
  if (state === "focus") {
    bindStrokeColor(comp, t.get("ring"));
    comp.strokeWeight = 1;
    comp.effects = [
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
  } else {
    bindStrokeColor(comp, t.get("input"));
    comp.strokeWeight = 1;
  }

  const value = figma.createText();
  applyFont(value, "body", "Regular");
  value.characters = "Select a fruit";
  value.fontSize = 14;
  bindFontSize(value, p.get("font/size/sm"));
  // Placeholder state in shadcn renders the value in muted-foreground via
  // `data-[placeholder]:text-muted-foreground`.
  bindFill(value, t.get("muted-foreground"));
  comp.appendChild(value);

  comp.appendChild(buildChevronDown(t));

  if (state === "disabled") {
    comp.opacity = 0.5;
  }

  return comp;
}

function buildChevronDown(t: Map<string, Variable>): VectorNode {
  // Down-pointing chevron at 16px to match the trigger text.
  const chevron = figma.createVector();
  chevron.name = "Chevron";
  chevron.resize(16, 16);
  chevron.vectorPaths = [
    {
      windingRule: "NONZERO",
      data: "M 4 6 L 8 10 L 12 6",
    },
  ];
  chevron.strokeWeight = 1.5;
  chevron.strokeCap = "ROUND";
  chevron.strokeJoin = "ROUND";
  chevron.fills = [];
  bindStrokeColor(chevron, t.get("muted-foreground"));
  return chevron;
}
