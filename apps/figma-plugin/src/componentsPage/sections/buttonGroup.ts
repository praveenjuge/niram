// Button Group: a row of connected buttons that share borders, mirroring
// radix-nova's ButtonGroup. The group is `flex w-fit items-stretch`; the
// orientation classes collapse the inner radii and drop the doubled border
// between adjacent buttons (`rounded-l-none`, `border-l-0`, etc.) so only the
// outer corners stay rounded.
//
// We build two orientations (horizontal / vertical) of three outline buttons.
// Each button mirrors radix-nova's `outline` variant at the default size
// (`h-8 px-2.5 rounded-lg border border-input bg-background`); the shared-edge
// corners are squared off and the overlapping borders removed so the segments
// read as one control.

import { bindFill, bindFontSize, bindStrokeColor } from "../bindings";
import { applyFont } from "../../fonts";
import { styleComponentSet } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const BUTTON_GROUP_ORIENTATIONS = ["horizontal", "vertical"] as const;
type ButtonGroupOrientation = (typeof BUTTON_GROUP_ORIENTATIONS)[number];

const LABELS = ["Years", "Months", "Days"];
const BUTTON_HEIGHT = 32; // h-8
const RADIUS = 8; // rounded-lg

export async function addButtonGroupSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const orientation of BUTTON_GROUP_ORIENTATIONS) {
    const comp = buildButtonGroupComponent(inputs, orientation);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Button Group";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.primaryAxisAlignItems = "MIN";
  componentSet.counterAxisAlignItems = "MIN";
  componentSet.itemSpacing = 32;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildButtonGroupComponent(
  inputs: ComponentsInputs,
  orientation: ButtonGroupOrientation,
): ComponentNode {
  const horizontal = orientation === "horizontal";

  const comp = figma.createComponent();
  comp.name = `Orientation=${orientation}`;
  comp.layoutMode = horizontal ? "HORIZONTAL" : "VERTICAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "MIN";
  // `items-stretch` with no gap — buttons butt up against each other and the
  // overlapping borders collapse via per-side stroke weights below.
  comp.itemSpacing = 0;
  comp.fills = [];
  comp.strokes = [];

  // The connected buttons live in a slot so instances can add/remove segments.
  const segments: FrameNode[] = [];
  for (let i = 0; i < LABELS.length; i++) {
    const isFirst = i === 0;
    const isLast = i === LABELS.length - 1;
    segments.push(
      buildSegment(inputs, LABELS[i]!, orientation, isFirst, isLast),
    );
  }
  const items = createConfiguredSlot(comp, "Items", segments, {
    description: "Connected buttons.",
    settings: { minChildren: 1 },
  });
  items.layoutMode = horizontal ? "HORIZONTAL" : "VERTICAL";
  items.primaryAxisSizingMode = "AUTO";
  items.counterAxisSizingMode = "AUTO";
  items.primaryAxisAlignItems = "MIN";
  items.counterAxisAlignItems = "MIN";
  items.itemSpacing = 0;
  items.fills = [];
  items.strokes = [];
  // Stretch each segment across the counter axis so heights/widths match.
  // Horizontal segments already share a fixed BUTTON_HEIGHT, so they match
  // without FILL — and FILL would discard that fixed height, collapsing the
  // hugging parent to the text's intrinsic height (a squished group). Only
  // the vertical orientation needs FILL, to equalize the differing widths.
  if (!horizontal) {
    for (const seg of segments) seg.layoutSizingHorizontal = "FILL";
  }

  return comp;
}

function buildSegment(
  inputs: ComponentsInputs,
  label: string,
  orientation: ButtonGroupOrientation,
  isFirst: boolean,
  isLast: boolean,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const horizontal = orientation === "horizontal";

  const seg = figma.createFrame();
  seg.name = "Button";
  seg.layoutMode = "HORIZONTAL";
  seg.primaryAxisSizingMode = "AUTO";
  seg.counterAxisSizingMode = "FIXED";
  seg.primaryAxisAlignItems = "CENTER";
  seg.counterAxisAlignItems = "CENTER";
  // radix-nova default button: `h-8 px-2.5`.
  seg.paddingLeft = 10;
  seg.paddingRight = 10;
  seg.resize(seg.width, BUTTON_HEIGHT);
  seg.primaryAxisSizingMode = "AUTO";
  // outline variant: `border border-input bg-background`.
  bindFill(seg, t.get("background"));
  bindStrokeColor(seg, t.get("input"));
  seg.strokeWeight = 1;
  seg.strokeAlign = "INSIDE";

  // Collapse the shared edges: only round the group's outer corners and drop
  // the doubled inner border (`border-l-0` / `border-t-0` on non-first items).
  const lgRadius = p.get("radius/lg");
  let tl = 0;
  let tr = 0;
  let bl = 0;
  let br = 0;
  if (horizontal) {
    if (isFirst) {
      tl = RADIUS;
      bl = RADIUS;
    }
    if (isLast) {
      tr = RADIUS;
      br = RADIUS;
    }
    if (!isFirst) seg.strokeLeftWeight = 0;
  } else {
    if (isFirst) {
      tl = RADIUS;
      tr = RADIUS;
    }
    if (isLast) {
      bl = RADIUS;
      br = RADIUS;
    }
    if (!isFirst) seg.strokeTopWeight = 0;
  }
  seg.topLeftRadius = tl;
  seg.topRightRadius = tr;
  seg.bottomLeftRadius = bl;
  seg.bottomRightRadius = br;
  // Bind only the rounded (outer) corners to radius/lg; leave squared corners
  // as literal 0 (the token sweep skips zero values).
  if (lgRadius) {
    try {
      if (tl) seg.setBoundVariable("topLeftRadius", lgRadius);
      if (tr) seg.setBoundVariable("topRightRadius", lgRadius);
      if (bl) seg.setBoundVariable("bottomLeftRadius", lgRadius);
      if (br) seg.setBoundVariable("bottomRightRadius", lgRadius);
    } catch {
      // ignore — leave the literal radii in place
    }
  }

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get("foreground"));
  seg.appendChild(text);

  return seg;
}
