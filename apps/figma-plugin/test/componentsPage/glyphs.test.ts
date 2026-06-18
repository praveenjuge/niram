import { describe, expect, it } from "vitest";
import { createCloseGlyph } from "../../src/componentsPage/glyphs";

type VectorLike = {
  type: string;
  name: string;
  width: number;
  height: number;
  vectorPaths: { windingRule: string; data: string }[];
  strokeWeight: number;
  strokeCap: string;
  strokeJoin: string;
  fills: unknown[];
  strokes: unknown[];
};

function makeVariable(): Variable {
  const coll = figma.variables.createVariableCollection("test");
  return figma.variables.createVariable(
    "v",
    coll,
    "COLOR",
  ) as unknown as Variable;
}

describe("createCloseGlyph", () => {
  it("creates a stroked X vector with lucide-style caps and joins", () => {
    const glyph = createCloseGlyph(undefined) as unknown as VectorLike;
    expect(glyph.type).toBe("VECTOR");
    expect(glyph.name).toBe("Icon");
    // Default size is 16px.
    expect(glyph.width).toBe(16);
    expect(glyph.height).toBe(16);
    expect(glyph.strokeWeight).toBe(1.5);
    expect(glyph.strokeCap).toBe("ROUND");
    expect(glyph.strokeJoin).toBe("ROUND");
    // No fill — it's a stroke-only glyph.
    expect(glyph.fills).toEqual([]);
  });

  it("scales the cross geometry to the requested size", () => {
    const glyph = createCloseGlyph(undefined, 24) as unknown as VectorLike;
    expect(glyph.width).toBe(24);
    expect(glyph.height).toBe(24);
    // At 24px the lucide inset maps to 6..18 directly.
    expect(glyph.vectorPaths).toEqual([
      { windingRule: "NONZERO", data: "M 6 6 L 18 18 M 18 6 L 6 18" },
    ]);
  });

  it("leaves strokes unbound when no variable is supplied", () => {
    const glyph = createCloseGlyph(undefined) as unknown as VectorLike;
    expect(glyph.strokes).toEqual([]);
  });

  it("binds the stroke colour to a variable when supplied", () => {
    const variable = makeVariable();
    const glyph = createCloseGlyph(variable) as unknown as VectorLike;
    expect(
      (glyph.strokes[0] as { boundVariables: { color: { id: string } } })
        .boundVariables.color.id,
    ).toBe(variable.id);
  });
});
