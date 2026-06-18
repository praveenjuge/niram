import { describe, expect, it } from "vitest";
import { addChartBlock } from "../../src/blocksPage/blocks/chart";
import { CHART_PATTERNS } from "../../src/blocksPage/blocks/chart/data";
import type { BlocksInputs } from "../../src/blocksPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

// Build real theme/primitive variables so the chart series bind their
// `chart-*` tokens exactly like a live run, then render the block onto a bare
// page (the Chart set is self-contained, like the Sidebar block).
async function makeInputs(code = "b2fA"): Promise<BlocksInputs> {
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error("fixture failed to resolve");
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
  });
  const figma = (
    globalThis as unknown as { figma: { createPage: () => PageNode } }
  ).figma;
  const page = figma.createPage();
  (page as unknown as { name: string }).name = "Scratch";
  return {
    presetCode: code,
    primitives: generated.variables.primitives,
    tailwindColors: generated.variables.tailwindColors,
    theme: generated.variables.theme,
    targetPage: page,
  };
}

type FakeNode = {
  type: string;
  name: string;
  width: number;
  height: number;
  fills?: { boundVariables?: Record<string, { id: string }> }[];
  children: FakeNode[];
  boundVariables?: Record<string, { id: string }>;
};

function findComponentSet(node: FakeNode): FakeNode | undefined {
  if (node.type === "COMPONENT_SET") return node;
  for (const child of node.children ?? []) {
    const found = findComponentSet(child);
    if (found) return found;
  }
  return undefined;
}

function collectFillVarIds(node: FakeNode, ids: Set<string>): void {
  const fills = node.fills;
  if (Array.isArray(fills)) {
    for (const fill of fills) {
      const bound = fill.boundVariables?.color;
      if (bound) ids.add(bound.id);
    }
  }
  for (const child of node.children ?? []) collectFillVarIds(child, ids);
}

describe("addChartBlock", () => {
  it("combines the curated chart catalogue into one 'Chart' component set", async () => {
    const inputs = await makeInputs();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };

    const count = await addChartBlock(page as never, inputs);
    expect(count).toBeGreaterThan(0);

    expect(page.children).toHaveLength(1);
    const set = findComponentSet(page.children[0]!);
    expect(set).toBeDefined();
    expect(set!.name).toBe("Chart");
    // One variant per curated pattern (no Size dimension).
    expect(set!.children).toHaveLength(CHART_PATTERNS.length);
  });

  it("keeps the catalogue small and curated (no Tooltip family)", () => {
    // ~4 visually-distinct patterns per family, six families.
    expect(CHART_PATTERNS.length).toBeLessThanOrEqual(30);
    expect(CHART_PATTERNS.length).toBeGreaterThanOrEqual(20);
    const families = new Set(CHART_PATTERNS.map((p) => p.family));
    expect(families).toEqual(
      new Set(["Area", "Bar", "Line", "Pie", "Radar", "Radial"]),
    );
  });

  it("names variants by Family and Variant (no Size)", async () => {
    const inputs = await makeInputs();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };
    await addChartBlock(page as never, inputs);

    const set = findComponentSet(page.children[0]!)!;
    const names = set.children.map((c) => c.name);
    expect(names).toContain("Family=Area, Variant=Interactive");
    for (const name of names) {
      expect(name).toMatch(/^Family=.+, Variant=.+$/);
      expect(name).not.toContain("Size=");
    }
  });

  it("includes every curated pattern exactly once", async () => {
    const inputs = await makeInputs();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };
    await addChartBlock(page as never, inputs);

    const set = findComponentSet(page.children[0]!)!;
    const names = new Set(set.children.map((c) => c.name));
    for (const pattern of CHART_PATTERNS) {
      expect(
        names.has(`Family=${pattern.family}, Variant=${pattern.variant}`),
      ).toBe(true);
    }
    // Variant names are unique within the set.
    expect(names.size).toBe(set.children.length);
  });

  it("binds chart series to the chart-1…chart-5 theme variables", async () => {
    const inputs = await makeInputs();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };
    await addChartBlock(page as never, inputs);

    const set = findComponentSet(page.children[0]!)!;
    const usedFillIds = new Set<string>();
    collectFillVarIds(set, usedFillIds);

    // The five chart variables must each be referenced by at least one series.
    for (let i = 1; i <= 5; i++) {
      const variable = inputs.theme.light.get(`chart-${i}`);
      expect(variable, `chart-${i} variable exists`).toBeDefined();
      expect(usedFillIds.has(variable!.id), `chart-${i} is bound`).toBe(true);
    }
  });

  it("pins the set to the full 1512 block-canvas width", async () => {
    const inputs = await makeInputs();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };
    await addChartBlock(page as never, inputs);

    const set = findComponentSet(page.children[0]!)!;
    expect(set.width).toBe(1512);
  });
});
