// Builds the "Design System" region of the shared `Niram` page: it visualizes
// every variable produced by the generator — theme colors (light + dark),
// Tailwind palette, typography, radius, spacing, opacity, blur, border widths,
// and shadows. This builder owns the page (creates it, and on a re-run clears
// only the section frames it previously tagged); the Components grid and Blocks
// region are appended afterwards by their own builders.
//
// All visual nodes bind to the corresponding Figma variables, so any later
// edit to the variables flows through the page.

import { addBlurAndBackdrop } from "./sections/blur";
import { addBorderWidthScale } from "./sections/borderWidth";
import { addBoxShadows } from "./sections/boxShadow";
import { addHeader } from "./sections/header";
import { addIconLibrary } from "./sections/icons";
import { addOpacityScale } from "./sections/opacity";
import { addRadiusScale } from "./sections/radius";
import { addSpacingScale } from "./sections/spacing";
import { addTailwindPalette } from "./sections/tailwindPalette";
import { addThemeSection } from "./sections/theme";
import { addTypography } from "./sections/typography";
import {
  PAGE_NAME,
  SECTION_GAP,
  SECTION_WIDTH,
  type DesignSystemInputs,
  type DesignSystemResult,
  type SectionBuilder,
} from "./types";
import { loadDesignSystemFonts } from "./utils";
import { ensureEffectStyles } from "../effectStyles";
import { ensureTextStyles, applyTextStylesChunked } from "../textStyles";
import { applyTokenBindingsChunked } from "../tokenBindings";
import { collectIconComponents } from "../icons";
import { yieldToUi } from "../async";

export type { DesignSystemInputs, DesignSystemResult } from "./types";

// Everything Niram generates shares one page (Figma Starter/free files cap at
// 3 pages). Each builder tags the top-level frames it owns with this plugin-data
// key so re-runs clear and rebuild only their own region, leaving the other
// regions on the page untouched and the whole flow order-independent.
const REGION_KEY = "niramRegion";
const REGION_ID = "design-system";

const SECTIONS: SectionBuilder[] = [
  // Left column: the color-related sections, grouped together.
  { label: "Header", column: 0, build: addHeader },
  { label: "Theme", column: 0, build: addThemeSection },
  { label: "Tailwind palette", column: 0, build: addTailwindPalette },
  { label: "Spacing scale", column: 0, build: addSpacingScale },
  { label: "Icons", column: 0, build: addIconLibrary },
  // Right column: the non-color scales and tokens.
  { label: "Border radius", column: 1, build: addRadiusScale },
  { label: "Border widths", column: 1, build: addBorderWidthScale },
  { label: "Box shadows", column: 1, build: addBoxShadows },
  { label: "Blur & backdrop", column: 1, build: addBlurAndBackdrop },
  { label: "Opacity scale", column: 1, build: addOpacityScale },
  // Typography last — its many subsections make it the tallest panel and
  // having it at the bottom keeps the rest of the page scannable.
  { label: "Typography", column: 1, build: addTypography },
];

