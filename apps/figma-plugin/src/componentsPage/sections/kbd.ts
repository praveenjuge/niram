// Kbd: keyboard key hint. A single key cap plus a grouped shortcut.
//
// Mirrors radix-nova's Kbd: `h-5 min-w-5 gap-1 rounded-sm bg-muted px-1
// text-xs font-medium text-muted-foreground`. KbdGroup is just an
// `inline-flex items-center gap-1` wrapper, so the "group" variant lays a
// few caps in a row with a small "+" style joiner.

import { bindCornerRadii, bindFill, bindFontSize } from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const KBD_KINDS = ["single", "group"] as const;
type KbdKind = (typeof KBD_KINDS)[number];

const CAP_HEIGHT = 20;

export async function addKbdSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const kind of KBD_KINDS) {
    const comp = buildKbdComponent(inputs, kind);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Kbd";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.primaryAxisAlignItems = "MIN";
  componentSet.counterAxisAlignItems = "CENTER";
  componentSet.itemSpacing = 24;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildKbdComponent(
  inputs: ComponentsInputs,
  kind: KbdKind,
): ComponentNode {
  const comp = figma.createComponent();
  comp.name = `Kind=${kind}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  // KbdGroup: `inline-flex items-center gap-1`.
  comp.itemSpacing = 4;
  comp.fills = [];
  comp.strokes = [];

  if (kind === "single") {
    comp.appendChild(buildCommandCap(inputs));
  } else {
    comp.appendChild(buildCommandCap(inputs));
    comp.appendChild(buildCap(inputs, "K"));
  }

  return comp;
}

// A key cap rendering the ⌘ command key. Prefers a real `command` icon from
// the preset's icon library (the ⌘ glyph isn't in most preset fonts and forces
// an unloaded symbol-font substitution); falls back to the glyph when no
// candidate exists.
function buildCommandCap(inputs: ComponentsInputs): FrameNode {
  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "command",
    size: 12,
    color: inputs.theme.light.get("muted-foreground"),
  });
  if (!icon) return buildCap(inputs, "⌘");

  const cap = buildEmptyCap(inputs);
  icon.name = "Icon";
  cap.appendChild(icon);
  return cap;
}

function buildEmptyCap(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const cap = figma.createFrame();
  cap.name = "Key";
  cap.layoutMode = "HORIZONTAL";
  cap.primaryAxisAlignItems = "CENTER";
  cap.counterAxisAlignItems = "CENTER";
  // radix-nova Kbd: `h-5 min-w-5 px-1 rounded-sm bg-muted`.
  cap.paddingLeft = 4;
  cap.paddingRight = 4;
  // resize() pins both axes to FIXED; re-set the primary axis to AUTO so the
  // cap hugs its glyph while the height stays locked at h-5 (20px). The
  // minWidth honours radix-nova's `min-w-5`.
  cap.resize(CAP_HEIGHT, CAP_HEIGHT);
  cap.primaryAxisSizingMode = "AUTO";
  cap.counterAxisSizingMode = "FIXED";
  cap.minWidth = CAP_HEIGHT;
  cap.cornerRadius = 4;
  bindCornerRadii(cap, p.get("radius/sm"));
  bindFill(cap, t.get("muted"));
  cap.strokes = [];

  return cap;
}

function buildCap(inputs: ComponentsInputs, glyph: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const cap = buildEmptyCap(inputs);

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = glyph;
  text.fontSize = 12;
  bindFontSize(text, p.get("font/size/xs"));
  bindFill(text, t.get("muted-foreground"));
  cap.appendChild(text);

  return cap;
}
