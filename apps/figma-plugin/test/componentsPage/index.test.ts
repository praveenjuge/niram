import { describe, expect, it } from "vitest";
import { buildComponentsPage } from "../../src/componentsPage";
import type { ComponentsInputs } from "../../src/componentsPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

async function makeInputs(code = "b2fA"): Promise<ComponentsInputs> {
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
  };
}

describe("buildComponentsPage", () => {
  it("builds the Components grid on the Niram page with nodes", async () => {
    const result = await buildComponentsPage(await makeInputs());
    expect(result.nodeCount).toBeGreaterThan(0);
    const page = (
      globalThis as { figma: { root: { children: { name: string }[] } } }
    ).figma.root.children.find((c) => c.name === "Niram");
    expect(page).toBeDefined();
  });

  it("reports build and post-processing phase progress for all sections", async () => {
    const events: { phase: string; current: number; total: number }[] = [];
    await buildComponentsPage({
      ...(await makeInputs()),
      onProgress: (event) => events.push(event),
    });

    const phases = new Set(events.map((e) => e.phase));
    expect(phases).toContain("building");
    expect(phases).toContain("text-styles");
    expect(phases).toContain("binding");
    expect(phases).toContain("layout");

    // 57 sections each step the build phase, plus a final "Done" step.
    const building = events.filter((e) => e.phase === "building");
    expect(building.length).toBe(58);
    expect(building.at(-1)).toMatchObject({ current: 57, total: 57 });
    // The sweeps complete (current === total of the nodes they walked).
    const lastText = events.filter((e) => e.phase === "text-styles").at(-1)!;
    expect(lastText.current).toBe(lastText.total);
  });

  it("offsets the grid to the right of an existing Design System region", async () => {
    const figma = (globalThis as unknown as { figma: any }).figma;
    // Seed a Niram page that already carries a Design System region frame, so
    // regionOriginX has a non-zero right edge to anchor the grid past.
    const page = figma.createPage();
    page.name = "Niram";
    const dsFrame = figma.createFrame();
    dsFrame.x = 0;
    dsFrame.width = 500;
    dsFrame.setPluginData("niramRegion", "design-system");
    page.appendChild(dsFrame);

    await buildComponentsPage(await makeInputs());

    // The component frames this run tagged should all start to the right of the
    // Design System region's right edge (500) plus the region gutter.
    const componentFrames = (page.children as any[]).filter(
      (c) => c.getPluginData("niramRegion") === "components",
    );
    expect(componentFrames.length).toBeGreaterThan(0);
    const minX = Math.min(...componentFrames.map((c: any) => c.x));
    expect(minX).toBeGreaterThanOrEqual(500);
  });

  it("reuses and clears its region on the Niram page on rebuild", async () => {
    const inputs = await makeInputs();
    await buildComponentsPage(inputs);
    await buildComponentsPage(inputs);

    const pages = (
      globalThis as { figma: { root: { children: { name: string }[] } } }
    ).figma.root.children.filter((c) => c.name === "Niram");
    // The second build clears its own region's frames rather than minting a
    // duplicate page (idempotent rebuild on the shared page).
    expect(pages).toHaveLength(1);
  });
});
