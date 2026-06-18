// Progress: full-width track with a primary fill indicator. Four
// representative values (0%, 33%, 66%, 100%).
//
// Mirrors radix-nova's Progress (radix-ui primitive): `h-1 rounded-full
// bg-muted` track with a `bg-primary` indicator translated by 100 - value%.

import { bindCornerRadii, bindFill } from "../bindings";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const PROGRESS_VALUES = [0, 33, 66, 100, "indeterminate"] as const;
type ProgressValue = (typeof PROGRESS_VALUES)[number];

const TRACK_WIDTH = 320;
const TRACK_HEIGHT = 4;
// Width of the moving indicator used for the indeterminate state.
const INDETERMINATE_WIDTH = TRACK_WIDTH * 0.4;

export async function addProgressSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const value of PROGRESS_VALUES) {
    const comp = buildProgressComponent(inputs, value);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Progress";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildProgressComponent(
  inputs: ComponentsInputs,
  value: ProgressValue,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = `Value=${value}`;
  // Absolute positioning so the track and indicator stack inside the comp.
  comp.layoutMode = "NONE";
  comp.resize(TRACK_WIDTH, TRACK_HEIGHT);
  comp.cornerRadius = TRACK_HEIGHT / 2;
  bindCornerRadii(comp, p.get("radius/full"));
  comp.clipsContent = true;
  comp.fills = [];
  comp.strokes = [];

  // Track — `bg-muted` per radix-nova.
  const track = figma.createRectangle();
  track.name = "Track";
  track.resize(TRACK_WIDTH, TRACK_HEIGHT);
  track.x = 0;
  track.y = 0;
  bindFill(track, t.get("muted"));
  comp.appendChild(track);

  if (value === "indeterminate") {
    // A short pill parked partway along the track to suggest the looping
    // animation sonner/radix render when the total is unknown.
    const indicator = figma.createRectangle();
    indicator.name = "Indicator";
    indicator.resize(INDETERMINATE_WIDTH, TRACK_HEIGHT);
    indicator.x = TRACK_WIDTH * 0.3;
    indicator.y = 0;
    indicator.cornerRadius = TRACK_HEIGHT / 2;
    bindFill(indicator, t.get("primary"));
    comp.appendChild(indicator);
    return comp;
  }

  // Indicator — primary at full opacity, sized to value%.
  if (value > 0) {
    const indicator = figma.createRectangle();
    indicator.name = "Indicator";
    const filled = (TRACK_WIDTH * value) / 100;
    indicator.resize(filled, TRACK_HEIGHT);
    indicator.x = 0;
    indicator.y = 0;
    bindFill(indicator, t.get("primary"));
    comp.appendChild(indicator);
  }

  return comp;
}
