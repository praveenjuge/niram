// Drawer: a panel that slides in from an edge (vaul). Mirrors radix-nova's
// DrawerContent: `flex flex-col bg-popover text-sm text-popover-foreground`,
// with the docking edge rounded (`rounded-t-xl` for bottom, etc.) and a
// border on that edge. The bottom variant shows the drag handle
// (`mx-auto mt-4 h-1 w-[100px] rounded-full bg-muted`).
//
// Demo content mirrors the drawer demo: a DrawerHeader (`gap-0.5 p-4`,
// centered for top/bottom) with `text-base font-medium` title +
// `text-muted-foreground` description, and a DrawerFooter (`mt-auto gap-2 p-4`)
// with a primary "Submit" and an outline "Cancel".

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { applyEffectStyle } from "../../effectStyles";
import { styleComponentSet } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

// vaul's `direction` prop: which edge the drawer slides in from. Bottom/top
// are wide horizontal sheets; left/right are tall side panels.
const DRAWER_SIDES = ["bottom", "right", "left", "top"] as const;
type DrawerSide = (typeof DRAWER_SIDES)[number];

const DRAWER_SIDE_WIDTH = 384; // sm:max-w-sm side panels.
const DRAWER_SIDE_HEIGHT = 420;
const DRAWER_HORIZONTAL_WIDTH = 480;
const DRAWER_HORIZONTAL_HEIGHT = 240;
const DRAWER_RADIUS = 12; // rounded-xl on the docking edge.

