// Post-process pass that binds the *non-color* primitive variables (spacing,
// padding, gaps, border widths, corner radii, sizes, opacity, line height,
// letter spacing, blur radii, font sizes) to the nodes the Design System and
// Components pages build.
//
// The section builders set literal pixel values first (so the canvas looks
// right even before a variable resolves) and explicitly bind the handful of
// fields that need precise control (theme color fills, per-size font sizes,
// corner radii). This pass then sweeps the finished tree and binds every
// *remaining* field whose literal value matches a primitive token, so a later
// edit to e.g. `spacing/4` reflows padding, gaps, and sizes across the
// generated pages instead of leaving them frozen as literals.
//
// It is deliberately conservative:
//   - only binds a field when its literal exactly matches a token value,
//   - never overrides a field a builder already bound,
//   - skips zero values (binding everything to `spacing/0` would be noise),
//   - skips width/height on the *hug* axis of an auto-layout frame so binding
//     a size variable never flips a hugging frame to a fixed width/height,
//   - swallows bindings the host rejects (e.g. padding on a non-auto-layout
//     frame), so it can run over the whole tree without per-node guards.

import {
  BLUR_TOKENS,
  BORDER_WIDTH_TOKENS,
  CONTAINER_TOKENS,
  FONT_LEADING_TOKENS,
  FONT_SIZE_TOKENS,
  FONT_TRACKING_TOKENS,
  OPACITY_TOKENS,
  RADIUS_TOKENS,
  SPACING_TOKENS,
  type NumberToken,
} from "./primitives";
import { yieldToUi } from "./async";

type VarMap = Map<string, Variable>;

// A token source: the value→name lookup plus the primitive group it lives in
// (e.g. `spacing`, so the resolved key is `spacing/<name>`).
type TokenSource = { lookup: Map<number, string>; group: string };

// Reverse a token table into value → name. The first token wins when two
// share a value, which never happens within a single table.
function byValue(tokens: NumberToken[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const token of tokens) {
    if (!map.has(token.value)) map.set(token.value, token.name);
  }
  return map;
}

const SPACING_BY_VALUE = byValue(SPACING_TOKENS);
const BORDER_WIDTH_BY_VALUE = byValue(BORDER_WIDTH_TOKENS);
const RADIUS_BY_VALUE = byValue(RADIUS_TOKENS);
const FONT_SIZE_BY_VALUE = byValue(FONT_SIZE_TOKENS);
const CONTAINER_BY_VALUE = byValue(CONTAINER_TOKENS);
const LEADING_BY_VALUE = byValue(FONT_LEADING_TOKENS);
const TRACKING_BY_VALUE = byValue(FONT_TRACKING_TOKENS);
const OPACITY_BY_VALUE = byValue(OPACITY_TOKENS);
const BLUR_BY_VALUE = byValue(BLUR_TOKENS);

const SPACING_SOURCE: TokenSource = {
  lookup: SPACING_BY_VALUE,
  group: "spacing",
};

// Auto-layout numeric fields. Padding + gaps map onto the `spacing/*` scale.
const SPACING_FIELDS = [
  "itemSpacing",
  "counterAxisSpacing",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
];

// Uniform + per-side stroke weights map onto the `border-width/*` scale.
const STROKE_FIELDS = [
  "strokeWeight",
  "strokeTopWeight",
  "strokeRightWeight",
  "strokeBottomWeight",
  "strokeLeftWeight",
];

const RADIUS_FIELDS = [
  "topLeftRadius",
  "topRightRadius",
  "bottomLeftRadius",
  "bottomRightRadius",
];

// Width/height resolve onto the `spacing/*` scale first (component-sized
// boxes) and fall back to the wider `container/*` scale (large layout widths).
const DIMENSION_SOURCES: TokenSource[] = [
  SPACING_SOURCE,
  { lookup: CONTAINER_BY_VALUE, group: "container" },
];

function numberField(node: SceneNode, field: string): number | undefined {
  const value = (node as unknown as Record<string, unknown>)[field];
  // Figma returns `figma.mixed` (a symbol) for mixed values; only act on a
  // concrete number so we never bind a token over a mixed property.
  return typeof value === "number" ? value : undefined;
}

