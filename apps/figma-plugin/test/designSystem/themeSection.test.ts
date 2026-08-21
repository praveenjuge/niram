// The Design System "Theme" section renders split chips (light top, dark
// bottom). Under the twin-variables strategy each half binds a different
// variable; under the variable-modes strategy both halves bind the SAME
// variable and pin explicit Light/Dark modes. These tests pin down the modes
// behavior.

import { describe, expect, it } from "vitest";
import { buildDesignSystem } from "../../src/designSystem";
import type { DesignSystemInputs } from "../../src/designSystem";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";
import type { FigmaMock } from "../figma-mock";

function liveFigma(): FigmaMock {
  return (globalThis as unknown as { figma: FigmaMock }).figma;
}

async function makeInputs(
  theming?: { strategy: "twins" | "modes" },
): Promise<DesignSystemInputs> {
  const code = "b2fA";
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error("fixture failed to resolve");
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
    theming,
  });
  return {
    presetCode: code,
    tailwindColors: generated.variables.tailwindColors,
    primitives: generated.variables.primitives,
    theme: generated.variables.theme,
  };
}

type FakeNodeLike = {
  name: string;
  children: FakeNodeLike[];
  __explicitVariableModes?: Record<string, string>;
};

function walk(node: FakeNodeLike, visit: (n: FakeNodeLike) => void) {
  visit(node);
  for (const child of node.children) walk(child, visit);
}

async function themeSectionNodes() {
  const page = liveFigma().root.children.find((c) => c.name === "Niram")!;
  let section: FakeNodeLike | undefined;
  walk(page as unknown as FakeNodeLike, (node) => {
    if (!section && node.name === "Theme") section = node;
  });
  expect(section).toBeDefined();
  const nodes: FakeNodeLike[] = [];
  walk(section!, (node) => nodes.push(node));
  return nodes;
}

describe("theme section · variable modes strategy", () => {
  it("pins explicit Light and Dark modes on the swatch halves", async () => {
    liveFigma().__setModeLimit(4);
    const inputs = await makeInputs({ strategy: "modes" });
    await buildDesignSystem(inputs);

    const modeIds = inputs.theme.modeIds;
    expect(modeIds).toBeDefined();

    // Every explicit mode pinned inside the section must be one of the two
    // theme modes, and both must appear (light halves + dark halves).
    const pinned = new Set<string>();
    for (const node of await themeSectionNodes()) {
      const modes = node.__explicitVariableModes ?? {};
      for (const modeId of Object.values(modes)) pinned.add(modeId);
    }
    expect(pinned.has(modeIds!.light)).toBe(true);
    expect(pinned.has(modeIds!.dark)).toBe(true);
  });

  it("pins no explicit modes under the twins strategy", async () => {
    const inputs = await makeInputs();
    await buildDesignSystem(inputs);

    for (const node of await themeSectionNodes()) {
      expect(node.__explicitVariableModes ?? {}).toEqual({});
    }
  });
});
