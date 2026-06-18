// Aspect Ratio: a box constrained to a fixed width/height ratio. Mirrors
// shadcn's AspectRatio (radix-ui primitive), which simply pins its child to a
// `ratio`. We expose the three ratios designers reach for most as a variant
// set: 16:9 (video), 4:3 (classic), and 1:1 (square). Each is a muted
// placeholder surface with a centred image glyph so the frame reads as a
// media slot.

import { bindCornerRadii, bindFill } from "../bindings";
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const RATIOS = ["16:9", "4:3", "1:1"] as const;
type Ratio = (typeof RATIOS)[number];

// A shared base width keeps the variants visually comparable; the height is
// derived from the ratio.
const BASE_WIDTH = 240;

const RATIO_DIMS: Record<Ratio, { w: number; h: number }> = {
  "16:9": { w: BASE_WIDTH, h: Math.round((BASE_WIDTH * 9) / 16) },
  "4:3": { w: BASE_WIDTH, h: Math.round((BASE_WIDTH * 3) / 4) },
  "1:1": { w: BASE_WIDTH, h: BASE_WIDTH },
};

export async function addAspectRatioSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const ratio of RATIOS) {
    const comp = buildAspectRatioComponent(inputs, ratio);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Aspect Ratio";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.primaryAxisAlignItems = "MIN";
  componentSet.counterAxisAlignItems = "MIN";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildAspectRatioComponent(
  inputs: ComponentsInputs,
  ratio: Ratio,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const dims = RATIO_DIMS[ratio];

  const comp = figma.createComponent();
  comp.name = `Ratio=${ratio}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "CENTER";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(dims.w, dims.h);
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("muted"));
  comp.strokes = [];
  comp.clipsContent = true;

  // Centred image glyph hints at a media slot. The whole media region is a
  // Content slot so instances can drop in their own image/content and it
  // stretches to the framed ratio.
  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "star",
    size: 24,
    color: t.get("muted-foreground"),
  });
  const slotChildren: SceneNode[] = [];
  if (icon) {
    icon.name = "Icon";
    slotChildren.push(icon);
  }
  const content = createConfiguredSlot(comp, "Content", slotChildren, {
    description: "Media or content framed to the ratio.",
    settings: { stretchChildOnInsert: true },
  });
  content.layoutMode = "HORIZONTAL";
  content.primaryAxisAlignItems = "CENTER";
  content.counterAxisAlignItems = "CENTER";
  content.fills = [];
  content.strokes = [];
  content.layoutSizingHorizontal = "FILL";
  content.layoutSizingVertical = "FILL";

  return comp;
}
