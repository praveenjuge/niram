// Message Scroller: the floating "jump to latest" control from shadcn's
// MessageScroller (new in the July 2026 @shadcn/react components), shipped as
// a standalone variant set.
//
// Mirrors apps/v4/registry/bases/base/ui/message-scroller.tsx exactly: the
// button renders a secondary `icon-sm` Button (size-7 → 28×28,
// rounded-[min(var(--radius-md),12px)] → radius/md) whose classes override the
// variant surface to `border-border bg-background text-foreground`, with an
// ArrowDown glyph at `[&_svg]:size-4`. No shadow — neither `.cn-button` nor
// the secondary variant carries one in styles/style-nova.css. The unread-count
// pill extends the same token set for the "new messages arrived" moment.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { createNamedIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const BUTTON_SIZE = 28;

const SCROLLER_STATES = ["following", "new-messages"] as const;
type ScrollerState = (typeof SCROLLER_STATES)[number];

export async function addMessageScrollerSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const state of SCROLLER_STATES) {
    const comp = buildJumpButton(inputs, state);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Message Scroller";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 24;
  componentSet.counterAxisAlignItems = "CENTER";
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

// MessageScrollerButton: a bordered background surface with a foreground
// arrow. `following` is the icon-only control; `new-messages` hugs an arrow +
// unread count.
function buildJumpButton(
  inputs: ComponentsInputs,
  state: ScrollerState,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const isPill = state === "new-messages";

  const comp = figma.createComponent();
  comp.name = `State=${state}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisAlignItems = "CENTER";
  comp.counterAxisAlignItems = "CENTER";
  // `gap-1.5` between the arrow and the count label.
  comp.itemSpacing = 6;
  // Fixed square for the icon-only control; the pill hugs its label instead.
  if (isPill) {
    comp.primaryAxisSizingMode = "AUTO";
    comp.counterAxisSizingMode = "FIXED";
    comp.resize(BUTTON_SIZE + 24, BUTTON_SIZE);
    comp.primaryAxisSizingMode = "AUTO";
    comp.paddingLeft = 12;
    comp.paddingRight = 12;
  } else {
    comp.primaryAxisSizingMode = "FIXED";
    comp.counterAxisSizingMode = "FIXED";
    comp.paddingLeft = 0;
    comp.paddingRight = 0;
    comp.resize(BUTTON_SIZE, BUTTON_SIZE);
  }
  // `rounded-[min(var(--radius-md),12px)]` → radius/md.
  comp.cornerRadius = 6;
  bindCornerRadii(comp, p.get("radius/md"));
  // The scroller overrides the secondary variant surface:
  // `border-border bg-background text-foreground`.
  bindFill(comp, t.get("background"));
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;

  appendArrow(inputs, comp);

  if (isPill) {
    const label = figma.createText();
    applyFont(label, "body", "Medium");
    label.name = "Count";
    label.characters = "3 new";
    label.fontSize = 12;
    bindFontSize(label, p.get("font/size/xs"));
    bindFill(label, t.get("foreground"));
    comp.appendChild(label);
  }

  return comp;
}

// The ArrowDown glyph at `[&_svg]:size-4` (16px), coloured by
// `text-foreground`. Candidate names cover every bundled icon library.
function appendArrow(inputs: ComponentsInputs, comp: ComponentNode): void {
  const arrow = createNamedIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: ["arrow-down", "arrow-down-line"],
    size: 16,
    color: inputs.theme.light.get("foreground"),
  });
  if (arrow) {
    arrow.name = "Icon";
    comp.appendChild(arrow);
  }
}
