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

// A semi-transparent, theme-bound surface for the shadcn "color/NN" washes
// (a chat bubble's `destructive/10` background, a light `primary` tint, an
// errored attachment's media tile). Figma ignores a paint's `opacity` once a
// colour *variable* is bound to it — the variable's own alpha (1) wins — so the
// wash can't be expressed as a single fill. Instead we drop a stretched
// background frame behind the host's content and fade *that layer's node
// opacity*: the colour still tracks the theme variable, the alpha is real, and
// sibling content (text, icons) on top stays fully opaque.
//
// Call before appending the host's content so the surface sits behind it, and
// leave the host frame's own fill empty. The host should be an auto-layout
// frame (so the absolute child can stretch) with its corner radius already set
// (the surface mirrors it). Returns the surface frame, or undefined when no
// variable was given.
export function addTintedSurface(
  frame: FrameNode,
  variable: Variable | undefined,
  opacity: number,
  radiusVariable?: Variable,
): FrameNode | undefined {
  if (!variable) return undefined;

  const surface = figma.createFrame();
  surface.name = "Surface";
  bindFill(surface, variable);
  surface.strokes = [];
  const radius = (frame as unknown as { cornerRadius?: unknown }).cornerRadius;
  if (typeof radius === "number") surface.cornerRadius = radius;
  if (radiusVariable) bindCornerRadii(surface, radiusVariable);
  surface.opacity = Math.max(0, Math.min(1, opacity));

  frame.appendChild(surface);
  try {
    (surface as unknown as { layoutPositioning: string }).layoutPositioning =
      "ABSOLUTE";
    (surface as unknown as { constraints: unknown }).constraints = {
      horizontal: "STRETCH",
      vertical: "STRETCH",
    };
    surface.x = 0;
    surface.y = 0;
    surface.resize(
      Math.max(1, frame.width || 1),
      Math.max(1, frame.height || 1),
    );
  } catch {
    // Host rejected absolute positioning — the surface stays in flow (still
    // tinted via node opacity, just not stretched). Acceptable degradation.
  }
  return surface;
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
