// Input OTP: one-time-password field rendered as two groups of three
// connected slots, joined by a minus separator.
//
// Mirrors radix-nova's InputOTP: each slot is `size-8 border-y border-r
// border-input text-sm`, the first slot adds a left border and rounds its
// left corners (`first:rounded-l-lg first:border-l`), the last rounds its
// right corners (`last:rounded-r-lg`). The active slot gets a `border-ring`
// + ring on all sides. The separator renders a `MinusIcon`.

import { bindFill, bindFontSize, bindStrokeColor } from "../bindings";
import { applyFont } from "../../fonts";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const SLOT_SIZE = 32;
const RADIUS_LG = 8;

// The set ships one variant per interaction state so designers can pull the
// right look without rebuilding the slot stack by hand. Each state maps to a
// pair of three-char groups, the globally-active slot index (-1 = none), and
// the border tone applied to the resting slots.
const OTP_STATES = [
  "default",
  "focused",
  "filled",
  "disabled",
  "invalid",
] as const;
type OtpState = (typeof OTP_STATES)[number];

type SlotTone = "input" | "destructive";

type StateConfig = {
  groupA: string[];
  groupB: string[];
  // Active slot index counted across both groups (0-5); -1 when none.
  activeIndex: number;
  tone: SlotTone;
  dimmed: boolean;
};

const STATE_CONFIG: Record<OtpState, StateConfig> = {
  // Mid-entry: first group filled with the last slot active, second empty.
  default: {
    groupA: ["1", "2", "3"],
    groupB: ["", "", ""],
    activeIndex: 2,
    tone: "input",
    dimmed: false,
  },
  // Empty field with the caret resting on the very first slot.
  focused: {
    groupA: ["", "", ""],
    groupB: ["", "", ""],
    activeIndex: 0,
    tone: "input",
    dimmed: false,
  },
  // Fully entered code, nothing active.
  filled: {
    groupA: ["1", "2", "3"],
    groupB: ["4", "5", "6"],
    activeIndex: -1,
    tone: "input",
    dimmed: false,
  },
  // Disabled mirrors the default content at 50% opacity.
  disabled: {
    groupA: ["1", "2", "3"],
    groupB: ["", "", ""],
    activeIndex: -1,
    tone: "input",
    dimmed: true,
  },
  // aria-invalid swaps the resting border to destructive.
  invalid: {
    groupA: ["1", "2", "3"],
    groupB: ["4", "5", "6"],
    activeIndex: -1,
    tone: "destructive",
    dimmed: false,
  },
};

export async function addInputOtpSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const state of OTP_STATES) {
    const comp = buildInputOtpComponent(inputs, state);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Input OTP";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);
  return countDescendants(componentSet);
}

