// Checkbox: 4×4 box with optional check-mark indicator. Three states.
//
// Mirrors shadcn's Checkbox (radix-ui primitive): a square with input
// border by default; primary fill + check icon when checked.

import { bindCornerRadii, bindFill, bindStrokeColor } from "../bindings";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const CHECKBOX_STATES = ["unchecked", "checked", "indeterminate"] as const;
type CheckboxState = (typeof CHECKBOX_STATES)[number];

// Disabled twin for each check state. shadcn renders `disabled:opacity-50
// disabled:cursor-not-allowed`; we surface a boolean `Disabled` property so
// designers can drop the dimmed treatment without a manual override.
const CHECKBOX_DISABLED = ["False", "True"] as const;
type CheckboxDisabled = (typeof CHECKBOX_DISABLED)[number];

export async function addCheckboxSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const state of CHECKBOX_STATES) {
    for (const disabled of CHECKBOX_DISABLED) {
      const comp = buildCheckboxComponent(inputs, state, disabled);
      page.appendChild(comp);
      components.push(comp);
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Checkbox";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildCheckboxComponent(
  inputs: ComponentsInputs,
  state: CheckboxState,
  disabled: CheckboxDisabled,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = `State=${state}, Disabled=${disabled}`;
  // HORIZONTAL auto-layout with CENTER alignment so the check / bar sit
  // centred regardless of their intrinsic bounding box (Figma collapses
  // vector nodes to their path bounds, so absolute positioning won't).
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "CENTER";
  comp.counterAxisAlignItems = "CENTER";
  comp.paddingTop = 0;
  comp.paddingBottom = 0;
  comp.paddingLeft = 0;
  comp.paddingRight = 0;
  comp.itemSpacing = 0;
  comp.resize(16, 16);
  comp.cornerRadius = 4;
  bindCornerRadii(comp, p.get("radius/sm"));

  if (state === "unchecked") {
    bindFill(comp, t.get("background"));
    bindStrokeColor(comp, t.get("input"));
    comp.strokeWeight = 1;
  } else {
    // checked + indeterminate share the primary fill in shadcn.
    bindFill(comp, t.get("primary"));
    comp.strokes = [];
  }

  if (state === "checked") {
    // Check-mark drawn as a vector polyline. Auto-layout centres the
    // vector by its bounding box, so we only need to size the path.
    const check = figma.createVector();
    check.name = "Check";
    check.vectorPaths = [
      {
        windingRule: "NONZERO",
        // Two strokes forming a check: short up-left segment, long down-right.
        // Coordinates sit inside a 10×7 bounding box that auto-layout
        // centres within the 16×16 component.
        data: "M 0 3 L 3.5 6.5 L 10 0",
      },
    ];
    check.strokeWeight = 1.75;
    check.strokeCap = "ROUND";
    check.strokeJoin = "ROUND";
    check.fills = [];
    bindStrokeColor(check, t.get("primary-foreground"));
    comp.appendChild(check);
  } else if (state === "indeterminate") {
    // A short horizontal bar.
    const bar = figma.createRectangle();
    bar.name = "Bar";
    bar.resize(8, 1.75);
    bar.cornerRadius = 1;
    bindFill(bar, t.get("primary-foreground"));
    comp.appendChild(bar);
  }

  if (disabled === "True") {
    comp.opacity = 0.5;
  }

  return comp;
}
