// Curated list of named shadcn presets surfaced as badges in the UI.
// Codes mirror shadcn's encodePreset() output for the configs in
// shadcn-ui/packages/shadcn/src/preset/defaults.ts. Verified by re-running
// the encode logic on each config; keep this list in sync if shadcn changes
// the named-preset configs upstream.

export type PopularPreset = {
  name: string;
  code: string;
  description: string;
};

export const POPULAR_PRESETS: PopularPreset[] = [
  { name: "Nova", code: "b2fA", description: "Lucide / Geist" },
  { name: "Vega", code: "bIkeymG", description: "Lucide / Inter" },
  { name: "Maia", code: "bbVKFP6", description: "Hugeicons / Figtree" },
  { name: "Lyra", code: "buFznsW", description: "Phosphor / JetBrains Mono" },
  { name: "Mira", code: "b1D0eCA4", description: "Hugeicons / Inter" },
  { name: "Luma", code: "b1VlIttI", description: "Lucide / Inter" },
  {
    name: "Sera",
    code: "b4xFeBLg4O",
    description: "Lucide / Noto Sans + Playfair Display",
  },
  { name: "Rhea", code: "b27GcrRo", description: "Lucide / Inter" },
];
