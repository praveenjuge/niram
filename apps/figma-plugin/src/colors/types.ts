// Shared color types used across the colors/ module.

export const TAILWIND_COLOR_SCALES = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;

// Order in this array drives the order variables show up in Figma's UI.
// Grays first (it's what designers reach for most often), then the chromatics
// in spectral order. The OKLCH → family lookup is order-independent.
export const TAILWIND_COLOR_FAMILIES = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "mauve",
  "olive",
  "mist",
  "taupe",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;

export type TailwindColorScale = (typeof TAILWIND_COLOR_SCALES)[number];
export type TailwindColorFamily = (typeof TAILWIND_COLOR_FAMILIES)[number];

export type Rgba = { r: number; g: number; b: number; a: number };
