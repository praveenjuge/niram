// Components page header — preset summary and a friendly intro line.

import { applyFont } from "../../fonts";
import { bindFill } from "../bindings";
import { solidPaint } from "../paints";
import { SECTION_WIDTH, type ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

export async function addHeader(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const t = inputs.theme.light;
  const frame = figma.createFrame();
  frame.name = "Components";
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "FIXED";
  frame.itemSpacing = 16;
  frame.paddingTop = 16;
  frame.paddingBottom = 16;
  frame.paddingLeft = 16;
  frame.paddingRight = 16;
  frame.fills = [solidPaint(1)];
  bindFill(frame, t.get("card"));
  frame.resize(SECTION_WIDTH, 100);

  const title = figma.createText();
  applyFont(title, "heading", "Semi Bold");
  title.characters = "Components";
  title.fontSize = 28;
  title.fills = [solidPaint(0.1)];
  bindFill(title, t.get("foreground"));
  frame.appendChild(title);

  const subtitle = figma.createText();
  applyFont(subtitle, "body", "Regular");
  subtitle.characters = `Starter sheet for ${inputs.presetCode} — every variant and state, bound to the active preset. Each element is a real Figma component you can instance and swap.`;
  subtitle.fontSize = 12;
  subtitle.fills = [solidPaint(0.4)];
  bindFill(subtitle, t.get("muted-foreground"));
  frame.appendChild(subtitle);

  page.appendChild(frame);
  return countDescendants(frame);
}
