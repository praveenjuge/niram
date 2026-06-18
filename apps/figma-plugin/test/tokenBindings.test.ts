import { describe, expect, it } from "vitest";
import { applyTokenBindings } from "../src/tokenBindings";
import type { FigmaMock } from "./figma-mock";

function liveFigma(): FigmaMock {
  return (globalThis as unknown as { figma: FigmaMock }).figma;
}

// Build a primitives map with the variables the pass looks up. Names mirror
// the generator's `group/name` convention.
function makePrimitives(): Map<string, Variable> {
  const figma = liveFigma();
  const coll = figma.variables.createVariableCollection(
    "Tailwind / Primitives",
  );
  const map = new Map<string, Variable>();
  const add = (name: string) => {
    map.set(
      name,
      figma.variables.createVariable(
        name,
        coll,
        "FLOAT",
      ) as unknown as Variable,
    );
  };
  add("spacing/4"); // 16
  add("spacing/2"); // 8
  add("spacing/8"); // 32
  add("spacing/0"); // 0
  add("border-width/1"); // 1
  add("radius/lg"); // 8
  add("font/size/sm"); // 14
  add("container/lg"); // 512
  add("font/leading/5"); // 20
  add("font/tracking/wide"); // 0.4
  add("opacity/50"); // 50
  add("blur/md"); // 12
  return map;
}

function boundId(node: unknown, field: string): string | undefined {
  const bound = (node as { boundVariables?: Record<string, { id: string }> })
    .boundVariables;
  return bound && bound[field] ? bound[field]!.id : undefined;
}

