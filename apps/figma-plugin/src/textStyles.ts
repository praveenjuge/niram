// Figma text styles for the Tailwind typography scale.
//
// Tailwind pairs every font-size utility (`text-xs` … `text-9xl`) with a
// default line-height, and a weight is layered on top (`font-thin` …
// `font-black`). We publish one Figma *text style* per (size, weight) pair so a
// designer can apply "text-sm / medium" with a click and edit it once:
//
//   text-xs/thin … text-xs/black     (12 / 16)
//   text-sm/thin … text-sm/black     (14 / 20)
//   …
//   text-9xl/thin … text-9xl/black   (128 / 128)
//
// The slash groups them in Figma's style picker exactly like the screenshot:
// a `text-xs` folder containing `thin`, `extralight`, … `black`.
//
// Each style binds its fields to the matching primitive/theme variables so the
// scale stays driven by the variables the generator created:
//   - fontSize    → `font/size/<size>`              (Tailwind / Primitives)
//   - lineHeight  → `font/leading/<n>` when a token matches, else
//                   `font/size/<size>` (Tailwind's `line-height: 1` sizes)
//   - fontFamily  → the preset body font variable    (shadcn / Theme)
//   - fontWeight  → `font/weight/<weight>`           (Tailwind / Primitives)
//
// Idempotent like effectStyles: pages rebuild every run, but styles are
// document-level, so we reuse a style by name and refresh it in place rather
// than minting duplicates.

import { yieldToUi } from "./async";
import { getActiveFonts, resolveBodyFont, weightStyleName } from "./fonts";
import type { PrimitiveVariableMap, ThemeFontVars } from "./generator";
import {
  FONT_LEADING_TOKENS,
  FONT_SIZE_TOKENS,
  FONT_WEIGHT_TOKENS,
  type NumberToken,
} from "./primitives";

// Lookup from a style name (e.g. "text-sm/medium") to its Figma style id.
export type TextStyleMap = {
  idFor(name: string): string | undefined;
  // Resolve the style for a font-size value (px) + a weight value (100–900).
  // Returns undefined when the size/weight is outside the Tailwind scale.
  idForMetrics(fontSize: number, weight: number): string | undefined;
  // The font families these styles actually resolved to (the preset body
  // family plus any Inter fallback). Used to gate the application sweep so a
  // body-font text style is never applied to a heading node using a different
  // family.
  appliesToFamily(family: string): boolean;
  readonly count: number;
};

// Tailwind's size → default line-height pairing, expressed against the
// `font/leading/*` tokens (px values: leading/4 = 16, /5 = 20, …, /10 = 40).
// The large display sizes use Tailwind's `line-height: 1`, so they have no
// leading token — their line height tracks the font size variable instead.
const SIZE_LEADING: Record<string, string | null> = {
  xs: "4", // 12 / 16
  sm: "5", // 14 / 20
  base: "6", // 16 / 24
  lg: "7", // 18 / 28
  xl: "7", // 20 / 28
  "2xl": "8", // 24 / 32
  "3xl": "9", // 30 / 36
  "4xl": "10", // 36 / 40
  "5xl": null, // 48 / 48  (line-height: 1)
  "6xl": null, // 60 / 60
  "7xl": null, // 72 / 72
  "8xl": null, // 96 / 96
  "9xl": null, // 128 / 128
};

const LEADING_BY_NAME = new Map<string, number>(
  FONT_LEADING_TOKENS.map((t) => [t.name, t.value]),
);

// Reverse lookups so the application sweep can map a node's literal fontSize +
// resolved weight back to the right style.
const SIZE_BY_VALUE = new Map<number, NumberToken>();
for (const token of FONT_SIZE_TOKENS) {
  if (!SIZE_BY_VALUE.has(token.value)) SIZE_BY_VALUE.set(token.value, token);
}
const WEIGHT_BY_VALUE = new Map<number, NumberToken>();
for (const token of FONT_WEIGHT_TOKENS) {
  if (!WEIGHT_BY_VALUE.has(token.value))
    WEIGHT_BY_VALUE.set(token.value, token);
}

export function textStyleName(sizeName: string, weightName: string): string {
  return `text-${sizeName}/${weightName}`;
}

// Read the existing Tailwind text styles without changing their metrics or
// bindings. Used by selective replacement when Theme & tokens is unchecked.
export async function readTextStyles(): Promise<TextStyleMap> {
  const existing = await figma.getLocalTextStylesAsync();
  const ids = new Map<string, string>();
  const families = new Set<string>();
  for (const style of existing) {
    ids.set(style.name, style.id);
    families.add(style.fontName.family);
  }

  return {
    idFor: (name: string) => ids.get(name),
    idForMetrics: (fontSize: number, weight: number) => {
      const size = SIZE_BY_VALUE.get(fontSize);
      const w = WEIGHT_BY_VALUE.get(weight);
      if (!size || !w) return undefined;
      return ids.get(textStyleName(size.name, w.name));
    },
    appliesToFamily: (family: string) => families.has(family),
    count: ids.size,
  };
}

