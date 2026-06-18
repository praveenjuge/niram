// Overlay the preset-driven shadcn radius scale onto a primitives map.
//
// Components and blocks bind their corners with `primitives.get("radius/<step>")`
// (e.g. `radius/lg`). The Tailwind `radius/*` primitives are a fixed reference
// scale and must NOT change with the preset, so instead of mutating them we
// hand the Components/Blocks builders a map where the preset-scaled steps
// (sm…4xl) resolve to the `shadcn / Theme` radius variables. The structural
// steps (none/xs/full) keep pointing at the fixed Tailwind primitives, matching
// shadcn's `@theme inline` (which never derives those from `--radius`).

import type { PrimitiveVariableMap } from "./types";

export function withShadcnRadius(
  primitives: PrimitiveVariableMap,
  radiusScale: Map<string, Variable>,
): PrimitiveVariableMap {
  if (radiusScale.size === 0) return primitives;
  const merged: PrimitiveVariableMap = new Map(primitives);
  for (const [step, variable] of radiusScale) {
    merged.set(`radius/${step}`, variable);
  }
  return merged;
}