// lineHeight / letterSpacing are `{ unit, value }` objects. Only the PIXELS
// unit maps onto the px-based leading/tracking scales; PERCENT and AUTO are
// left as literals.
function pixelField(node: SceneNode, field: string): number | undefined {
  const value = (node as unknown as Record<string, unknown>)[field];
  if (
    value &&
    typeof value === "object" &&
    (value as { unit?: unknown }).unit === "PIXELS" &&
    typeof (value as { value?: unknown }).value === "number"
  ) {
    return (value as { value: number }).value;
  }
  return undefined;
}

function isBound(node: SceneNode, field: string): boolean {
  const bound = (
    node as unknown as { boundVariables?: Record<string, unknown> }
  ).boundVariables;
  return Boolean(bound && bound[field]);
}

function setBound(node: SceneNode, field: string, variable: Variable): void {
  try {
    (
      node as unknown as {
        setBoundVariable(field: string, variable: Variable): void;
      }
    ).setBoundVariable(field, variable);
  } catch {
    // The host rejected the binding for this node type — keep the literal.
  }
}

// Bind `field` against the first token source whose lookup contains `value`.
function bindFromSources(
  node: SceneNode,
  field: string,
  value: number | undefined,
  sources: TokenSource[],
  primitives: VarMap,
): void {
  if (value === undefined || value <= 0) return;
  if (isBound(node, field)) return;
  for (const source of sources) {
    const name = source.lookup.get(value);
    if (name === undefined) continue;
    const variable = primitives.get(`${source.group}/${name}`);
    if (!variable) continue;
    setBound(node, field, variable);
    return;
  }
}

function bindField(
  node: SceneNode,
  field: string,
  value: number | undefined,
  lookup: Map<number, string>,
  group: string,
  primitives: VarMap,
): void {
  bindFromSources(node, field, value, [{ lookup, group }], primitives);
}

function hasAutoLayout(node: SceneNode): boolean {
  const mode = (node as unknown as { layoutMode?: string }).layoutMode;
  return mode === "HORIZONTAL" || mode === "VERTICAL";
}

// Whether the given axis carries a fixed size we can safely bind. A non
// auto-layout node is always fixed; an auto-layout frame hugs (AUTO) on one of
// its axes, and binding a size variable there would flip it to a fixed size.
function axisIsFixed(node: SceneNode, axis: "width" | "height"): boolean {
  const layoutMode = (node as unknown as { layoutMode?: string }).layoutMode;
  if (layoutMode !== "HORIZONTAL" && layoutMode !== "VERTICAL") return true;
  const primary = (node as unknown as { primaryAxisSizingMode?: string })
    .primaryAxisSizingMode;
  const counter = (node as unknown as { counterAxisSizingMode?: string })
    .counterAxisSizingMode;
  // HORIZONTAL: primary axis is width, counter axis is height (and vice versa).
  const mode =
    (layoutMode === "HORIZONTAL") === (axis === "width") ? primary : counter;
  return mode === "FIXED";
}

// Bind a node's drop-shadow / blur radii onto the `blur/*` scale. Effects are
// immutable objects, so this rebuilds the array via setBoundVariableForEffect.
// Nodes that reference an effect style are skipped — the style owns the
// effects (and editing them directly would throw in Figma).
function bindEffectRadii(node: SceneNode, primitives: VarMap): void {
  const styleId = (node as unknown as { effectStyleId?: unknown })
    .effectStyleId;
  if (typeof styleId === "string" && styleId.length > 0) return;
  const effects = (node as unknown as { effects?: unknown }).effects;
  if (!Array.isArray(effects) || effects.length === 0) return;
  let changed = false;
  const next = effects.map((effect) => {
    if (!effect || typeof effect !== "object") return effect;
    const radius = (effect as { radius?: unknown }).radius;
    if (typeof radius !== "number" || radius <= 0) return effect;
    const bound = (effect as { boundVariables?: Record<string, unknown> })
      .boundVariables;
    if (bound && bound.radius) return effect;
    const name = BLUR_BY_VALUE.get(radius);
    if (name === undefined) return effect;
    const variable = primitives.get(`blur/${name}`);
    if (!variable) return effect;
    changed = true;
    return figma.variables.setBoundVariableForEffect(
      effect as Effect,
      "radius",
      variable,
    );
  });
  if (changed) {
    (node as unknown as { effects: Effect[] }).effects = next as Effect[];
  }
}

