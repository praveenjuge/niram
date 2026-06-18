// Materializes the "Tailwind / Primitives" variable collection: numeric and
// string tokens for radius, spacing, typography, etc.

import {
  BLUR_TOKENS,
  BORDER_WIDTH_TOKENS,
  BREAKPOINT_TOKENS,
  CONTAINER_TOKENS,
  DEFAULT_FONT_FAMILY,
  FONT_LEADING_TOKENS,
  FONT_SIZE_TOKENS,
  FONT_STYLE_TOKENS,
  FONT_TRACKING_TOKENS,
  FONT_WEIGHT_TOKENS,
  fontSlugBucket,
  OPACITY_TOKENS,
  PRESET_FONT_FAMILY_MAP,
  RADIUS_TOKENS,
  SKEW_TOKENS,
  SPACING_TOKENS,
  type NumberToken,
} from "../primitives";
import {
  ensureSingleMode,
  getOrCreateCollection,
  getOrCreateVariable,
} from "./collections";
import { COLLECTION_PRIMITIVES } from "./constants";
import type { PrimitiveVariableMap, ResolvedFontFamily } from "./types";

type PrimitivesOpts = {
  fontFamily: ResolvedFontFamily;
};

export async function ensurePrimitivesCollection(
  opts: PrimitivesOpts,
): Promise<PrimitiveVariableMap> {
  const collection = await getOrCreateCollection(COLLECTION_PRIMITIVES);
  ensureSingleMode(collection, "Default");
  const modeId = collection.modes[0]!.modeId;

  const map: PrimitiveVariableMap = new Map();

  // The Tailwind primitive radius scale is fixed: it's a stable reference, not
  // a preset-driven value. The create-preset `--radius` choice lives in the
  // separate `shadcn/radius/*` scale (see generator/theme.ts), which is what
  // components actually bind their corners to.
  await writeNumberGroup(collection, modeId, "radius", RADIUS_TOKENS, map);
  await writeNumberGroup(
    collection,
    modeId,
    "border-width",
    BORDER_WIDTH_TOKENS,
    map,
  );
  await writeNumberGroup(collection, modeId, "opacity", OPACITY_TOKENS, map);
  await writeNumberGroup(collection, modeId, "blur", BLUR_TOKENS, map);
  await writeNumberGroup(collection, modeId, "skew", SKEW_TOKENS, map);
  await writeNumberGroup(
    collection,
    modeId,
    "breakpoint",
    BREAKPOINT_TOKENS,
    map,
  );
  await writeNumberGroup(
    collection,
    modeId,
    "container",
    CONTAINER_TOKENS,
    map,
  );
  await writeNumberGroup(collection, modeId, "spacing", SPACING_TOKENS, map);

  // Font / typography.
  await writeNumberGroup(
    collection,
    modeId,
    "font/size",
    FONT_SIZE_TOKENS,
    map,
  );
  await writeNumberGroup(
    collection,
    modeId,
    "font/weight",
    FONT_WEIGHT_TOKENS,
    map,
  );
  await writeNumberGroup(
    collection,
    modeId,
    "font/tracking",
    FONT_TRACKING_TOKENS,
    map,
  );
  await writeNumberGroup(
    collection,
    modeId,
    "font/leading",
    FONT_LEADING_TOKENS,
    map,
  );

  // Font families: bucket the preset font into sans/serif/mono.
  const families = computeFontFamilies(opts.fontFamily);
  for (const family of families) {
    const name = `font/family/${family.name}`;
    const variable = await getOrCreateVariable(collection, name, "STRING");
    variable.setValueForMode(modeId, family.value);
    map.set(name, variable);
  }

  for (const styleToken of FONT_STYLE_TOKENS) {
    const name = `font/style/${styleToken.name}`;
    const variable = await getOrCreateVariable(collection, name, "STRING");
    variable.setValueForMode(modeId, styleToken.value);
    map.set(name, variable);
  }

  return map;
}

async function writeNumberGroup(
  collection: VariableCollection,
  modeId: string,
  group: string,
  tokens: NumberToken[],
  map: PrimitiveVariableMap,
): Promise<void> {
  for (const token of tokens) {
    const name = `${group}/${token.name}`;
    const variable = await getOrCreateVariable(collection, name, "FLOAT");
    variable.setValueForMode(modeId, token.value);
    map.set(name, variable);
  }
}

function computeFontFamilies(presetFontFamily: ResolvedFontFamily) {
  // Always emit all three buckets; only the selected slug's bucket changes.
  return DEFAULT_FONT_FAMILY.map((token) => {
    if (
      (presetFontFamily.bucket === "sans" && token.name === "sans") ||
      (presetFontFamily.bucket === "serif" && token.name === "serif") ||
      (presetFontFamily.bucket === "mono" && token.name === "mono")
    ) {
      return { name: token.name, value: presetFontFamily.family };
    }
    return token;
  });
}

export function resolveFontFamily(
  slug: string | undefined,
): ResolvedFontFamily {
  if (!slug) return { family: "Inter", bucket: "sans" };
  return {
    family: PRESET_FONT_FAMILY_MAP[slug] ?? "Inter",
    bucket: fontSlugBucket(slug),
  };
}