describe("applyTokenBindings", () => {
  it("binds padding + gap on auto-layout frames when the literal matches a token", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const frame = figma.createFrame();
    (frame as unknown as Record<string, unknown>).layoutMode = "VERTICAL";
    (frame as unknown as Record<string, unknown>).itemSpacing = 16;
    (frame as unknown as Record<string, unknown>).paddingTop = 8;

    applyTokenBindings(frame as never, primitives);

    expect(boundId(frame, "itemSpacing")).toBe(primitives.get("spacing/4")!.id);
    expect(boundId(frame, "paddingTop")).toBe(primitives.get("spacing/2")!.id);
  });

  it("does not bind spacing on non-auto-layout frames", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const frame = figma.createFrame();
    (frame as unknown as Record<string, unknown>).itemSpacing = 16;

    applyTokenBindings(frame as never, primitives);

    expect(boundId(frame, "itemSpacing")).toBeUndefined();
  });

  it("skips zero values so spacing/0 is never bound", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const frame = figma.createFrame();
    (frame as unknown as Record<string, unknown>).layoutMode = "HORIZONTAL";
    (frame as unknown as Record<string, unknown>).itemSpacing = 0;

    applyTokenBindings(frame as never, primitives);

    expect(boundId(frame, "itemSpacing")).toBeUndefined();
  });

  it("never overrides a field a builder already bound", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const frame = figma.createFrame();
    (frame as unknown as Record<string, unknown>).layoutMode = "VERTICAL";
    (frame as unknown as Record<string, unknown>).itemSpacing = 16;
    // Pretend a builder bound itemSpacing to spacing/2 already.
    (
      frame as unknown as { boundVariables: Record<string, unknown> }
    ).boundVariables = {
      itemSpacing: {
        type: "VARIABLE_ALIAS",
        id: primitives.get("spacing/2")!.id,
      },
    };

    applyTokenBindings(frame as never, primitives);

    expect(boundId(frame, "itemSpacing")).toBe(primitives.get("spacing/2")!.id);
  });

  it("fans a uniform cornerRadius out to all four corners", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const frame = figma.createFrame();
    (frame as unknown as Record<string, unknown>).cornerRadius = 8;

    applyTokenBindings(frame as never, primitives);

    const lg = primitives.get("radius/lg")!.id;
    expect(boundId(frame, "topLeftRadius")).toBe(lg);
    expect(boundId(frame, "topRightRadius")).toBe(lg);
    expect(boundId(frame, "bottomLeftRadius")).toBe(lg);
    expect(boundId(frame, "bottomRightRadius")).toBe(lg);
  });

  it("binds strokeWeight to a border-width token", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const frame = figma.createFrame();
    (frame as unknown as Record<string, unknown>).strokeWeight = 1;

    applyTokenBindings(frame as never, primitives);

    expect(boundId(frame, "strokeWeight")).toBe(
      primitives.get("border-width/1")!.id,
    );
  });

  it("binds fontSize on text nodes and recurses into children", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const parent = figma.createFrame();
    (parent as unknown as Record<string, unknown>).layoutMode = "VERTICAL";
    const text = figma.createText();
    (text as unknown as Record<string, unknown>).fontSize = 14;
    parent.appendChild(text as never);

    applyTokenBindings(parent as never, primitives);

    expect(boundId(text, "fontSize")).toBe(primitives.get("font/size/sm")!.id);
  });

  it("leaves a field alone when no token matches the literal", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const frame = figma.createFrame();
    (frame as unknown as Record<string, unknown>).layoutMode = "VERTICAL";
    (frame as unknown as Record<string, unknown>).itemSpacing = 13; // no token

    applyTokenBindings(frame as never, primitives);

    expect(boundId(frame, "itemSpacing")).toBeUndefined();
  });

  it("binds fixed width/height onto the spacing scale", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const frame = figma.createFrame();
    frame.resize(32, 32);

    applyTokenBindings(frame as never, primitives);

    const spacing8 = primitives.get("spacing/8")!.id;
    expect(boundId(frame, "width")).toBe(spacing8);
    expect(boundId(frame, "height")).toBe(spacing8);
  });

  it("falls back to the container scale for large widths", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const frame = figma.createFrame();
    frame.resize(512, 32);

    applyTokenBindings(frame as never, primitives);

    expect(boundId(frame, "width")).toBe(primitives.get("container/lg")!.id);
    expect(boundId(frame, "height")).toBe(primitives.get("spacing/8")!.id);
  });

  it("does not bind size on the hug axis of an auto-layout frame", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const frame = figma.createFrame();
    (frame as unknown as Record<string, unknown>).layoutMode = "HORIZONTAL";
    // Primary axis (width) hugs, counter axis (height) is fixed.
    (frame as unknown as Record<string, unknown>).primaryAxisSizingMode =
      "AUTO";
    (frame as unknown as Record<string, unknown>).counterAxisSizingMode =
      "FIXED";
    frame.resize(32, 32);

    applyTokenBindings(frame as never, primitives);

    expect(boundId(frame, "width")).toBeUndefined();
    expect(boundId(frame, "height")).toBe(primitives.get("spacing/8")!.id);
  });

  it("does not bind width/height on text nodes", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const text = figma.createText();
    text.resize(32, 32);

    applyTokenBindings(text as never, primitives);

    expect(boundId(text, "width")).toBeUndefined();
    expect(boundId(text, "height")).toBeUndefined();
  });

  it("binds a faded opacity onto the opacity scale but skips fully opaque", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const faded = figma.createFrame();
    (faded as unknown as Record<string, unknown>).opacity = 0.5;
    const opaque = figma.createFrame();
    (opaque as unknown as Record<string, unknown>).opacity = 1;

    applyTokenBindings(faded as never, primitives);
    applyTokenBindings(opaque as never, primitives);

    expect(boundId(faded, "opacity")).toBe(primitives.get("opacity/50")!.id);
    expect(boundId(opaque, "opacity")).toBeUndefined();
  });

  it("binds pixel line height + letter spacing on text, ignoring percent units", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const text = figma.createText();
    (text as unknown as Record<string, unknown>).lineHeight = {
      unit: "PIXELS",
      value: 20,
    };
    (text as unknown as Record<string, unknown>).letterSpacing = {
      unit: "PIXELS",
      value: 0.4,
    };

    const percentText = figma.createText();
    (percentText as unknown as Record<string, unknown>).letterSpacing = {
      unit: "PERCENT",
      value: 4,
    };

    applyTokenBindings(text as never, primitives);
    applyTokenBindings(percentText as never, primitives);

    expect(boundId(text, "lineHeight")).toBe(
      primitives.get("font/leading/5")!.id,
    );
    expect(boundId(text, "letterSpacing")).toBe(
      primitives.get("font/tracking/wide")!.id,
    );
    expect(boundId(percentText, "letterSpacing")).toBeUndefined();
  });

  it("binds drop-shadow radius onto the blur scale", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const frame = figma.createFrame();
    frame.effects = [
      {
        type: "DROP_SHADOW",
        radius: 12,
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 2 },
        spread: 0,
        visible: true,
        blendMode: "NORMAL",
      },
    ];

    applyTokenBindings(frame as never, primitives);

    const effect = (frame.effects as Array<Record<string, unknown>>)[0]!;
    const bound = effect.boundVariables as Record<string, { id: string }>;
    expect(bound.radius!.id).toBe(primitives.get("blur/md")!.id);
  });

  it("skips effect-radius binding on nodes that reference an effect style", () => {
    const figma = liveFigma();
    const primitives = makePrimitives();

    const frame = figma.createFrame();
    // The node references a published effect style, so the style owns the
    // effects. The pass must leave the literal effect untouched.
    (frame as unknown as Record<string, unknown>).effectStyleId = "style-1";
    frame.effects = [
      {
        type: "DROP_SHADOW",
        radius: 12,
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 2 },
        spread: 0,
        visible: true,
        blendMode: "NORMAL",
      },
    ];

    applyTokenBindings(frame as never, primitives);

    const effect = (frame.effects as Array<Record<string, unknown>>)[0]!;
    expect(effect.boundVariables).toBeUndefined();
  });
});
