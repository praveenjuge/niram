// Turns each repeated menu area inside a Sidebar template into a native Figma
// slot, so instance users can add, remove, and reorder rows without detaching.

import { createConfiguredSlot } from "../../../componentsPage/properties";
import { findInstanceSource } from "../../../componentsPage/utils";
import type { BlocksInputs } from "../../types";
import { fillW } from "./primitives";

type PreferredValue = { type: "COMPONENT_SET"; key: string };

export function slotifyMenus(comp: ComponentNode, inputs: BlocksInputs): void {
  const menus: FrameNode[] = [];
  const visit = (node: { children?: readonly SceneNode[] }) => {
    const children = node.children;
    if (!children) return;
    for (const child of children) {
      if (child.type === "FRAME" && child.name === "Menu") {
        menus.push(child as FrameNode);
      }
      visit(child as unknown as { children?: readonly SceneNode[] });
    }
  };
  visit(comp as unknown as { children?: readonly SceneNode[] });

  const preferredValues = menuButtonPreferredValues(inputs);
  let index = 0;
  for (const menu of menus) {
    const items = [...menu.children];
    if (items.length === 0) continue;
    index += 1;
    const slot = createConfiguredSlot(comp, `Menu Items ${index}`, items, {
      description: "Sidebar menu items.",
      settings: { minChildren: 1, stretchChildOnInsert: true },
      preferredValues,
    });
    menu.appendChild(slot);
    slot.layoutMode = "VERTICAL";
    slot.primaryAxisSizingMode = "AUTO";
    slot.counterAxisSizingMode = "FIXED";
    slot.itemSpacing = menu.itemSpacing;
    slot.fills = [];
    slot.strokes = [];
    fillW(slot);
    for (const item of items) fillW(item);
  }
}

function menuButtonPreferredValues(
  inputs: BlocksInputs,
): ReadonlyArray<PreferredValue> | undefined {
  const page = inputs.targetPage;
  if (!page) return undefined;
  const variant = findInstanceSource(
    page as unknown as SceneNode,
    "Sidebar Menu Button",
  );
  const parent = variant?.parent as
    | { type?: string; key?: string }
    | null
    | undefined;
  return parent?.type === "COMPONENT_SET" && parent.key
    ? [{ type: "COMPONENT_SET", key: parent.key }]
    : undefined;
}
