// Builds a "Blocks" region: pre-composed shadcn screens (the five login and
// five signup layouts from ui.shadcn.com/blocks, the Sidebar variant set, and a
// dashboard). The auth and dashboard blocks are assembled from live instances
// of the components the Components page already published — editing a component
// once flows through every block (Button, Input, Label, Card, Chart, Table,
// Breadcrumb), the same reuse model the Components page's Form section uses,
// scaled up to whole screens. The Sidebar block is a self-contained component
// set (all 16 shadcn sidebar layouts as variants), drawn from the radix-nova
// sidebar primitives.
//
// Figma's free/Starter tier caps a file at 3 pages, so Niram renders
// everything onto one page named `Niram`: the Design System region on top,
// the Components grid below, and this Blocks region to the right of the grid.
// Idempotency: this builder tags the frames it appends with the `niramRegion`
// plugin-data key (`blocks`) and clears only those on a re-run, leaving the
// Design System and Components regions untouched.

import { addHeader } from "./blocks/header";
import { addLoginBlock } from "./blocks/login";
import { addLoginTwoColumnBlock } from "./blocks/loginTwoColumn";
import { addLoginSocialBlock } from "./blocks/loginSocial";
import { addLoginCardBlock } from "./blocks/loginCard";
import { addLoginEmailBlock } from "./blocks/loginEmail";
import { addSignupBlock } from "./blocks/signup";
import { addSignupTwoColumnBlock } from "./blocks/signupTwoColumn";
import { addSignupSocialBlock } from "./blocks/signupSocial";
import { addSignupCardBlock } from "./blocks/signupCard";
import { addSignupEmailBlock } from "./blocks/signupEmail";
import { addSidebarBlock } from "./blocks/sidebar";
import { addChartBlock } from "./blocks/chart";
import { addDashboardBlock } from "./blocks/dashboard";
import {
  BLOCK_GAP,
  BLOCK_COLUMN_GAP,
  CANVAS_WIDTH,
  REGION_GAP,
  type BlockBuilder,
  type BlocksInputs,
  type BlocksResult,
} from "./types";
import { loadBlocksFonts } from "./utils";
import { applyDocsToSections } from "../componentsPage/docs";
import { ensureEffectStyles } from "../effectStyles";
import { ensureTextStyles, applyTextStylesChunked } from "../textStyles";
import { applyTokenBindingsChunked } from "../tokenBindings";
import { yieldToUi } from "../async";

export type { BlocksInputs, BlocksResult } from "./types";
export {
  BLOCK_MANIFEST,
  SUPPORTED_BLOCK_IDS,
  BLOCK_CANVAS_NAMES,
  SIDEBAR_VARIANT_KEYS,
  blockById,
  type BlockManifestEntry,
  type BlockFamily,
  type BlockNode,
} from "./manifest";

// The blocks render onto the shared Niram page alongside the Design System
// and Components regions. This builder tags the top-level frames it owns with
// this plugin-data key (matching the other builders) so a re-run clears and
// rebuilds only the blocks region, leaving the other regions untouched.
const REGION_KEY = "niramRegion";
const REGION_ID = "blocks";

// The header renders first and pins to the top of the left column; the blocks
// follow in a fixed, curated order laid out across three columns (mirroring the
// Design System page). Login variants stack in the left column, signup variants
// plus the dashboard app shell in the middle column, and the Chart + Sidebar
// component sets share the right column so their wide variant grids have room
// to wrap. The Chart block is built before the Dashboard so the dashboard can
// instance a live chart from it.
const HEADER_BLOCK: BlockBuilder = {
  label: "Header",
  column: 0,
  build: addHeader,
};

const BLOCKS: BlockBuilder[] = [
  { label: "Login", column: 0, build: addLoginBlock },
  { label: "Login (Two Column)", column: 0, build: addLoginTwoColumnBlock },
  { label: "Login (Social)", column: 0, build: addLoginSocialBlock },
  { label: "Login (Card)", column: 0, build: addLoginCardBlock },
  { label: "Login (Email)", column: 0, build: addLoginEmailBlock },
  { label: "Signup", column: 1, build: addSignupBlock },
  { label: "Signup (Two Column)", column: 1, build: addSignupTwoColumnBlock },
  { label: "Signup (Card)", column: 1, build: addSignupSocialBlock },
  { label: "Signup (Split)", column: 1, build: addSignupCardBlock },
  { label: "Signup (Email)", column: 1, build: addSignupEmailBlock },
  { label: "Chart", column: 2, build: addChartBlock },
  { label: "Dashboard", column: 1, build: addDashboardBlock },
  { label: "Sidebar", column: 2, build: addSidebarBlock },
];

const ORDERED_BLOCKS: BlockBuilder[] = [HEADER_BLOCK, ...BLOCKS];

