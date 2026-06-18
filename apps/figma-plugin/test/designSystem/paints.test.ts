import { describe, expect, it } from "vitest";
import {
  dropShadow,
  innerShadow,
  solidPaint,
  solidPaintRgba,
} from "../../src/designSystem/paints";

describe("solidPaint", () => {
  it("builds an opaque grey paint from a tone", () => {
    const paint = solidPaint(0.25);
    expect(paint).toEqual({
      type: "SOLID",
      color: { r: 0.25, g: 0.25, b: 0.25 },
      opacity: 1,
    });
  });

  it("clamps tones below 0 and above 1", () => {
    expect(solidPaint(-5).color).toEqual({ r: 0, g: 0, b: 0 });
    expect(solidPaint(5).color).toEqual({ r: 1, g: 1, b: 1 });
  });
});

describe("solidPaintRgba", () => {
  it("maps an rgba channel set onto a solid paint, alpha → opacity", () => {
    const paint = solidPaintRgba({ r: 0.1, g: 0.2, b: 0.3, a: 0.4 });
    expect(paint).toEqual({
      type: "SOLID",
      color: { r: 0.1, g: 0.2, b: 0.3 },
      opacity: 0.4,
    });
  });
});

describe("dropShadow", () => {
  it("builds a visible drop shadow that renders behind the node", () => {
    const color = { r: 0, g: 0, b: 0, a: 0.5 };
    const effect = dropShadow(1, 2, 4, color);
    expect(effect).toEqual({
      type: "DROP_SHADOW",
      color,
      offset: { x: 1, y: 2 },
      radius: 4,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
      showShadowBehindNode: true,
    });
  });
});

describe("innerShadow", () => {
  it("builds a visible inner shadow", () => {
    const color = { r: 0, g: 0, b: 0, a: 0.25 };
    const effect = innerShadow(0, -1, 3, color);
    expect(effect).toEqual({
      type: "INNER_SHADOW",
      color,
      offset: { x: 0, y: -1 },
      radius: 3,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
    });
  });
});
