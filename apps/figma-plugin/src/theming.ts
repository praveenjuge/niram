// Theming-strategy contract shared by the iframe UI, the sandbox, and the
// generator. Kept pure and dependency-free so every layer can import it.

// How light/dark values are materialized in the `shadcn / Theme` collection:
//
// - "twins" (default): a single collection mode; dark values live in separate
//   "dark-<key>" variables. Works on every Figma plan.
// - "modes": real Figma variable modes ("Light" + "Dark") holding per-mode
//   values on one unprefixed variable per role. Requires a paid plan
//   (Professional+); the generator falls back to twins when the file's tier
//   refuses `addMode`.
export type ThemingStrategy = "twins" | "modes";

export function normalizeThemingStrategy(value: unknown): ThemingStrategy | null {
  return value === "twins" || value === "modes" ? value : null;
}

// Human-readable labels for confirmation copy and warnings.
export function describeThemingStrategy(strategy: ThemingStrategy): string {
  return strategy === "modes" ? "variable modes" : "twin variables";
}
