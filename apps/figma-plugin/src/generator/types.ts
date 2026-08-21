// Public types for the generator module.

import type { EffectStyleMap } from "../effectStyles";
import type { TextStyleMap } from "../textStyles";
import type { ResolvedFonts } from "../primitives";
import type { ResolvedRegistry } from "../registry";
import type { ThemingStrategy } from "../theming";

export type GenerateOptions = {
  presetCode: string;
  presetSummary?: Record<string, string | undefined>;
  // Theming strategy for the `shadcn / Theme` collection. Absent keeps the
  // strategy already recorded on an existing collection (or "twins" fresh).
  theming?: { strategy: ThemingStrategy };
};

export type ThemeVariableMaps = {
  // Variables in `shadcn / Theme` keyed by their bare name (e.g. "background")
  // for the light pass, and "dark-<name>" for the dark pass. Under the
  // variable-modes strategy both maps hold the SAME variables (one per role,
  // carrying Light/Dark values); under twins they are distinct variables.
  light: Map<string, Variable>;
  dark: Map<string, Variable>;
  // Present only under the variable-modes strategy: the collection's Light and
  // Dark mode ids, so consumers can pin explicit modes (e.g. the Design System
  // theme swatches rendering both schemes from one variable).
  modeIds?: { light: string; dark: string };
};

export type PrimitiveVariableMap = Map<string, Variable>;

export type TailwindColorVarMap = Map<string, Variable>;

// Role-based font-family variables (live in the `shadcn / Theme` collection).
// `body` is shadcn's `--font-sans`; `heading` is `--font-heading` (which falls
// back to the body font when the preset leaves it as "inherit").
export type ThemeFontVars = {
  body?: Variable;
  heading?: Variable;
};

export type GenerateResult = {
  presetCode: string;
  collections: { name: string; variableCount: number }[];
  fallbackThemeColors: number;
  // The theming strategy the theme collection ended up with, and whether a
  // requested "modes" run had to fall back to twins (tier refused addMode).
  themingStrategy: ThemingStrategy;
  themingFallback: boolean;
  // The resolved family names that back the font variables, so page builders
  // can load the matching fonts before drawing.
  fonts: ResolvedFonts;
  // Published shadow + blur effect styles, so page builders reference the same
  // styles the generator created instead of re-deriving them.
  effectStyles: EffectStyleMap;
  // Published Tailwind typography text styles (one per size × weight), so page
  // builders can map matching text nodes onto them.
  textStyles: TextStyleMap;
  variables: {
    tailwindColors: TailwindColorVarMap;
    primitives: PrimitiveVariableMap;
    theme: ThemeVariableMaps;
    fonts: ThemeFontVars;
    // The preset-driven shadcn radius scale (step name → variable), living in
    // the `shadcn / Theme` collection. Components/blocks bind their corners to
    // these (overlaid onto the primitives map via `withShadcnRadius`) so the
    // create-preset radius choice flows everywhere.
    radiusScale: Map<string, Variable>;
  };
};

export type ResolvedFontFamily = {
  family: string;
  bucket: "sans" | "serif" | "mono";
};

// Re-export ResolvedRegistry so internals can grab it from one path.
export type { ResolvedRegistry };
