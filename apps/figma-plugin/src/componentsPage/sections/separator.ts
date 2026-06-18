// Separator: thin divider line in two orientations.
//
// Mirrors shadcn's Separator (radix-ui primitive): `bg-border` element that
// renders as a 1px line — full width when horizontal, full height when
// vertical.

import { bindFill } from "../bindings";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const SEPARATOR_ORIENTATIONS = ["horizontal", "vertical"] as const;
type SeparatorOrientation = (typeof SEPARATOR_ORIENTATIONS)[number];

const SEPARATOR_LENGTH = 240;

export async function addSeparatorSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const orientation of SEPARATOR_ORIENTATIONS) {
    const comp = buildSeparatorComponent(inputs, orientation);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Separator";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.primaryAxisAlignItems = "CENTER";
  componentSet.counterAxisAlignItems = "CENTER";
  componentSet.itemSpacing = 32;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildSeparatorComponent(
  inputs: ComponentsInputs,
  orientation: SeparatorOrientation,
): ComponentNode {
  const t = inputs.theme.light;

  const comp = figma.createComponent();
  comp.name = `Orientation=${orientation}`;
  comp.layoutMode = "NONE";
  comp.fills = [];
  comp.strokes = [];

  if (orientation === "horizontal") {
    comp.resize(SEPARATOR_LENGTH, 1);
  } else {
    comp.resize(1, SEPARATOR_LENGTH);
  }

  const line = figma.createRectangle();
  line.name = "Line";
  if (orientation === "horizontal") {
    line.resize(SEPARATOR_LENGTH, 1);
  } else {
    line.resize(1, SEPARATOR_LENGTH);
  }
  line.x = 0;
  line.y = 0;
  bindFill(line, t.get("border"));
  comp.appendChild(line);

  return comp;
}
