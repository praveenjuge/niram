import { describe, expect, it } from "vitest";
import { addButtonSection } from "../../src/componentsPage/sections/button";
import type { ComponentsInputs } from "../../src/componentsPage";

// Minimal inputs: the binding helpers no-op on missing variables, so empty
// maps still exercise the full variant matrix and component-set assembly.
function emptyInputs(): ComponentsInputs {
  return {
    presetCode: "test",
    primitives: new Map(),
    tailwindColors: new Map(),
    theme: { light: new Map(), dark: new Map() },
  };
}

type FakeNode = { type: string; name: string; children: FakeNode[] };

describe("addButtonSection", () => {
  it("builds a 6×8×4 variant matrix combined into one component set", async () => {
    const figma = (globalThis as { figma: { createPage: () => FakeNode } })
      .figma;
    const page = figma.createPage();

    const count = await addButtonSection(page as never, emptyInputs());

    // 6 variants × 8 sizes × 4 states = 192 components in one set.
    //   48 text buttons (6 × 4 non-icon sizes) × 4 states = 96 comps, each
    //     wrapping a single label node → 96 × 2 = 192 nodes.
    //   48 icon buttons (6 × 4 icon sizes) × 4 states = 96 comps, each
    //     wrapping a rendered icon (mock createNodeFromSvg → frame + vector)
    //     → 96 × 3 = 288 nodes.
    //   1 (set) + 192 + 288 = 481.
    expect(count).toBe(481);

    expect(page.children).toHaveLength(1);
    const set = page.children[0]!;
    expect(set.type).toBe("COMPONENT_SET");
    expect(set.name).toBe("Button");
    expect(set.children).toHaveLength(192);
  });

  it("names variants with the Figma Variant=…, Size=…, State=… convention", async () => {
    const figma = (globalThis as { figma: { createPage: () => FakeNode } })
      .figma;
    const page = figma.createPage();
    await addButtonSection(page as never, emptyInputs());

    const set = page.children[0]!;
    const names = set.children.map((c) => c.name);
    expect(names).toContain("Variant=default, Size=icon, State=default");
    expect(names).toContain("Variant=link, Size=lg, State=hover");
    expect(names).toContain("Variant=outline, Size=icon-xs, State=focus");
    expect(names).toContain("Variant=secondary, Size=icon-lg, State=disabled");
  });
});
