import { describe, expect, it } from "vitest";
import { buildDesignSystem } from "../../src/designSystem";
import type { DesignSystemInputs } from "../../src/designSystem";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";
import type { FigmaMock } from "../figma-mock";

async function makeInputs(code = "b2fA"): Promise<DesignSystemInputs> {
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error("fixture failed to resolve");
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
  });
  return {
    presetCode: code,
    tailwindColors: generated.variables.tailwindColors,
    primitives: generated.variables.primitives,
    theme: generated.variables.theme,
  };
}

describe("buildDesignSystem", () => {
  it("builds the page and reports a node count", async () => {
    const inputs = await makeInputs();
    const result = await buildDesignSystem(inputs);
    expect(result.nodeCount).toBeGreaterThan(0);

    const page = (
      globalThis as { figma: { root: { children: { name: string }[] } } }
    ).figma.root.children.find((c) => c.name === "Niram");
    expect(page).toBeDefined();
    expect(
      (page as unknown as { children: unknown[] }).children.length,
    ).toBeGreaterThan(0);
  });

  it("reports build and post-processing phase progress", async () => {
    const inputs = await makeInputs();
    const events: { phase: string; current: number; total: number }[] = [];
    await buildDesignSystem({
      ...inputs,
      onProgress: (event) => events.push(event),
    });

    const phases = new Set(events.map((e) => e.phase));
    // Build phase plus every post-processing sweep reports progress.
    expect(phases).toContain("building");
    expect(phases).toContain("text-styles");
    expect(phases).toContain("binding");
    expect(phases).toContain("layout");

    // The build phase steps once per section (11) and emits a final "Done".
    const building = events.filter((e) => e.phase === "building");
    expect(building.length).toBe(12);
    expect(building.at(-1)).toMatchObject({ current: 11, total: 11 });
    // The post-build sweeps end at 100% of the section nodes they processed.
    const lastBinding = events.filter((e) => e.phase === "binding").at(-1)!;
    expect(lastBinding.current).toBe(lastBinding.total);
  });

  it("rebuilds in place rather than duplicating the page", async () => {
    const inputs = await makeInputs();
    await buildDesignSystem(inputs);
    await buildDesignSystem(inputs);
    const figma = (
      globalThis as { figma: { root: { children: { name: string }[] } } }
    ).figma;
    const pages = figma.root.children.filter((c) => c.name === "Niram");
    expect(pages).toHaveLength(1);
  });

  it("leaves frames owned by other regions untouched on a rebuild", async () => {
    const inputs = await makeInputs();
    await buildDesignSystem(inputs);

    const figma = (globalThis as unknown as { figma: any }).figma;
    const page = figma.root.children.find((c: any) => c.name === "Niram");
    // Seed a frame the Components region "owns" — the design-system rebuild
    // must clear only its own tagged frames and leave this one in place.
    const foreign = figma.createFrame();
    foreign.setPluginData("niramRegion", "components");
    page.appendChild(foreign);

    await buildDesignSystem(inputs);

    expect(page.children).toContain(foreign);
    expect(foreign.getPluginData("niramRegion")).toBe("components");
  });

  it("publishes the Tailwind text styles and maps matching text nodes onto them", async () => {
    const inputs = await makeInputs();
    await buildDesignSystem(inputs);

    const figma = (globalThis as unknown as { figma: FigmaMock }).figma;
    const styles = await figma.getLocalTextStylesAsync();
    // 13 sizes × 9 weights.
    expect(styles).toHaveLength(117);

    const page = figma.root.children.find(
      (c) => (c as unknown as { name: string }).name === "Niram",
    );
    const styled = countStyledText(page as unknown as TreeNode);
    expect(styled).toBeGreaterThan(0);
  });

  it("binds section chrome + labels to theme color variables", async () => {
    const inputs = await makeInputs();
    await buildDesignSystem(inputs);

    const figma = (globalThis as unknown as { figma: FigmaMock }).figma;
    const page = figma.root.children.find(
      (c) => (c as unknown as { name: string }).name === "Niram",
    ) as unknown as TreeNode;

    // Section frames bind their fill to a theme surface (`card`/`background`)
    // and headings/labels to `foreground`/`muted-foreground`, so the chrome is
    // no longer a frozen literal gray.
    expect(countBoundFills(page)).toBeGreaterThan(0);
  });

  it("attaches effect styles to the shadow/blur showcase tiles", async () => {
    const inputs = await makeInputs();
    await buildDesignSystem(inputs);

    const figma = (globalThis as unknown as { figma: FigmaMock }).figma;
    const page = figma.root.children.find(
      (c) => (c as unknown as { name: string }).name === "Niram",
    ) as unknown as TreeNode;

    expect(countEffectStyled(page)).toBeGreaterThan(0);
  });

  it("binds primitive variables onto spacing/radius/border/font fields", async () => {
    const inputs = await makeInputs();
    await buildDesignSystem(inputs);

    const figma = (globalThis as unknown as { figma: FigmaMock }).figma;
    const page = figma.root.children.find(
      (c) => (c as unknown as { name: string }).name === "Niram",
    ) as unknown as TreeNode;

    const fields = collectBoundFields(page);
    // The post-build token sweep binds at least one of each primitive family.
    expect(
      fields.some((f) =>
        ["itemSpacing", "paddingTop", "paddingLeft", "width"].includes(f),
      ),
    ).toBe(true);
    expect(fields.some((f) => f.endsWith("Radius"))).toBe(true);
    expect(
      fields.some((f) => f.startsWith("strokeWeight") || f.endsWith("Weight")),
    ).toBe(true);
    expect(fields).toContain("fontSize");
  });
});

type TreeNode = {
  type: string;
  textStyleId?: string;
  effectStyleId?: string;
  fills?: unknown;
  boundVariables?: Record<string, unknown>;
  children?: TreeNode[];
};

function countStyledText(node: TreeNode | undefined): number {
  if (!node) return 0;
  let count =
    node.type === "TEXT" && typeof node.textStyleId === "string" ? 1 : 0;
  for (const child of node.children ?? []) count += countStyledText(child);
  return count;
}

// A paint carries a bound color variable when the binding helper rewrote its
// `boundVariables.color` alias (see test/figma-mock setBoundVariableForPaint).
function fillIsBound(node: TreeNode): boolean {
  const fills = node.fills;
  if (!Array.isArray(fills)) return false;
  return fills.some(
    (paint) =>
      paint &&
      typeof paint === "object" &&
      (paint as { boundVariables?: { color?: unknown } }).boundVariables
        ?.color !== undefined,
  );
}

function countBoundFills(node: TreeNode | undefined): number {
  if (!node) return 0;
  let count = fillIsBound(node) ? 1 : 0;
  for (const child of node.children ?? []) count += countBoundFills(child);
  return count;
}

function countEffectStyled(node: TreeNode | undefined): number {
  if (!node) return 0;
  let count =
    typeof node.effectStyleId === "string" && node.effectStyleId.length > 0
      ? 1
      : 0;
  for (const child of node.children ?? []) count += countEffectStyled(child);
  return count;
}

// Collect every primitive (non-color) field name that ended up bound to a
// variable after the post-build token sweep.
function collectBoundFields(
  node: TreeNode | undefined,
  acc: string[] = [],
): string[] {
  if (!node) return acc;
  for (const field of Object.keys(node.boundVariables ?? {})) acc.push(field);
  for (const child of node.children ?? []) collectBoundFields(child, acc);
  return acc;
}
