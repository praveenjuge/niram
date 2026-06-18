// Hover Card: floating content panel revealed on hover. Mirrors radix-nova's
// HoverCardContent: `w-64 rounded-lg bg-popover p-2.5 text-sm
// text-popover-foreground shadow-md ring-1 ring-foreground/10`.
//
// The demo content is the @nextjs card (`flex flex-col gap-0.5`): a
// `font-semibold` handle, a body line, and a `mt-1 text-xs
// text-muted-foreground` "Joined" line.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { applyEffectStyle } from "../../effectStyles";
import { wrapInSectionCard } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const HOVER_CARD_WIDTH = 256; // w-64

export async function addHoverCardSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = buildHoverCardComponent(inputs);
  // radix-nova HoverCardContent uses `shadow-md`; reference the published style.
  await applyEffectStyle(comp, inputs.effectStyles?.idFor("Shadow/md"));
  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

function buildHoverCardComponent(inputs: ComponentsInputs): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = "Hover Card";
  comp.layoutMode = "VERTICAL";
  // resize() pins both axes to FIXED; re-set the primary axis to AUTO so the
  // panel hugs its content vertically at the fixed w-64 width.
  comp.resize(HOVER_CARD_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  // `gap-0.5 p-2.5 rounded-lg`.
  comp.itemSpacing = 2;
  comp.paddingTop = 10;
  comp.paddingBottom = 10;
  comp.paddingLeft = 10;
  comp.paddingRight = 10;
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("popover"));
  // `ring-1 ring-foreground/10` — approximate with a 1px border.
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  // Handle: `font-semibold`.
  const handle = figma.createText();
  applyFont(handle, "body", "Semi Bold");
  handle.characters = "@nextjs";
  handle.fontSize = 14;
  bindFontSize(handle, p.get("font/size/sm"));
  bindFill(handle, t.get("popover-foreground"));

  // Body line.
  const body = figma.createText();
  applyFont(body, "body", "Regular");
  body.characters = "The React Framework – created and maintained by @vercel.";
  body.fontSize = 14;
  bindFontSize(body, p.get("font/size/sm"));
  bindFill(body, t.get("popover-foreground"));

  // "Joined" line: `mt-1 text-xs text-muted-foreground`.
  const joined = figma.createText();
  applyFont(joined, "body", "Regular");
  joined.characters = "Joined December 2021";
  joined.fontSize = 12;
  bindFontSize(joined, p.get("font/size/xs"));
  bindFill(joined, t.get("muted-foreground"));

  // Wrap the demo lines in a Content slot so instances can compose their own
  // hover-card body without detaching.
  const content = createConfiguredSlot(
    comp,
    "Content",
    [handle, body, joined],
    { description: "Hover card content." },
  );
  content.layoutMode = "VERTICAL";
  content.primaryAxisSizingMode = "AUTO";
  content.counterAxisSizingMode = "AUTO";
  content.itemSpacing = 2;
  content.fills = [];
  content.layoutSizingHorizontal = "FILL";
  handle.layoutSizingHorizontal = "FILL";
  body.layoutSizingHorizontal = "FILL";
  joined.layoutSizingHorizontal = "FILL";

  return comp;
}