function bindNode(node: SceneNode, primitives: VarMap): void {
  // Spacing + padding only resolve on auto-layout frames/components/sets.
  if (hasAutoLayout(node)) {
    for (const field of SPACING_FIELDS) {
      bindField(
        node,
        field,
        numberField(node, field),
        SPACING_BY_VALUE,
        "spacing",
        primitives,
      );
    }
  }

  // Border widths: uniform plus any per-side overrides.
  for (const field of STROKE_FIELDS) {
    bindField(
      node,
      field,
      numberField(node, field),
      BORDER_WIDTH_BY_VALUE,
      "border-width",
      primitives,
    );
  }

  // Corner radius. A uniform `cornerRadius` fans out to the four corner
  // fields; otherwise bind whatever per-corner literals are present. Either
  // way `isBound` skips corners a builder already bound individually.
  const uniformRadius = numberField(node, "cornerRadius");
  for (const field of RADIUS_FIELDS) {
    const value =
      uniformRadius !== undefined ? uniformRadius : numberField(node, field);
    bindField(node, field, value, RADIUS_BY_VALUE, "radius", primitives);
  }

  // Fixed width/height map onto the spacing scale (component-sized boxes) and
  // fall back to the container scale. Skipped on text — text geometry is
  // governed by its auto-resize mode, not a size token — and on the hug axis
  // of an auto-layout frame so a binding never flips hugging to fixed.
  if (node.type !== "TEXT") {
    if (axisIsFixed(node, "width")) {
      bindFromSources(
        node,
        "width",
        numberField(node, "width"),
        DIMENSION_SOURCES,
        primitives,
      );
    }
    if (axisIsFixed(node, "height")) {
      bindFromSources(
        node,
        "height",
        numberField(node, "height"),
        DIMENSION_SOURCES,
        primitives,
      );
    }
  }

  // Opacity. Figma stores 0..1; the `opacity/*` scale is 0..100. Only bind a
  // genuinely faded node — fully opaque (1) is every node's default and would
  // bind the whole tree to `opacity/100`.
  const opacity = numberField(node, "opacity");
  if (opacity !== undefined && opacity > 0 && opacity < 1) {
    bindField(
      node,
      "opacity",
      Math.round(opacity * 100),
      OPACITY_BY_VALUE,
      "opacity",
      primitives,
    );
  }

  // Drop-shadow / layer-blur radii onto the `blur/*` scale.
  bindEffectRadii(node, primitives);

  // Text metrics: font size, line height (leading), letter spacing (tracking).
  // A node that references a published text style delegates its font size +
  // line height to that style, so binding literals here would conflict (and
  // Figma rejects editing a styled node's metrics). Letter spacing has no
  // text-style coverage in our scale, so it is still bound either way.
  if (node.type === "TEXT") {
    const textStyleId = (node as unknown as { textStyleId?: unknown })
      .textStyleId;
    const hasTextStyle =
      typeof textStyleId === "string" && textStyleId.length > 0;
    if (!hasTextStyle) {
      bindField(
        node,
        "fontSize",
        numberField(node, "fontSize"),
        FONT_SIZE_BY_VALUE,
        "font/size",
        primitives,
      );
      bindField(
        node,
        "lineHeight",
        pixelField(node, "lineHeight"),
        LEADING_BY_VALUE,
        "font/leading",
        primitives,
      );
    }
    bindField(
      node,
      "letterSpacing",
      pixelField(node, "letterSpacing"),
      TRACKING_BY_VALUE,
      "font/tracking",
      primitives,
    );
  }
}

// Walk a node subtree, binding matching primitive variables on each node.
export function applyTokenBindings(root: SceneNode, primitives: VarMap): void {
  bindNode(root, primitives);
  const children = (root as unknown as { children?: SceneNode[] }).children;
  if (children) {
    for (const child of children) applyTokenBindings(child, primitives);
  }
}

// Sweep a region's top-level section/block nodes one at a time, yielding to the
// UI after each so a long binding pass never blocks the event loop. `onChunk`
// reports the boundary (1-based count, total) so the caller can drive progress.
export async function applyTokenBindingsChunked(
  nodes: SceneNode[],
  primitives: VarMap,
  onChunk?: (done: number, total: number) => void,
): Promise<void> {
  const total = nodes.length;
  onChunk?.(0, total);
  for (let i = 0; i < total; i++) {
    applyTokenBindings(nodes[i]!, primitives);
    onChunk?.(i + 1, total);
    await yieldToUi();
  }
}
