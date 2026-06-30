import { describe, expect, it } from "vitest";
import {
  addTintedSurface,
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../../src/componentsPage/bindings";

function makeVariable(): Variable {
  const coll = figma.variables.createVariableCollection("test");
  return figma.variables.createVariable(
    "v",
    coll,
    "COLOR",
  ) as unknown as Variable;
}

function makeNode(throwOnBind = false) {
  const calls: string[] = [];
  return {
    fills: [] as unknown[],
    strokes: [] as unknown[],
    setBoundVariable(field: string) {
      if (throwOnBind) throw new Error("not supported");
      calls.push(field);
    },
    calls,
  };
}

describe("componentsPage bindFill / bindStrokeColor", () => {
  it("no-op without a variable", () => {
    const node = makeNode();
    bindFill(node as never, undefined);
    bindStrokeColor(node as never, undefined);
    expect(node.fills).toEqual([]);
    expect(node.strokes).toEqual([]);
  });

  it("binds a variable into fills and strokes", () => {
    const node = makeNode();
    const variable = makeVariable();
    bindFill(node as never, variable);
    bindStrokeColor(node as never, variable);
    expect(
      (node.fills[0] as { boundVariables: { color: { id: string } } })
        .boundVariables.color.id,
    ).toBe(variable.id);
    expect(
      (node.strokes[0] as { boundVariables: { color: { id: string } } })
        .boundVariables.color.id,
    ).toBe(variable.id);
  });
});

describe("componentsPage addTintedSurface", () => {
  it("no-op without a variable", () => {
    const frame = figma.createFrame() as unknown as {
      children: unknown[];
      layoutMode: string;
    };
    frame.layoutMode = "HORIZONTAL";
    const result = addTintedSurface(frame as never, undefined, 0.1);
    expect(result).toBeUndefined();
    expect(frame.children).toHaveLength(0);
  });

  it("adds a faded, variable-bound background layer behind the content", () => {
    const variable = makeVariable();
    const frame = figma.createFrame();
    (frame as unknown as { layoutMode: string }).layoutMode = "HORIZONTAL";
    addTintedSurface(frame as never, variable, 0.1);

    const surface = (
      frame as unknown as { children: Record<string, unknown>[] }
    ).children[0] as {
      name: string;
      opacity: number;
      fills: { boundVariables: { color: { id: string } } }[];
    };
    expect(surface).toBeDefined();
    expect(surface.name).toBe("Surface");
    // The colour tracks the theme variable; the wash comes from node opacity
    // (Figma ignores paint opacity once a colour variable is bound).
    expect(surface.fills[0].boundVariables.color.id).toBe(variable.id);
    expect(surface.opacity).toBe(0.1);
  });

  it("clamps opacity to the 0..1 range", () => {
    const frame = figma.createFrame();
    (frame as unknown as { layoutMode: string }).layoutMode = "HORIZONTAL";
    addTintedSurface(frame as never, makeVariable(), 1.7);
    const surface = (frame as unknown as { children: { opacity: number }[] })
      .children[0];
    expect(surface.opacity).toBe(1);
  });
});

describe("componentsPage bindCornerRadii", () => {
  it("no-ops without a variable", () => {
    const node = makeNode();
    bindCornerRadii(node as never, undefined);
    expect(node.calls).toHaveLength(0);
  });

  it("binds all four corners", () => {
    const node = makeNode();
    bindCornerRadii(node as never, makeVariable());
    expect(node.calls).toEqual([
      "topLeftRadius",
      "topRightRadius",
      "bottomLeftRadius",
      "bottomRightRadius",
    ]);
  });

  it("swallows binding errors", () => {
    const node = makeNode(true);
    expect(() => bindCornerRadii(node as never, makeVariable())).not.toThrow();
  });
});

describe("componentsPage bindFontSize", () => {
  it("no-ops without a variable", () => {
    const node = makeNode();
    bindFontSize(node as never, undefined);
    expect(node.calls).toHaveLength(0);
  });

  it("binds fontSize", () => {
    const node = makeNode();
    bindFontSize(node as never, makeVariable());
    expect(node.calls).toEqual(["fontSize"]);
  });

  it("swallows binding errors", () => {
    const node = makeNode(true);
    expect(() => bindFontSize(node as never, makeVariable())).not.toThrow();
  });
});
