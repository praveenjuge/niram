// Effect token tables — the source of truth for the Figma *effect styles*
// niram publishes (drop shadows, inner shadows, layer blur, backdrop blur).
// Values mirror Tailwind v4's defaults so the styles match the rest of the
// generated design system.
//
// This module is pure data (no figma.* calls), so it can be imported from both
// the generator/style layer and the page builders without coupling.

import { BLUR_TOKENS } from "./primitives";

// A named effect style: the style name (as it appears in Figma's effect-style
// picker) plus the literal effects it carries.
export type EffectStyleSpec = { name: string; effects: Effect[] };

// A blur effect style. Carries the matching `blur/<token>` primitive name so
// the style's radius can be bound to the variable when it exists.
export type BlurStyleSpec = {
  name: string;
  tokenName: string;
  radius: number;
  type: "LAYER_BLUR" | "BACKGROUND_BLUR";
};

// Tailwind drop shadows are layered, downward, black-at-low-alpha shadows.
// `y`/`blur`/`spread` are in px; `alpha` is the shadow colour's opacity.
function drop(
  y: number,
  blur: number,
  spread: number,
  alpha: number,
): DropShadowEffect {
  return {
    type: "DROP_SHADOW",
    color: { r: 0, g: 0, b: 0, a: alpha },
    offset: { x: 0, y },
    radius: blur,
    spread,
    visible: true,
    blendMode: "NORMAL",
    showShadowBehindNode: true,
  };
}

function inner(y: number, blur: number, alpha: number): InnerShadowEffect {
  return {
    type: "INNER_SHADOW",
    color: { r: 0, g: 0, b: 0, a: alpha },
    offset: { x: 0, y },
    radius: blur,
    spread: 0,
    visible: true,
    blendMode: "NORMAL",
  };
}

// Drop shadows — mirrors Tailwind v4 `--shadow-*`.
export const SHADOW_STYLES: EffectStyleSpec[] = [
  { name: "Shadow/2xs", effects: [drop(1, 0, 0, 0.05)] },
  { name: "Shadow/xs", effects: [drop(1, 2, 0, 0.05)] },
  {
    name: "Shadow/sm",
    effects: [drop(1, 3, 0, 0.1), drop(1, 2, -1, 0.1)],
  },
  {
    name: "Shadow/md",
    effects: [drop(4, 6, -1, 0.1), drop(2, 4, -2, 0.1)],
  },
  {
    name: "Shadow/lg",
    effects: [drop(10, 15, -3, 0.1), drop(4, 6, -4, 0.1)],
  },
  {
    name: "Shadow/xl",
    effects: [drop(20, 25, -5, 0.1), drop(8, 10, -6, 0.1)],
  },
  { name: "Shadow/2xl", effects: [drop(25, 50, -12, 0.25)] },
];

// Inner shadows — mirrors Tailwind v4 `--inset-shadow-*`.
export const INNER_SHADOW_STYLES: EffectStyleSpec[] = [
  { name: "Inner Shadow/2xs", effects: [inner(1, 0, 0.05)] },
  { name: "Inner Shadow/xs", effects: [inner(1, 1, 0.05)] },
  { name: "Inner Shadow/sm", effects: [inner(2, 4, 0.05)] },
];

// Layer + backdrop blur — mirrors Tailwind `--blur-*` / `backdrop-blur-*`.
// The `none` token (radius 0) is omitted: a zero-radius blur is not a useful
// reusable style.
const BLURRABLE_TOKENS = BLUR_TOKENS.filter((token) => token.value > 0);

export const BLUR_STYLE_SPECS: BlurStyleSpec[] = BLURRABLE_TOKENS.map(
  (token) => ({
    name: `Blur/${token.name}`,
    tokenName: token.name,
    radius: token.value,
    type: "LAYER_BLUR",
  }),
);

export const BACKDROP_BLUR_STYLE_SPECS: BlurStyleSpec[] = BLURRABLE_TOKENS.map(
  (token) => ({
    name: `Backdrop Blur/${token.name}`,
    tokenName: token.name,
    radius: token.value,
    type: "BACKGROUND_BLUR",
  }),
);
