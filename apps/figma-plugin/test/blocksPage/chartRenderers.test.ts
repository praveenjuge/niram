import { describe, expect, it } from "vitest";
import { buildChartCard } from "../../src/blocksPage/blocks/chart/renderers";
import type {
  ChartPattern,
  RadarGrid,
} from "../../src/blocksPage/blocks/chart/data";
import type { BlocksInputs } from "../../src/blocksPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

// The renderer engine deliberately understands a superset of the curated
// catalogue's flags (labels, per-bar colours, expand-stack, extra radar grid
// styles, dot styles, …) so trimmed variants can be re-added in data.ts without
// touching the engine. These tests stamp synthetic patterns that exercise every
// such flag path so the engine stays covered even while data.ts is trimmed.

async function makeInputs(code = "b2fA"): Promise<BlocksInputs> {
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error("fixture failed to resolve");
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
  });
  return {
    presetCode: code,
    primitives: generated.variables.primitives,
    tailwindColors: generated.variables.tailwindColors,
    theme: generated.variables.theme,
  } as unknown as BlocksInputs;
}

function pattern(
  family: ChartPattern["family"],
  variant: string,
  flags: Partial<ChartPattern> = {},
): ChartPattern {
  return {
    id: `synthetic-${family}-${variant}`.toLowerCase(),
    family,
    variant,
    title: `${family} ${variant}`,
    subtitle: "synthetic coverage pattern",
    ...flags,
  };
}

// Builds a card and returns its node count so we can assert it produced
// something. The point is exercising the renderer branches, not the geometry.
function build(inputs: BlocksInputs, p: ChartPattern): ComponentNode {
  const comp = buildChartCard(inputs, p);
  expect(comp.type).toBe("COMPONENT");
  expect(comp.name).toBe(`Family=${p.family}, Variant=${p.variant}`);
  return comp;
}

describe("buildChartCard superset flags", () => {
  it("renders bar variants with labels, per-bar colour, and an active highlight", async () => {
    const inputs = await makeInputs();
    build(inputs, pattern("Bar", "Labels", { labels: true }));
    build(inputs, pattern("Bar", "PerBar", { perBarColor: true }));
    build(inputs, pattern("Bar", "Active", { active: true }));
    build(inputs, pattern("Bar", "Grouped", { multiple: true }));
    build(
      inputs,
      pattern("Bar", "HorizontalPerBar", {
        horizontal: true,
        perBarColor: true,
      }),
    );
  });

  it("renders line variants with custom/coloured dots and inline labels", async () => {
    const inputs = await makeInputs();
    build(inputs, pattern("Line", "CustomDots", { dots: "custom" }));
    build(inputs, pattern("Line", "ColorDots", { dots: "colors" }));
    build(inputs, pattern("Line", "Labels", { labels: true }));
    build(
      inputs,
      pattern("Line", "LinearMulti", { curve: "linear", multiple: true }),
    );
  });

  it("renders area variants with axes and an expand stack", async () => {
    const inputs = await makeInputs();
    build(inputs, pattern("Area", "Axes", { axes: true }));
    build(
      inputs,
      pattern("Area", "Expand", {
        multiple: true,
        stacked: true,
        expand: true,
      }),
    );
  });

  it("renders pie variants with labels, active wedge, and a ring donut", async () => {
    const inputs = await makeInputs();
    build(inputs, pattern("Pie", "Labels", { labels: true }));
    build(inputs, pattern("Pie", "Active", { active: true }));
    build(
      inputs,
      pattern("Pie", "Ring", { donut: true, ring: true, donutText: true }),
    );
  });

  it("renders every radar grid style plus lines-only and dotted multi", async () => {
    const inputs = await makeInputs();
    const grids: RadarGrid[] = [
      "default",
      "none",
      "circle",
      "circle-no-lines",
      "circle-fill",
      "custom",
    ];
    for (const grid of grids) {
      build(inputs, pattern("Radar", `Grid-${grid}`, { grid }));
    }
    build(inputs, pattern("Radar", "LinesOnly", { linesOnly: true }));
    build(
      inputs,
      pattern("Radar", "DottedMulti", { multiple: true, dots: "default" }),
    );
  });

  it("renders radial variants with labels, an outer grid, and donut text", async () => {
    const inputs = await makeInputs();
    build(inputs, pattern("Radial", "Labels", { series: 3, labels: true }));
    build(inputs, pattern("Radial", "Grid", { series: 2, grid: "default" }));
    build(inputs, pattern("Radial", "Text", { series: 1, donutText: true }));
  });

  it("renders legends with icon swatches", async () => {
    const inputs = await makeInputs();
    build(inputs, pattern("Bar", "IconLegend", { legend: true, icons: true }));
    build(inputs, pattern("Pie", "IconLegend", { legend: true, icons: true }));
  });
});
