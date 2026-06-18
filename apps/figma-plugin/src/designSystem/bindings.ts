// Variable binding helpers shared across the Design System page.

import { solidPaint } from "./paints";

export function bindFill(
  node: SceneNode & { fills: ReadonlyArray<Paint> | typeof figma.mixed },
  variable: Variable | undefined,
  fallbackTone?: number,
) {
  if (!variable) {
    if (fallbackTone !== undefined) {
      (node as unknown as { fills: Paint[] }).fills = [
        solidPaint(fallbackTone),
      ];
    }
    return;
  }
  const base: SolidPaint = {
    type: "SOLID",
    color: { r: 0.5, g: 0.5, b: 0.5 },
    opacity: 1,
  };
  const bound = figma.variables.setBoundVariableForPaint(
    base,
    "color",
    variable,
  );
  (node as unknown as { fills: Paint[] }).fills = [bound];
}

export function bindStrokeColor(
  node: SceneNode & {
    strokes: ReadonlyArray<Paint>;
  },
  variable: Variable | undefined,
) {
  if (!variable) return;
  const base: SolidPaint = {
    type: "SOLID",
    color: { r: 0.5, g: 0.5, b: 0.5 },
    opacity: 1,
  };
  const bound = figma.variables.setBoundVariableForPaint(
    base,
    "color",
    variable,
  );
  (node as unknown as { strokes: Paint[] }).strokes = [bound];
}

export function bindStrokeWeight(
  node: FrameNode | RectangleNode,
  variable: Variable | undefined,
) {
  if (!variable) return;
  try {
    node.setBoundVariable("strokeWeight", variable);
  } catch {
    // Some node types don't accept the binding — ignore silently.
  }
}

export function bindWidth(
  node: FrameNode | RectangleNode,
  variable: Variable | undefined,
) {
  if (!variable) return;
  try {
    node.setBoundVariable("width", variable);
  } catch {
    // ignore
  }
}

export function bindOpacity(
  node: FrameNode | RectangleNode,
  variable: Variable | undefined,
) {
  if (!variable) return;
  try {
    node.setBoundVariable("opacity", variable);
  } catch {
    // ignore
  }
}

export function bindFontSize(node: TextNode, variable: Variable | undefined) {
  if (!variable) return;
  try {
    node.setBoundVariable("fontSize", variable);
  } catch {
    // ignore
  }
}

export function bindLineHeight(node: TextNode, variable: Variable | undefined) {
  if (!variable) return;
  try {
    node.setBoundVariable("lineHeight", variable);
  } catch {
    // ignore
  }
}

export function bindLetterSpacing(
  node: TextNode,
  variable: Variable | undefined,
) {
  if (!variable) return;
  try {
    node.setBoundVariable("letterSpacing", variable);
  } catch {
    // ignore
  }
}

export function bindCornerRadii(
  node: FrameNode | RectangleNode,
  variable: Variable | undefined,
) {
  if (!variable) return;
  try {
    node.setBoundVariable("topLeftRadius", variable);
    node.setBoundVariable("topRightRadius", variable);
    node.setBoundVariable("bottomLeftRadius", variable);
    node.setBoundVariable("bottomRightRadius", variable);
  } catch {
    // ignore
  }
}

export function bindEffectRadius(
  node: FrameNode | RectangleNode,
  effectIndex: number,
  variable: Variable | undefined,
) {
  if (!variable) return;
  const next = node.effects.map((effect, idx) =>
    idx === effectIndex
      ? figma.variables.setBoundVariableForEffect(effect, "radius", variable)
      : effect,
  );
  node.effects = next;
}
