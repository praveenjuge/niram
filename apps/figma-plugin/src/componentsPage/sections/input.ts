// Input: text field across four states, optionally with a leading icon.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";
import { collectByTypeAndName, defineTextProperty } from "../properties";

const INPUT_STATES = ["default", "focused", "disabled", "invalid"] as const;
type InputState = (typeof INPUT_STATES)[number];

// Whether the field carries a leading icon (e.g. a search field). shadcn
// doesn't ship an icon input primitive, but it's one of the most common
// compositions designers build on top of Input.
const INPUT_LEADING = ["none", "icon"] as const;
type InputLeading = (typeof INPUT_LEADING)[number];

export async function addInputSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const leading of INPUT_LEADING) {
    for (const state of INPUT_STATES) {
      const comp = buildInputComponent(inputs, state, leading);
      page.appendChild(comp);
      components.push(comp);
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Input";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  // Expose the field text as an editable placeholder property across variants.
  defineTextProperty(
    componentSet,
    "Placeholder",
    "you@example.com",
    collectByTypeAndName(componentSet, "TEXT", "Value"),
  );

  return countDescendants(componentSet);
}

function buildInputComponent(
  inputs: ComponentsInputs,
  state: InputState,
  leading: InputLeading,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = `State=${state}, Leading=${leading}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(280, 32);
  // Mirrors radix-nova's Input: `h-8 px-2.5 py-1 rounded-lg`.
  comp.paddingLeft = 10;
  comp.paddingRight = 10;
  comp.paddingTop = 4;
  comp.paddingBottom = 4;
  comp.itemSpacing = 6;
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("background"));

  // Border per state. Focus uses a 1px ring border + the focus ring shadow;
  // invalid keeps the 1px border and only swaps the colour to destructive.
  switch (state) {
    case "focused":
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
      break;
    case "invalid":
      bindStrokeColor(comp, t.get("destructive"));
      comp.strokeWeight = 1;
      break;
    default:
      bindStrokeColor(comp, t.get("input"));
      comp.strokeWeight = 1;
      break;
  }

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.name = "Value";
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));

  // Leading icon (search glyph) for the icon variant, tinted muted-foreground
  // and placed before the text so auto-layout lays them in a row.
  if (leading === "icon") {
    const icon = createIcon({
      library: resolveIconLibrary(inputs.presetSummary),
      name: "search",
      size: 16,
      color: t.get("muted-foreground"),
    });
    if (icon) {
      icon.name = "Icon";
      comp.appendChild(icon);
    }
  }

  // The icon variant reads as a search field; the plain variant keeps the
  // email-style sample content that signals each state.
  if (leading === "icon") {
    switch (state) {
      case "focused":
        text.characters = "Wireframe kit";
        bindFill(text, t.get("foreground"));
        break;
      case "invalid":
        text.characters = "No results";
        bindFill(text, t.get("foreground"));
        break;
      default:
        text.characters = "Search components";
        bindFill(text, t.get("muted-foreground"));
        break;
    }
    comp.appendChild(text);
    if (state === "disabled") comp.opacity = 0.5;
    return comp;
  }

  switch (state) {
    case "default":
      text.characters = "you@example.com";
      bindFill(text, t.get("muted-foreground"));
      break;
    case "focused":
      text.characters = "designer@figma.com";
      bindFill(text, t.get("foreground"));
      break;
    case "disabled":
      text.characters = "you@example.com";
      bindFill(text, t.get("muted-foreground"));
      break;
    case "invalid":
      text.characters = "not-an-email";
      bindFill(text, t.get("foreground"));
      break;
  }

  comp.appendChild(text);

  if (state === "disabled") {
    comp.opacity = 0.5;
  }

  return comp;
}