export async function buildBlocksRegion(
  inputs: BlocksInputs,
): Promise<BlocksResult> {
  const page = inputs.targetPage;

  await loadBlocksFonts(inputs);

  // Clear only the blocks frames a previous run tagged, leaving the Design
  // System and Components regions on the shared page untouched. (When the
  // Components builder ran just before us it already cleared its own region;
  // this keeps the blocks region idempotent on its own terms too.)
  inputs.onProgress?.({ phase: "clearing", current: 0, total: 1 });
  for (const node of [...(page.children as SceneNode[])]) {
    if (node.getPluginData(REGION_KEY) === REGION_ID) node.remove();
  }
  inputs.onProgress?.({ phase: "clearing", current: 1, total: 1 });

  // Publish/refresh the shadow + blur effect styles (idempotent) so blocks can
  // reference real styles instead of literal effects.
  const effectStyles =
    inputs.effectStyles ?? (await ensureEffectStyles(inputs.primitives));
  const inputsWithStyles: BlocksInputs = { ...inputs, effectStyles };

  // Publish/refresh the Tailwind typography text styles so matching text nodes
  // can be mapped onto a published style after the build.
  const textStyles =
    inputs.textStyles ??
    (await ensureTextStyles(inputs.primitives, inputs.fontVars));

  // Remember which children already existed (the component grid) so we only
  // sweep + lay out the nodes this region adds, leaving the components alone.
  const preexisting = new Set<SceneNode>(page.children as SceneNode[]);

  const total = ORDERED_BLOCKS.length;
  let count = 0;

  for (let i = 0; i < ORDERED_BLOCKS.length; i++) {
    const block = ORDERED_BLOCKS[i]!;
    inputs.onProgress?.({
      phase: "building",
      current: i,
      total,
      label: block.label,
    });
    count += await block.build(page, inputsWithStyles);
    await yieldToUi();
  }
  inputs.onProgress?.({
    phase: "building",
    current: total,
    total,
    label: "Done",
  });

  const newNodes = (page.children as SceneNode[]).filter(
    (child) => !preexisting.has(child),
  );

  // Tag the frames this run appended so a later re-run clears only this region.
  for (const node of newNodes) node.setPluginData(REGION_KEY, REGION_ID);

  // Attach documentation metadata to the publishable Blocks-region component
  // sets (Chart, Sidebar). The auth/dashboard blocks are compositions of live
  // instances, not standalone publishable components, so the docs pass only
  // matches the two reusable library sets here.
  applyDocsToSections(newNodes as unknown as { type: string }[]);

  // Map eligible text nodes onto their Tailwind text style before the token
  // sweep, so the style owns each node's font size + line height. (Instances
  // embedded from the component grid keep their own styling — the sweep only
  // touches the nodes this region drew.) Chunked so the UI keeps painting.
  await applyTextStylesChunked(newNodes, textStyles, (done, totalNodes) =>
    inputs.onProgress?.({
      phase: "text-styles",
      current: done,
      total: totalNodes,
    }),
  );

  // Bind the remaining non-color primitives (spacing, padding, gaps, border
  // widths, radii, font sizes) wherever a literal matches a token, so later
  // variable edits reflow the blocks instead of leaving frozen literals.
  await applyTokenBindingsChunked(
    newNodes,
    inputs.primitives,
    (done, totalNodes) =>
      inputs.onProgress?.({
        phase: "binding",
        current: done,
        total: totalNodes,
      }),
  );

  inputs.onProgress?.({ phase: "layout", current: 0, total: 1 });
  layoutBlocksRegion(page, preexisting, newNodes);
  inputs.onProgress?.({ phase: "layout", current: 1, total: 1 });
  return { nodeCount: count };
}

// Lay the region's header and blocks out across three columns, placed to the
// right of the existing component grid so the two areas read as clearly
// separate zones on the same page. Each block stays in its assigned column
// (login variants left, signup variants + dashboard middle, the Sidebar variant
// set on the right) and stacks top-to-bottom within it — the same model the
// Design System page uses.
function layoutBlocksRegion(
  page: PageNode,
  preexisting: Set<SceneNode>,
  newNodes: SceneNode[],
) {
  const originX = regionOriginX(page, preexisting);
  // Track the next free y in each column so blocks stack within their column.
  const columnHeights = [0, 0, 0];
  // Every block renders on the full-width canvas, so each column is one canvas
  // wide and successive columns sit a canvas-plus-gap further right.
  const columnStride = CANVAS_WIDTH + BLOCK_COLUMN_GAP;

  // newNodes mirrors ORDERED_BLOCKS order, since each builder appends exactly
  // one top-level frame in sequence. Use that to read each block's column.
  newNodes.forEach((child, index) => {
    if (!("x" in child)) return;
    const node = child as SceneNode & { x: number; y: number; height: number };
    const target = ORDERED_BLOCKS[index]?.column ?? 0;

    node.x = originX + target * columnStride;
    node.y = columnHeights[target]!;
    columnHeights[target] =
      columnHeights[target]! + (node.height ?? 0) + BLOCK_GAP;
  });
}

// The x where the blocks region starts: just past the right edge of the
// existing component grid, plus a wide gutter. Falls back to 0 when the page is
// empty (isolated callers / tests rendering onto a bare page).
function regionOriginX(page: PageNode, preexisting: Set<SceneNode>): number {
  let maxRight = 0;
  let seen = false;
  for (const child of page.children as SceneNode[]) {
    if (!preexisting.has(child)) continue;
    if (!("x" in child)) continue;
    const node = child as SceneNode & { x: number; width: number };
    const right = (node.x ?? 0) + (node.width ?? 0);
    if (right > maxRight) maxRight = right;
    seen = true;
  }
  return seen ? maxRight + REGION_GAP : 0;
}
