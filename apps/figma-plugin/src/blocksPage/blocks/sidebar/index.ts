// Sidebar block: a single Figma component set named "Sidebar" holding all 16
// shadcn sidebar block layouts (https://ui.shadcn.com/blocks/sidebar) as
// variants (Variant=sidebar-01 … Variant=sidebar-16). Each rail is rebuilt from
// the radix-nova Sidebar primitives (see ./primitives.ts) at the requested
// fixed 982px height, so a designer flips between the 16 layouts from Figma's
// variant switcher.
//
// Unlike the auth/dashboard blocks, the sidebar variants are drawn from scratch
// rather than instancing other page components: shadcn's sidebars are a
// self-contained composition (SidebarMenuButton / SidebarMenuSub / etc.) with
// no Components-page equivalent to reuse. The set is wrapped in a bordered card
// pinned to the full block-canvas width so the 16 rails wrap into a roomy grid
// alongside the other blocks.

import { styleComponentSet } from "../../../componentsPage/layout";
import { countDescendants } from "../../utils";
import type { BlocksInputs } from "../../types";
import { SIDEBAR_VARIANTS } from "./variants";
import { slotifyMenus } from "./primitives";

// The set spans the full block-canvas width (1512) rather than the narrower
// component-grid SECTION_WIDTH (1120), so the 16 rails have room to wrap.
const SET_WIDTH = 1512;

export async function addSidebarBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const components: ComponentNode[] = [];

  for (const variant of SIDEBAR_VARIANTS) {
    const comp = variant.build(inputs);
    // Figma's variant convention: `Prop=value`. One property ("Variant").
    comp.name = `Variant=${variant.key}`;
    // Wrap each SidebarMenu's items in a slot so designers can recompose the
    // menus from an instance without detaching the rail.
    slotifyMenus(comp);
    // Components must live in the document before combineAsVariants; park them
    // on the page, then the combine call reparents them into the set.
    page.appendChild(comp);
    components.push(comp);
    // Yield periodically so the UI stays responsive across the 16 rails.
    await Promise.resolve();
  }

  const set = figma.combineAsVariants(components, page);
  set.name = "Sidebar";
  set.layoutMode = "HORIZONTAL";
  set.layoutWrap = "WRAP";
  set.itemSpacing = 32;
  set.counterAxisSpacing = 32;
  styleComponentSet(set);

  // styleComponentSet pins the set to the component-grid SECTION_WIDTH (1120);
  // widen it to the full block-canvas width and let the height keep hugging.
  set.resize(SET_WIDTH, set.height || 1);
  set.counterAxisSizingMode = "AUTO";

  return countDescendants(set);
}