export async function buildDesignSystem(
  inputs: DesignSystemInputs,
): Promise<DesignSystemResult> {
  // The "dynamic-page" manifest setting requires us to load all pages before
  // we can search for an existing page by name.
  await figma.loadAllPagesAsync();

  // Reset (or create) the shared Niram page. The Design System builder runs
  // first and owns page creation; on a re-run it clears only the section frames
  // it previously tagged, leaving any Components/Blocks regions intact until
  // their own builders rebuild them.
  let page = figma.root.children.find(
    (child) => child.type === "PAGE" && child.name === PAGE_NAME,
  ) as PageNode | undefined;

  if (page) {
    inputs.onProgress?.({ phase: "clearing", current: 0, total: 1 });
    for (const node of [...page.children]) {
      if (node.getPluginData(REGION_KEY) === REGION_ID) node.remove();
    }
    inputs.onProgress?.({ phase: "clearing", current: 1, total: 1 });
  } else {
    page = figma.createPage();
    page.name = PAGE_NAME;
  }

  // Load the preset's body + heading fonts (plus the Inter fallback) and make
  // them the active context so every section can apply them. Figma falls back
  // gracefully on machines that don't have a given family.
  await loadDesignSystemFonts(inputs);

  // Publish the shadow + blur effect styles (idempotent) so the shadow and
  // blur sections can reference real styles instead of baking literal effects.
  // Blur radii bind to the matching `blur/*` primitive variables.
  const effectStyles =
    inputs.effectStyles ?? (await ensureEffectStyles(inputs.primitives));
  const inputsWithStyles: DesignSystemInputs = { ...inputs, effectStyles };

  // Publish/refresh the Tailwind typography text styles so matching text nodes
  // can be mapped onto a published style after the sections are built.
  const textStyles =
    inputs.textStyles ??
    (await ensureTextStyles(inputs.primitives, inputs.fontVars));

  const total = SECTIONS.length;
  let count = 0;

  // Remember which top-level frames already existed (other regions) so we tag,
  // sweep, and lay out only the section frames this run appends.
  const preexisting = new Set<SceneNode>(page.children as SceneNode[]);

  for (let i = 0; i < SECTIONS.length; i++) {
    const section = SECTIONS[i]!;
    inputs.onProgress?.({
      phase: "building",
      current: i,
      total,
      label: section.label,
    });
    count += await section.build(page, inputsWithStyles);
    // Yield to the event loop so the UI can paint between sections.
    await yieldToUi();
  }
  inputs.onProgress?.({
    phase: "building",
    current: total,
    total,
    label: "Done",
  });

  // The frames this run appended, in SECTIONS order (each builder appends
  // exactly one top-level frame in sequence). Tag them so a later re-run clears
  // only this region.
  const sectionNodes = (page.children as SceneNode[]).filter(
    (child) => !preexisting.has(child),
  );
  for (const node of sectionNodes) node.setPluginData(REGION_KEY, REGION_ID);

  // Map every eligible text node onto its Tailwind text style first, so the
  // style owns the node's font size + line height. The token sweep below then
  // skips those fields (a node with a text style needs no literal bindings).
  // Chunked so the UI keeps painting through this post-build sweep.
  await applyTextStylesChunked(sectionNodes, textStyles, (done, totalNodes) =>
    inputs.onProgress?.({
      phase: "text-styles",
      current: done,
      total: totalNodes,
    }),
  );

  // Bind the remaining non-color primitives (spacing, padding, gaps, border
  // widths, radii, font sizes) wherever a literal matches a token, so later
  // variable edits reflow the page instead of leaving frozen literals.
  await applyTokenBindingsChunked(
    sectionNodes,
    inputs.primitives,
    (done, totalNodes) =>
      inputs.onProgress?.({
        phase: "binding",
        current: done,
        total: totalNodes,
      }),
  );

  // Lay out the section frames across two columns, keeping each section in
  // its assigned column (all color sections stay together).
  inputs.onProgress?.({ phase: "layout", current: 0, total: 1 });
  layoutSectionsInColumns(sectionNodes);
  inputs.onProgress?.({ phase: "layout", current: 1, total: 1 });

  // Move the user to the page and frame the result.
  await figma.setCurrentPageAsync(page);
  if (sectionNodes.length > 0) {
    page.selection = [sectionNodes[0]!];
    figma.viewport.scrollAndZoomIntoView(page.children as SceneNode[]);
  }

  // Collect the icon showcase's components so the Components page can embed
  // instances of them (swappable icons that stay in sync with the set).
  const iconComponents = collectIconComponents(page as unknown as SceneNode);

  return { nodeCount: count, iconComponents };
}

// Lay this region's section frames out across two columns, keeping each section
// in its assigned column (all color sections stay together). `sectionNodes`
// mirrors the SECTIONS order, so its index maps to each section's pinned column.
function layoutSectionsInColumns(sectionNodes: SceneNode[]) {
  const COLUMN_COUNT = 2;
  // Track the running height (next free y) of each column so sections stack
  // top-to-bottom within their assigned column.
  const columnHeights = new Array<number>(COLUMN_COUNT).fill(0);

  sectionNodes.forEach((child, index) => {
    if (!("x" in child)) return;
    const node = child as SceneNode & {
      x: number;
      y: number;
      height: number;
    };

    const target = SECTIONS[index]?.column ?? 0;

    node.x = target * (SECTION_WIDTH + SECTION_GAP);
    node.y = columnHeights[target]!;

    const height = node.height ?? 0;
    columnHeights[target] = columnHeights[target]! + height + SECTION_GAP;
  });
}