// Ensure every (size, weight) text style exists, carries the Tailwind metrics,
// and binds to the matching variables. Returns a name → id lookup. Call once
// per generation run (styles are document-level and reused across pages).
export async function ensureTextStyles(
  primitives?: PrimitiveVariableMap,
  fontVars?: ThemeFontVars,
): Promise<TextStyleMap> {
  const existing = await figma.getLocalTextStylesAsync();
  const byName = new Map<string, TextStyle>();
  for (const style of existing) byName.set(style.name, style);

  const ids = new Map<string, string>();
  const bodyVar = fontVars && fontVars.body ? fontVars.body : undefined;
  const context = getActiveFonts();
  // The families the styles actually resolved to, so the application sweep can
  // avoid retagging a heading node (different family) with a body-font style.
  const families = new Set<string>();

  const bind = (
    style: TextStyle,
    field: string,
    variable: Variable | undefined,
  ) => {
    if (!variable) return;
    try {
      style.setBoundVariable(field as VariableBindableTextField, variable);
    } catch {
      // Some hosts/families reject a given binding — keep the literal value.
    }
  };

  for (const size of FONT_SIZE_TOKENS) {
    const leadingName = SIZE_LEADING[size.name];
    // line-height in px: the paired leading token, or the size itself (1×).
    const lineHeightPx =
      leadingName !== null && leadingName !== undefined
        ? (LEADING_BY_NAME.get(leadingName) ?? size.value)
        : size.value;

    const sizeVar = primitives
      ? primitives.get(`font/size/${size.name}`)
      : undefined;
    const leadingVar =
      primitives && leadingName !== null && leadingName !== undefined
        ? primitives.get(`font/leading/${leadingName}`)
        : sizeVar;

    for (const weight of FONT_WEIGHT_TOKENS) {
      const name = textStyleName(size.name, weight.name);
      const styleName = weightStyleName(weight.value);

      let style = byName.get(name);
      if (!style) {
        style = figma.createTextStyle();
        style.name = name;
        byName.set(name, style);
      }

      // Resolve the preset body font at this weight (falls back to Inter), so
      // setting the metrics never throws on an unloaded font.
      const resolved = resolveBodyFont(styleName, context);
      style.fontName = resolved.fontName;
      families.add(resolved.fontName.family);
      style.fontSize = size.value;
      style.lineHeight = { unit: "PIXELS", value: lineHeightPx };

      // Bind every field that has a backing variable.
      bind(style, "fontSize", sizeVar);
      bind(style, "lineHeight", leadingVar);
      bind(style, "fontFamily", resolved.familyVar ?? bodyVar);
      bind(
        style,
        "fontWeight",
        primitives ? primitives.get(`font/weight/${weight.name}`) : undefined,
      );

      ids.set(name, style.id);
    }
  }

  const idForMetrics = (fontSize: number, weight: number) => {
    const size = SIZE_BY_VALUE.get(fontSize);
    const w = WEIGHT_BY_VALUE.get(weight);
    if (!size || !w) return undefined;
    return ids.get(textStyleName(size.name, w.name));
  };

  return {
    idFor: (name: string) => ids.get(name),
    idForMetrics,
    appliesToFamily: (family: string) => families.has(family),
    count: ids.size,
  };
}

// Map the Figma/Inter named style ("Regular", "Semi Bold", …) back to a
// numeric weight so the application sweep can resolve a node's font to a token.
const WEIGHT_BY_STYLE_NAME = new Map<string, number>();
for (const token of FONT_WEIGHT_TOKENS) {
  WEIGHT_BY_STYLE_NAME.set(weightStyleName(token.value), token.value);
}

function textNodeWeight(node: SceneNode): number | undefined {
  const fontName = (node as unknown as { fontName?: unknown }).fontName;
  if (
    fontName &&
    typeof fontName === "object" &&
    typeof (fontName as { style?: unknown }).style === "string"
  ) {
    return WEIGHT_BY_STYLE_NAME.get((fontName as { style: string }).style);
  }
  return undefined;
}

// The font family a text node currently uses, if it carries a concrete
// fontName (not figma.mixed across runs of mixed styling).
function textNodeFamily(node: SceneNode): string | undefined {
  const fontName = (node as unknown as { fontName?: unknown }).fontName;
  if (
    fontName &&
    typeof fontName === "object" &&
    typeof (fontName as { family?: unknown }).family === "string"
  ) {
    return (fontName as { family: string }).family;
  }
  return undefined;
}

// A text node carries an explicit pixel line height / letter spacing only when
// a builder deliberately set one (the typography leading + tracking demos).
// Applying a text style would overwrite those, so we leave such nodes alone.
function hasPixelOverride(node: SceneNode, field: string): boolean {
  const value = (node as unknown as Record<string, unknown>)[field];
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as { unit?: unknown }).unit === "PIXELS",
  );
}

