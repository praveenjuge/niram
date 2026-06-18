// Public types and shared layout constants for the Components page.

import type {
  PrimitiveVariableMap,
  TailwindColorVarMap,
  ThemeFontVars,
  ThemeVariableMaps,
} from "../generator";
import type { EffectStyleMap } from "../effectStyles";
import type { TextStyleMap } from "../textStyles";
import type { ResolvedFonts } from "../primitives";
import type { IconComponentMap } from "../icons";
import type { RegionProgress } from "../progress";

// Shared with the Design System builder: every Niram surface renders onto one
// page (Design System sections on top, the Components grid below, the Blocks
// region to the right) to stay within Figma Starter/free page limits.
export const PAGE_NAME = "Niram";
export const SECTION_GAP = 32;
// Vertical gutter between the Design System region (built first) and the
// Components grid that this builder appends beneath it.
export const REGION_GAP = 200;
// Max width used for the page header and any wrapping component sets so
// they align visually on the canvas.
export const SECTION_WIDTH = 1120;

export type ComponentsInputs = {
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
  // sections can reference published styles instead of literal effects.
  effectStyles?: EffectStyleMap;
  // Tailwind typography text styles. Populated by the builder when absent so
  // matching text nodes get mapped onto a published style.
  textStyles?: TextStyleMap;
  // The Design System icon showcase's published components, keyed by
  // library-specific icon name. When present, components embed instances of
  // these (swappable icons that stay in sync with the set) instead of baking a
  // one-off vector. Optional so existing callers/tests keep working.
  iconComponents?: IconComponentMap;
  // Reports build + post-processing phase progress (clearing, building each
  // section, applying text styles, binding tokens, layout) for the UI's
  // phase-weighted determinate bar.
  onProgress?: RegionProgress;
};

export type ComponentsResult = { nodeCount: number };

export type SectionBuilder = {
  label: string;
  build: (page: PageNode, inputs: ComponentsInputs) => Promise<number>;
};
