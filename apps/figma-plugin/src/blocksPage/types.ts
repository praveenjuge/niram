// Public types and shared layout constants for the Blocks region.
//
// Blocks are pre-composed shadcn layouts (a login screen, a signup screen, a
// dashboard) assembled — wherever possible — from live *instances* of the
// components the Components page already built. Editing a Button variant or the
// Input radius once flows through every block that embeds it.
//
// Figma's free/Starter tier caps a file at 3 pages, so the blocks are rendered
// as a distinct region on the shared `Niram` page (to the right of the
// component grid) rather than on a page of their own.

import type {
  PrimitiveVariableMap,
  TailwindColorVarMap,
  ThemeFontVars,
  ThemeVariableMaps,
} from "../generator";
import type { EffectStyleMap } from "../effectStyles";
import type { TextStyleMap } from "../textStyles";
import type { ResolvedFonts } from "../primitives";
import type { RegionProgress } from "../progress";

// Blocks stack in a single column with generous breathing room between them.
export const BLOCK_GAP = 64;
// Horizontal gap between the two block columns, matching the vertical rhythm so
// the region reads as an even grid (mirrors the Design System page's layout).
export const BLOCK_COLUMN_GAP = 64;
// Horizontal gap between the component grid and the blocks region, so the two
// areas read as clearly separate zones on the same page.
export const REGION_GAP = 200;
// Every block renders on a standard desktop artboard so the screens read as
// real, full-size layouts (and line up as a uniform column in the region).
export const CANVAS_WIDTH = 1512;
export const CANVAS_HEIGHT = 982;
// Width of the blocks region header card — matched to the canvas so the region
// reads as one cohesive column.
export const PAGE_WIDTH = CANVAS_WIDTH;

export type BlocksInputs = {
  presetCode: string;
  presetSummary?: Record<string, string | undefined>;
  primitives: PrimitiveVariableMap;
  tailwindColors: TailwindColorVarMap;
  theme: ThemeVariableMaps;
  // Preset font families + the variables backing them. Optional so existing
  // callers/tests keep working; the builder falls back to Inter when absent.
  fonts?: ResolvedFonts;
  fontVars?: ThemeFontVars;
  // Shadow + blur effect styles. Populated by the builder when absent so
  // blocks can reference published styles instead of literal effects.
  effectStyles?: EffectStyleMap;
  // Tailwind typography text styles. Populated by the builder when absent so
  // matching text nodes get mapped onto a published style.
  textStyles?: TextStyleMap;
  // The page to render the blocks region onto — the Components page. Blocks
  // also search this same page for component sets and standalone components and
  // embed live instances of them (Button, Input, Label, Card, Chart, Table,
  // Sidebar). When the page has no matching components (older callers / tests
  // rendering onto a bare page) each block draws a plain fallback instead.
  targetPage: PageNode;
  // Reports build + post-processing phase progress (clearing, building each
  // block, applying text styles, binding tokens, layout) for the UI's
  // phase-weighted determinate bar.
  onProgress?: RegionProgress;
};

export type BlocksResult = { nodeCount: number };

export type BlockBuilder = {
  label: string;
  // Pins the block to a specific column in the multi-column layout (mirrors
  // the Design System page). The header spans the top of the left column; the
  // blocks below fill the columns: login variants (col 0), signup variants +
  // dashboard (col 1), and the Sidebar variant set in its own column (col 2)
  // so its 16-rail grid has room to breathe. Optional so isolated callers/tests
  // that build a single block don't need to specify it.
  column?: 0 | 1 | 2;
  build: (page: PageNode, inputs: BlocksInputs) => Promise<number>;
};
