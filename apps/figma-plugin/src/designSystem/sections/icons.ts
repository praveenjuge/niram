// Icon library showcase: a single component set holding shadcn's curated icon
// subset for the preset's selected icon library (lucide / hugeicons / tabler /
// phosphor / remixicon).
//
// Each icon becomes a 24×24 ComponentNode named `Icon=<name>`; all of them are
// combined into one variant component set (single `Icon` property) so a
// designer can drop an instance and swap icons from the variant dropdown.
//
// The markup is bundled offline in src/data/icons.ts (the sandbox has no
// network). We wrap each icon's inner markup in the library's <svg> tag, feed
// it to figma.createNodeFromSvg, then rebind the resulting vectors' paints to
// the theme `foreground` variable so icons follow the theme.

import { ICON_LIBRARIES, type IconLibraryName } from "../../data/icons";
import { recolorIcon, resolveIconLibrary } from "../../icons";
import { bindStrokeColor } from "../bindings";
import { createDesignSystemContext } from "../context";
import { createSectionFrame, sectionContentWidth } from "../layout";
import { solidPaint } from "../paints";
import type { DesignSystemInputs } from "../types";
import { countDescendants } from "../utils";

const LIBRARY_LABELS: Record<IconLibraryName, string> = {
  lucide: "Lucide",
  hugeicons: "Hugeicons",
  tabler: "Tabler",
  phosphor: "Phosphor",
  remixicon: "Remix Icon",
};

// Per-tile icon size and the grid spacing inside the component set.
const ICON_SIZE = 24;
const GRID_GAP = 16;

// createNodeFromSvg returns a wrapper FRAME (with its own background fill) that
// holds the icon geometry as vector/shape leaves, and resolves `currentColor`
// to a literal black paint. The recolor pass (shared via src/icons.ts) clears
// container background fills and rebinds the shape leaves' paint — stroke for
// the stroke-based libraries (lucide/tabler/hugeicons), fill for the fill-based
// ones (phosphor/remixicon) — to the theme foreground variable.
function buildIconComponent(
  name: string,
  svg: string,
  foreground: Variable | undefined,
): ComponentNode {
  const comp = figma.createComponent();
  comp.name = `Icon=${name}`;
  comp.resize(ICON_SIZE, ICON_SIZE);
  comp.fills = [];
  comp.clipsContent = false;

  const node = figma.createNodeFromSvg(svg);
  node.name = "icon";
  recolorIcon(node, foreground);
  node.x = 0;
  node.y = 0;
  comp.appendChild(node);

  return comp;
}

export async function addIconLibrary(
  page: PageNode,
  inputs: DesignSystemInputs,
): Promise<number> {
  // shadcn's default icon library is lucide; fall back to it when the preset
  // summary doesn't carry a (valid) icon library.
  const libraryName: IconLibraryName = resolveIconLibrary(inputs.presetSummary);

  const library = ICON_LIBRARIES[libraryName];
  const names = Object.keys(library.icons).sort();

  const ctx = createDesignSystemContext(inputs);
  const label = LIBRARY_LABELS[libraryName];
  const section = createSectionFrame(
    "Icons",
    {
      title: "Icons",
      subtitle: `${label} · ${names.length} icons · figma component set`,
    },
    ctx,
  );

  // No icons (shouldn't happen) — emit just the section header.
  if (names.length === 0) {
    page.appendChild(section);
    return countDescendants(section);
  }

  const foreground = inputs.theme.light.get("foreground");

  const components: ComponentNode[] = [];
  for (const name of names) {
    const inner = library.icons[name];
    if (inner === undefined) continue;
    const svg = `${library.svgOpen}${inner}</svg>`;
    const comp = buildIconComponent(name, svg, foreground);
    // Components must live in the document before combineAsVariants; park them
    // on the page, then the combine call reparents them into the set.
    page.appendChild(comp);
    components.push(comp);
    // Yield periodically so the UI stays responsive across the ~150 icons.
    if (components.length % 32 === 0) await Promise.resolve();
  }

  const set = figma.combineAsVariants(components, page);
  set.name = `${label} Icons`;
  set.layoutMode = "HORIZONTAL";
  set.layoutWrap = "WRAP";
  set.itemSpacing = GRID_GAP;
  set.counterAxisSpacing = GRID_GAP;
  set.paddingTop = 16;
  set.paddingBottom = 16;
  set.paddingLeft = 16;
  set.paddingRight = 16;
  set.strokes = [solidPaint(0.9)];
  set.strokeWeight = 1;
  bindStrokeColor(set, ctx.border);
  set.cornerRadius = 12;
  set.primaryAxisSizingMode = "FIXED";
  set.counterAxisSizingMode = "AUTO";

  // Move the finished set into the section card and let it fill the width.
  section.appendChild(set);
  set.layoutSizingHorizontal = "FILL";

  page.appendChild(section);
  return countDescendants(section);
}