function buildInputOtpComponent(
  inputs: ComponentsInputs,
  state: OtpState,
): ComponentNode {
  const cfg = STATE_CONFIG[state];

  const comp = figma.createComponent();
  comp.name = `State=${state}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  // radix-nova InputOTP container: `flex items-center` with `gap-2` between
  // the two groups (via the separator margins). We use an 8px item spacing.
  comp.itemSpacing = 8;
  comp.fills = [];
  comp.strokes = [];

  // activeIndex is counted across both groups; translate to per-group indices.
  const activeA = cfg.activeIndex;
  const activeB = cfg.activeIndex - cfg.groupA.length;

  comp.appendChild(buildGroup(inputs, cfg.groupA, activeA, cfg.tone));
  comp.appendChild(buildSeparator(inputs));
  comp.appendChild(buildGroup(inputs, cfg.groupB, activeB, cfg.tone));

  if (cfg.dimmed) comp.opacity = 0.5;

  return comp;
}

function buildGroup(
  inputs: ComponentsInputs,
  chars: string[],
  activeIndex: number,
  tone: SlotTone,
): FrameNode {
  const group = figma.createFrame();
  group.name = "Group";
  group.layoutMode = "HORIZONTAL";
  group.primaryAxisSizingMode = "AUTO";
  group.counterAxisSizingMode = "AUTO";
  group.counterAxisAlignItems = "CENTER";
  // Slots are connected (no gap) — borders overlap like shadcn's group.
  group.itemSpacing = 0;
  group.fills = [];
  group.strokes = [];

  for (let i = 0; i < chars.length; i++) {
    group.appendChild(
      buildSlot(inputs, chars[i]!, tone, {
        first: i === 0,
        last: i === chars.length - 1,
        active: i === activeIndex,
        // Drop the right edge when the next slot is active so its ring border
        // reads as one clean line instead of doubling with this slot's edge.
        nextActive: i + 1 === activeIndex,
      }),
    );
  }

  return group;
}

type SlotFlags = {
  first: boolean;
  last: boolean;
  active: boolean;
  nextActive: boolean;
};

function buildSlot(
  inputs: ComponentsInputs,
  char: string,
  tone: SlotTone,
  flags: SlotFlags,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const slot = figma.createFrame();
  slot.name = flags.active ? "Slot (active)" : "Slot";
  slot.layoutMode = "HORIZONTAL";
  slot.primaryAxisAlignItems = "CENTER";
  slot.counterAxisAlignItems = "CENTER";
  slot.resize(SLOT_SIZE, SLOT_SIZE);
  slot.primaryAxisSizingMode = "FIXED";
  slot.counterAxisSizingMode = "FIXED";
  slot.fills = [];

  // Border: every slot has top/right/bottom; the first adds a left edge so
  // the group reads as one box. The active slot swaps to the ring colour and
  // also draws its own left edge so the highlight surrounds the slot fully
  // (shadcn's active slot gets a ring on all four sides). Resting slots use
  // the input tone, or destructive when the field is invalid.
  const restingTone =
    tone === "destructive" ? t.get("destructive") : t.get("input");
  bindStrokeColor(slot, flags.active ? t.get("ring") : restingTone);
  slot.strokeWeight = 1;
  slot.strokeAlign = "INSIDE";
  slot.strokeTopWeight = 1;
  slot.strokeBottomWeight = 1;
  slot.strokeRightWeight = flags.nextActive ? 0 : 1;
  slot.strokeLeftWeight = flags.first || flags.active ? 1 : 0;

  // Corner rounding: first slot rounds its left, last slot rounds its right.
  const radiusVar = p.get("radius/lg");
  if (flags.first) {
    slot.topLeftRadius = RADIUS_LG;
    slot.bottomLeftRadius = RADIUS_LG;
    if (radiusVar) {
      try {
        slot.setBoundVariable("topLeftRadius", radiusVar);
        slot.setBoundVariable("bottomLeftRadius", radiusVar);
      } catch {
        // ignore
      }
    }
  }
  if (flags.last) {
    slot.topRightRadius = RADIUS_LG;
    slot.bottomRightRadius = RADIUS_LG;
    if (radiusVar) {
      try {
        slot.setBoundVariable("topRightRadius", radiusVar);
        slot.setBoundVariable("bottomRightRadius", radiusVar);
      } catch {
        // ignore
      }
    }
  }

  if (char) {
    const text = figma.createText();
    applyFont(text, "body", "Regular");
    text.characters = char;
    text.fontSize = 14;
    bindFontSize(text, p.get("font/size/sm"));
    bindFill(text, t.get("foreground"));
    slot.appendChild(text);
  } else if (flags.active) {
    // Fake caret: a 1px tall bar like shadcn's `animate-caret-blink`.
    const caret = figma.createRectangle();
    caret.name = "Caret";
    caret.resize(1, 16);
    bindFill(caret, t.get("foreground"));
    slot.appendChild(caret);
  }

  return slot;
}

function buildSeparator(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;

  const sep = figma.createFrame();
  sep.name = "Separator";
  sep.layoutMode = "HORIZONTAL";
  sep.primaryAxisAlignItems = "CENTER";
  sep.counterAxisAlignItems = "CENTER";
  sep.resize(16, SLOT_SIZE);
  sep.primaryAxisSizingMode = "FIXED";
  sep.counterAxisSizingMode = "FIXED";
  sep.fills = [];
  sep.strokes = [];

  // MinusIcon → a short horizontal line.
  const dash = figma.createRectangle();
  dash.name = "Minus";
  dash.resize(8, 1.5);
  dash.cornerRadius = 1;
  bindFill(dash, t.get("muted-foreground"));
  sep.appendChild(dash);

  return sep;
}