export async function addDrawerSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const side of DRAWER_SIDES) {
    const comp = buildDrawerComponent(inputs, side);
    // DrawerContent floats above an overlay; reference the lg shadow.
    await applyEffectStyle(comp, inputs.effectStyles?.idFor("Shadow/lg"));
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Drawer";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildDrawerComponent(
  inputs: ComponentsInputs,
  side: DrawerSide,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const horizontal = side === "top" || side === "bottom";
  const width = horizontal ? DRAWER_HORIZONTAL_WIDTH : DRAWER_SIDE_WIDTH;
  const height = horizontal ? DRAWER_HORIZONTAL_HEIGHT : DRAWER_SIDE_HEIGHT;

  const comp = figma.createComponent();
  comp.name = `Side=${side}`;
  comp.layoutMode = "VERTICAL";
  comp.resize(width, height);
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.itemSpacing = 0;
  bindFill(comp, t.get("popover"));
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";
  // Border + rounding sit on the edge the drawer docks against:
  // bottom→top edge, top→bottom edge, left→right edge, right→left edge.
  comp.strokeTopWeight = side === "bottom" ? 1 : 0;
  comp.strokeBottomWeight = side === "top" ? 1 : 0;
  comp.strokeLeftWeight = side === "right" ? 1 : 0;
  comp.strokeRightWeight = side === "left" ? 1 : 0;
  comp.topLeftRadius =
    side === "bottom" || side === "right" ? DRAWER_RADIUS : 0;
  comp.topRightRadius =
    side === "bottom" || side === "left" ? DRAWER_RADIUS : 0;
  comp.bottomLeftRadius =
    side === "top" || side === "right" ? DRAWER_RADIUS : 0;
  comp.bottomRightRadius =
    side === "top" || side === "left" ? DRAWER_RADIUS : 0;
  comp.clipsContent = true;

  // Drag handle — only the bottom drawer shows it (`mx-auto mt-4 h-1
  // w-[100px] rounded-full bg-muted`).
  if (side === "bottom") {
    const handleWrap = figma.createFrame();
    handleWrap.name = "Handle";
    handleWrap.layoutMode = "HORIZONTAL";
    handleWrap.primaryAxisSizingMode = "FIXED";
    handleWrap.counterAxisSizingMode = "AUTO";
    handleWrap.primaryAxisAlignItems = "CENTER";
    handleWrap.counterAxisAlignItems = "CENTER";
    handleWrap.paddingTop = 16;
    handleWrap.fills = [];
    handleWrap.strokes = [];
    comp.appendChild(handleWrap);
    handleWrap.layoutSizingHorizontal = "FILL";

    const handle = figma.createFrame();
    handle.name = "Grip";
    handle.resize(100, 4);
    handle.cornerRadius = 999;
    bindFill(handle, t.get("muted"));
    handle.strokes = [];
    handleWrap.appendChild(handle);
  }

  // Header: `flex flex-col gap-0.5 p-4`, centered for top/bottom drawers.
  const header = figma.createFrame();
  header.name = "Drawer Header";
  header.layoutMode = "VERTICAL";
  header.primaryAxisSizingMode = "AUTO";
  header.counterAxisSizingMode = "AUTO";
  header.counterAxisAlignItems = horizontal ? "CENTER" : "MIN";
  header.itemSpacing = 2;
  header.paddingTop = 16;
  header.paddingBottom = 16;
  header.paddingLeft = 16;
  header.paddingRight = 16;
  header.fills = [];
  header.strokes = [];
  comp.appendChild(header);
  header.layoutSizingHorizontal = "FILL";

  const title = figma.createText();
  applyFont(title, "heading", "Medium");
  title.characters = "Move goal";
  title.fontSize = 16;
  bindFontSize(title, p.get("font/size/base"));
  bindFill(title, t.get("foreground"));
  title.textAlignHorizontal = horizontal ? "CENTER" : "LEFT";
  header.appendChild(title);
  title.layoutSizingHorizontal = "FILL";

  const desc = figma.createText();
  applyFont(desc, "body", "Regular");
  desc.characters = "Set your daily activity goal.";
  desc.fontSize = 14;
  bindFontSize(desc, p.get("font/size/sm"));
  bindFill(desc, t.get("muted-foreground"));
  desc.textAlignHorizontal = horizontal ? "CENTER" : "LEFT";
  header.appendChild(desc);
  desc.layoutSizingHorizontal = "FILL";

  // Footer: `mt-auto flex flex-col gap-2 p-4`.
  const footer = figma.createFrame();
  footer.name = "Drawer Footer";
  footer.layoutMode = "VERTICAL";
  footer.primaryAxisSizingMode = "AUTO";
  footer.counterAxisSizingMode = "AUTO";
  footer.itemSpacing = 8;
  footer.paddingTop = 16;
  footer.paddingBottom = 16;
  footer.paddingLeft = 16;
  footer.paddingRight = 16;
  footer.fills = [];
  footer.strokes = [];
  comp.appendChild(footer);
  footer.layoutSizingHorizontal = "FILL";

  const submit = buildButton(inputs, "Submit", "default");
  const cancel = buildButton(inputs, "Cancel", "outline");
  // Footer actions live in a slot nested in the footer chrome.
  const actions = createConfiguredSlot(comp, "Actions", [submit, cancel], {
    description: "Drawer footer actions.",
  });
  footer.appendChild(actions);
  actions.layoutMode = "VERTICAL";
  actions.primaryAxisSizingMode = "AUTO";
  actions.counterAxisSizingMode = "AUTO";
  actions.itemSpacing = 8;
  actions.fills = [];
  actions.layoutSizingHorizontal = "FILL";
  submit.layoutSizingHorizontal = "FILL";
  submit.primaryAxisAlignItems = "CENTER";
  cancel.layoutSizingHorizontal = "FILL";
  cancel.primaryAxisAlignItems = "CENTER";

  // Let the header absorb the slack so the footer pins to the bottom edge
  // (mirrors `mt-auto`).
  header.layoutGrow = 1;

  return comp;
}

function buildButton(
  inputs: ComponentsInputs,
  label: string,
  variant: "default" | "outline",
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = `Button (${variant})`;
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "FIXED";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.paddingLeft = 10;
  btn.paddingRight = 10;
  btn.resize(120, 32);
  btn.cornerRadius = 8;
  bindCornerRadii(btn, p.get("radius/lg"));
  btn.strokes = [];

  if (variant === "outline") {
    bindFill(btn, t.get("background"));
    bindStrokeColor(btn, t.get("border"));
    btn.strokeWeight = 1;
  } else {
    bindFill(btn, t.get("primary"));
  }

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(
    text,
    t.get(variant === "outline" ? "foreground" : "primary-foreground"),
  );
  btn.appendChild(text);

  return btn;
}
