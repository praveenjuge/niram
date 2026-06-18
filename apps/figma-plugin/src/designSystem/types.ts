// Public types and shared layout constants for the Design System page.

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

// Everything Niram generates lives on a single page so the file stays within
// Figma Starter/free page limits. The Design System sections sit at the top,
// the Components grid below, and the Blocks region to the right.
export const PAGE_NAME = "Niram";

// Each section is now its own top-level frame so designers can move them
// independently. The page just lays them out in a vertical stack.
export const SECTION_WIDTH = 1120;
export const SECTION_GAP = 32;

export type DesignSystemInputs = {
  presetCode: string;
  presetSummary?: Record<string, string | undefined>;
  tailwindColors: TailwindColorVarMap;
  primitives: PrimitiveVariableMap;
  theme: ThemeVariableMaps;
  // Preset font families + the variables backing them. Optional so existing
  // callers/tests keep working; the builder falls back to Inter when absent.
  fonts?: ResolvedFonts;
  fontVars?: ThemeFontVars;
  // Shadow + blur effect styles. Populated by the builder when absent so the
  // sections can reference published styles instead of literal effects.
  effectStyles?: EffectStyleMap;
  // Tailwind typography text styles. Populated by the builder when absent so
  // matching text nodes get mapped onto a published style.
  textStyles?: TextStyleMap;
  // Reports build + post-processing phase progress (clearing, building each
  // section, applying text styles, binding tokens, layout) so the UI can show a
  // phase-weighted determinate bar.
  onProgress?: RegionProgress;
};

export type DesignSystemResult = {
  nodeCount: number;
  // The icon showcase's published components, keyed by library-specific icon
  // name. Forwarded to the Components page so component icons can be instances
  // of the same swappable set.
  iconComponents: IconComponentMap;
};

// Each entry corresponds to one top-level section frame on the page. Adding
// a section here also extends the progress total reported to the UI.
// `column` pins the section to a specific column in the two-column layout so
// related sections (e.g. all the color sections) stay grouped together.
export type SectionBuilder = {
  label: string;
  column: 0 | 1;
  build: (page: PageNode, inputs: DesignSystemInputs) => Promise<number>;
};