// Resolve the published style id a text node should carry, or undefined when
// the node isn't eligible: off-scale metrics, a deliberate pixel override, a
// family the styles don't cover, or a node that already references the target
// style (re-runs shouldn't re-await a host call to arrive where it already is).
// Pure sync reads so the collection phase of a sweep stays cheap.
function textStyleTarget(
  node: SceneNode,
  styles: TextStyleMap,
): string | undefined {
  if (node.type !== "TEXT") return undefined;
  if (hasPixelOverride(node, "lineHeight")) return undefined;
  if (hasPixelOverride(node, "letterSpacing")) return undefined;

  // A text style sets the font family too. Only map a node that already uses
  // one of the families the styles resolved to, so a heading node on a
  // distinct heading font is never silently retagged to the body font.
  const family = textNodeFamily(node);
  if (family === undefined || !styles.appliesToFamily(family)) return undefined;

  const fontSize = (node as unknown as { fontSize?: unknown }).fontSize;
  if (typeof fontSize !== "number") return undefined;
  const weight = textNodeWeight(node);
  if (weight === undefined) return undefined;

  const id = styles.idForMetrics(fontSize, weight);
  if (!id) return undefined;

  const current = (node as unknown as { textStyleId?: unknown }).textStyleId;
  if (typeof current === "string" && current === id) return undefined;
  return id;
}

async function setTextStyleId(node: SceneNode, id: string): Promise<void> {
  const setter = (
    node as unknown as { setTextStyleIdAsync?: (id: string) => Promise<void> }
  ).setTextStyleIdAsync;
  if (typeof setter !== "function") return;
  try {
    await setter.call(node, id);
  } catch {
    // The host rejected the style id — keep the node's literal type.
  }
}

// Apply the matching text style to a single text node, when its fontSize +
// weight land on the Tailwind scale and it carries no deliberate metric
// override. Best-effort: host rejections are swallowed.
async function applyTextStyleToNode(
  node: SceneNode,
  styles: TextStyleMap,
): Promise<void> {
  const id = textStyleTarget(node, styles);
  if (id === undefined) return;
  await setTextStyleId(node, id);
}

// Walk a node subtree and map every eligible text node onto a published text
// style. Run once per page after the section builders finish (and before the
// primitive token sweep, which then skips text metrics the style now owns).
// Instance subtrees are skipped: Figma locks them to the source component, so
// styling their text would only burn a host round trip on a guaranteed throw.
export async function applyTextStyles(
  root: SceneNode,
  styles: TextStyleMap,
): Promise<void> {
  await applyTextStyleToNode(root, styles);
  if (root.type === "INSTANCE") return;
  const children = (root as unknown as { children?: SceneNode[] }).children;
  if (children) {
    for (const child of children) await applyTextStyles(child, styles);
  }
}

// How many text nodes a sweep applies between UI yields. Small enough that the
// progress bar keeps moving through multi-thousand-node regions, large enough
// that the macrotask hop cost stays negligible.
const TEXT_STYLE_CHUNK = 40;

type StyleTarget = { node: SceneNode; styleId: string };

// Flatten a region's eligible text nodes up front (cheap sync reads only), so
// the application pass can report honest done/total progress per small chunk
// instead of one opaque step per top-level section frame.
function collectStyleTargets(
  nodes: SceneNode[],
  styles: TextStyleMap,
): StyleTarget[] {
  const targets: StyleTarget[] = [];
  const visit = (node: SceneNode): void => {
    if (node.type === "TEXT") {
      const styleId = textStyleTarget(node, styles);
      if (styleId !== undefined) targets.push({ node, styleId });
      return;
    }
    if (node.type === "INSTANCE") return;
    const children = (node as unknown as { children?: SceneNode[] }).children;
    if (children) {
      for (const child of children) visit(child);
    }
  };
  for (const node of nodes) visit(node);
  return targets;
}

// Apply the matching text style to every eligible text node under `nodes`,
// yielding to the UI every chunk so a long sweep never blocks the event loop
// and posted progress messages actually flush. `onChunk` reports the boundary
// (1-based count, total) so the caller can drive a progress bar.
export async function applyTextStylesChunked(
  nodes: SceneNode[],
  styles: TextStyleMap,
  onChunk?: (done: number, total: number) => void,
): Promise<void> {
  const targets = collectStyleTargets(nodes, styles);
  const total = targets.length;
  onChunk?.(0, total);
  for (let i = 0; i < total; i++) {
    const target = targets[i]!;
    await setTextStyleId(target.node, target.styleId);
    if ((i + 1) % TEXT_STYLE_CHUNK === 0 || i + 1 === total) {
      onChunk?.(i + 1, total);
      await yieldToUi();
    }
  }
}
