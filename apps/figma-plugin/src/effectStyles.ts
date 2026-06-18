// Figma effect styles for the Tailwind shadow + blur scales.
//
// Figma has no "effect variable" type — variables are only COLOR / FLOAT /
// STRING / BOOLEAN — so reusable shadows and blurs live as *effect styles*
// instead. We publish one style per Tailwind token:
//   Shadow/2xs … Shadow/2xl          (drop shadows)
//   Inner Shadow/2xs … Inner Shadow/sm
//   Blur/xs … Blur/3xl               (layer blur)
//   Backdrop Blur/xs … Backdrop Blur/3xl
//
// The Design System and Components pages then reference these styles via
// setEffectStyleIdAsync so a designer edits a shadow once and every node
// using it updates.
//
// Idempotent: pages are rebuilt on every run, but styles are document-level.
// We reuse a style by name and refresh its effects in place rather than
// minting duplicates. Blur styles bind their radius to the matching `blur/*`
// primitive variable so editing the variable reflows the blur everywhere.

import {
  BACKDROP_BLUR_STYLE_SPECS,
  BLUR_STYLE_SPECS,
  INNER_SHADOW_STYLES,
  SHADOW_STYLES,
  type BlurStyleSpec,
  type EffectStyleSpec,
} from "./effects";
import type { PrimitiveVariableMap } from "./generator";

// Lookup from a style name to its Figma style id. Builders call `idFor` to
// reference a style by name (e.g. "Shadow/sm").
export type EffectStyleMap = {
  idFor(name: string): string | undefined;
  readonly count: number;
};

// Build a blur effect carrying its radius, optionally bound to the matching
// primitive variable so the variable drives the style.
function blurEffect(
  spec: BlurStyleSpec,
  primitives: PrimitiveVariableMap | undefined,
): Effect {
  const base: Effect = {
    type: spec.type,
    blurType: "NORMAL",
    radius: spec.radius,
    visible: true,
  } as Effect;

  const variable = primitives
    ? primitives.get(`blur/${spec.tokenName}`)
    : undefined;
  if (!variable) return base;
  return figma.variables.setBoundVariableForEffect(base, "radius", variable);
}

// Ensures every shadow + blur effect style exists and carries up-to-date
// effects, returning a name → id lookup. Call once per page build.
export async function ensureEffectStyles(
  primitives?: PrimitiveVariableMap,
): Promise<EffectStyleMap> {
  const existing = await figma.getLocalEffectStylesAsync();
  const byName = new Map<string, EffectStyle>();
  for (const style of existing) byName.set(style.name, style);

  const ids = new Map<string, string>();

  const ensure = (name: string, effects: Effect[]) => {
    let style = byName.get(name);
    if (!style) {
      style = figma.createEffectStyle();
      style.name = name;
      byName.set(name, style);
    }
    style.effects = effects;
    ids.set(name, style.id);
  };

  const shadowSpecs: EffectStyleSpec[] = [
    ...SHADOW_STYLES,
    ...INNER_SHADOW_STYLES,
  ];
  for (const spec of shadowSpecs) ensure(spec.name, spec.effects);

  const blurSpecs: BlurStyleSpec[] = [
    ...BLUR_STYLE_SPECS,
    ...BACKDROP_BLUR_STYLE_SPECS,
  ];
  for (const spec of blurSpecs) {
    ensure(spec.name, [blurEffect(spec, primitives)]);
  }

  return {
    idFor: (name: string) => ids.get(name),
    count: ids.size,
  };
}

// Apply an effect style to a node by id. Swallows host rejections (some node
// types don't accept effect styles) so callers can stay declarative.
export async function applyEffectStyle(
  node: SceneNode & { setEffectStyleIdAsync(id: string): Promise<void> },
  styleId: string | undefined,
): Promise<void> {
  if (!styleId) return;
  try {
    await node.setEffectStyleIdAsync(styleId);
  } catch {
    // ignore — leaves the node's literal effects in place
  }
}
