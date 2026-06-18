// Native Select: a styled `<select>` element with a trailing chevron.
//
// Mirrors radix-nova's NativeSelect: `h-8 w-full appearance-none rounded-lg
// border border-input bg-transparent py-1 pr-8 pl-2.5 text-sm` with a
// `size-4 text-muted-foreground` chevron pinned to the right. The `size` prop
// drives the height (default h-8, sm h-7 rounded-md). Focus swaps the border
// to `ring` + a 3px ring; invalid uses `destructive`; disabled dims to 50%.
//
// Unlike the custom Select (which shows a placeholder), a native select always
// reflects its selected option, so the value renders in the foreground colour.

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

const NATIVE_SELECT_SIZES = ["sm", "default"] as const;
type NativeSelectSize = (typeof NATIVE_SELECT_SIZES)[number];

const NATIVE_SELECT_STATES = [
  "default",
  "focus",
  "disabled",
  "invalid",
] as const;
type NativeSelectState = (typeof NATIVE_SELECT_STATES)[number];

const NATIVE_SELECT_DIMS: Record<
  NativeSelectSize,
  { height: number; width: number }
> = {
  sm: { height: 28, width: 180 },
  default: { height: 32, width: 200 },
};

export async function addNativeSelectSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const size of NATIVE_SELECT_SIZES) {
    for (const state of NATIVE_SELECT_STATES) {
      const comp = buildNativeSelectComponent(inputs, size, state);
      page.appendChild(comp);
      components.push(comp);
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Native Select";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildNativeSelectComponent(
  inputs: ComponentsInputs,
  size: NativeSelectSize,
  state: NativeSelectState,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const dims = NATIVE_SELECT_DIMS[size];

  const comp = figma.createComponent();
  comp.name = `Size=${size}, State=${state}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "SPACE_BETWEEN";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(dims.width, dims.height);
  // Mirrors radix-nova's NativeSelect: `py-1 pr-2.5 pl-2.5 rounded-lg`. Sm
  // rounds with `radius-md` instead.
  comp.itemSpacing = 6;
  comp.paddingLeft = 10;
  comp.paddingRight = 10;
  comp.paddingTop = 4;
  comp.paddingBottom = 4;
  if (size === "sm") {
    comp.cornerRadius = 6;
    bindCornerRadii(comp, p.get("radius/md"));
  } else {
    comp.cornerRadius = 8;
    bindCornerRadii(comp, p.get("radius/lg"));
  }
  bindFill(comp, t.get("background"));

  // State-driven border + ring. Focus swaps the border to `ring` and adds the
  // 3px focus ring shadow; invalid keeps a 1px destructive border; disabled
  // keeps the resting border and dims the whole control.
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
  } else if (state === "invalid") {
    bindStrokeColor(comp, t.get("destructive"));
    comp.strokeWeight = 1;
  } else {
    bindStrokeColor(comp, t.get("input"));
    comp.strokeWeight = 1;
  }

  const value = figma.createText();
  applyFont(value, "body", "Regular");
  value.characters = "Apple";
  value.fontSize = 14;
  bindFontSize(value, p.get("font/size/sm"));
  // A native select always reflects a selected option, so the value reads in
  // the foreground colour rather than the muted placeholder colour.
  bindFill(value, t.get("foreground"));
  comp.appendChild(value);

  comp.appendChild(buildChevronDown(t));

  if (state === "disabled") {
    comp.opacity = 0.5;
  }

  return comp;
}

function buildChevronDown(t: Map<string, Variable>): VectorNode {
  // Down-pointing chevron at 16px to match the control text.
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
