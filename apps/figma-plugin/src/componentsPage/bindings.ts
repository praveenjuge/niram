// Variable binding helpers shared across the Components page.

export function bindFill(
  node: SceneNode & { fills: ReadonlyArray<Paint> | typeof figma.mixed },
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
  (node as unknown as { fills: Paint[] }).fills = [bound];
}

export function bindStrokeColor(
  node: SceneNode & { strokes: ReadonlyArray<Paint> },
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

export function bindCornerRadii(
  node: FrameNode | ComponentNode,
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

export function bindFontSize(node: TextNode, variable: Variable | undefined) {
  if (!variable) return;
  try {
    node.setBoundVariable("fontSize", variable);
  } catch {
    // ignore
  }
}
