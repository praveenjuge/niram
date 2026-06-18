import { describe, expect, it } from "vitest";
import {
  bindCornerRadii,
  bindEffectRadius,
  bindFill,
  bindFontSize,
  bindLetterSpacing,
  bindLineHeight,
  bindOpacity,
  bindStrokeColor,
  bindStrokeWeight,
  bindWidth,
} from "../../src/designSystem/bindings";

// A real variable to bind against, minted through the figma mock.
function makeVariable(): Variable {
  const coll = figma.variables.createVariableCollection("test");
  return figma.variables.createVariable(
    "v",
    coll,
    "COLOR",
  ) as unknown as Variable;
}

// Minimal node stand-ins. The code under test only touches the fields below;
// `setBoundVariable` is overridable so we can drive both the happy path and
// the swallowed-error path.
function makeFrame(throwOnBind = false) {
  const calls: Array<{ field: string; id: string }> = [];
  const node = {
    effects: [] as unknown[],
    fills: [] as unknown[],
    strokes: [] as unknown[],
    boundVariables: {} as Record<string, unknown>,
    setBoundVariable(field: string, variable: { id: string }) {
      if (throwOnBind) throw new Error("binding not supported");
      calls.push({ field, id: variable.id });
    },
    calls,
  };
  return node;
}

describe("bindFill", () => {
  it("applies the fallback tone when no variable is supplied", () => {
    const node = { fills: [] as unknown[] };
    bindFill(node as never, undefined, 0.25);
    expect(node.fills).toHaveLength(1);
    expect((node.fills[0] as SolidPaint).color).toEqual({
      r: 0.25,
      g: 0.25,
      b: 0.25,
    });
  });

  it("leaves fills untouched when no variable and no fallback", () => {
    const node = { fills: ["sentinel"] as unknown[] };
    bindFill(node as never, undefined);
    expect(node.fills).toEqual(["sentinel"]);
  });

  it("binds the variable to a solid paint", () => {
    const node = { fills: [] as unknown[] };
    const variable = makeVariable();
    bindFill(node as never, variable);
    expect(node.fills).toHaveLength(1);
    expect(
      (node.fills[0] as { boundVariables: { color: { id: string } } })
        .boundVariables.color.id,
    ).toBe(variable.id);
  });
});

describe("bindStrokeColor", () => {
  it("no-ops without a variable", () => {
    const node = { strokes: ["sentinel"] as unknown[] };
    bindStrokeColor(node as never, undefined);
    expect(node.strokes).toEqual(["sentinel"]);
  });

  it("binds the variable to the stroke paint", () => {
    const node = { strokes: [] as unknown[] };
    const variable = makeVariable();
    bindStrokeColor(node as never, variable);
    expect(
      (node.strokes[0] as { boundVariables: { color: { id: string } } })
        .boundVariables.color.id,
    ).toBe(variable.id);
  });
});

describe("scalar bindings", () => {
  const cases: Array<[string, (n: FrameNode, v: Variable) => void, string]> = [
    ["bindStrokeWeight", bindStrokeWeight, "strokeWeight"],
    ["bindWidth", bindWidth, "width"],
    ["bindOpacity", bindOpacity, "opacity"],
    [
      "bindFontSize",
      bindFontSize as unknown as (n: FrameNode, v: Variable) => void,
      "fontSize",
    ],
    [
      "bindLineHeight",
      bindLineHeight as unknown as (n: FrameNode, v: Variable) => void,
      "lineHeight",
    ],
    [
      "bindLetterSpacing",
      bindLetterSpacing as unknown as (n: FrameNode, v: Variable) => void,
      "letterSpacing",
    ],
  ];

  for (const [name, fn, field] of cases) {
    it(`${name} no-ops without a variable`, () => {
      const node = makeFrame();
      fn(node as never, undefined as never);
      expect(node.calls).toHaveLength(0);
    });

    it(`${name} binds the expected field`, () => {
      const node = makeFrame();
      const variable = makeVariable();
      fn(node as never, variable);
      expect(node.calls).toEqual([{ field, id: variable.id }]);
    });

    it(`${name} swallows binding errors`, () => {
      const node = makeFrame(true);
      const variable = makeVariable();
      expect(() => fn(node as never, variable)).not.toThrow();
    });
  }
});

describe("bindCornerRadii", () => {
  it("no-ops without a variable", () => {
    const node = makeFrame();
    bindCornerRadii(node as never, undefined);
    expect(node.calls).toHaveLength(0);
  });

  it("binds all four corners", () => {
    const node = makeFrame();
    const variable = makeVariable();
    bindCornerRadii(node as never, variable);
    expect(node.calls.map((c) => c.field)).toEqual([
      "topLeftRadius",
      "topRightRadius",
      "bottomLeftRadius",
      "bottomRightRadius",
    ]);
  });

  it("swallows binding errors", () => {
    const node = makeFrame(true);
    const variable = makeVariable();
    expect(() => bindCornerRadii(node as never, variable)).not.toThrow();
  });
});

describe("bindEffectRadius", () => {
  it("no-ops without a variable", () => {
    const node = makeFrame();
    node.effects = [{ type: "DROP_SHADOW" }];
    bindEffectRadius(node as never, 0, undefined);
    expect(node.effects).toEqual([{ type: "DROP_SHADOW" }]);
  });

  it("binds only the effect at the given index", () => {
    const node = makeFrame();
    node.effects = [{ type: "A" }, { type: "B" }];
    const variable = makeVariable();
    bindEffectRadius(node as never, 1, variable);
    expect(
      (node.effects[0] as { boundVariables?: unknown }).boundVariables,
    ).toBeUndefined();
    expect(
      (node.effects[1] as { boundVariables: { radius: { id: string } } })
        .boundVariables.radius.id,
    ).toBe(variable.id);
  });
});
