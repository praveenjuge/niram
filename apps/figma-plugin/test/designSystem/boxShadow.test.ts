// Regression guard: the Shadows section (and every frame wrapping a shadow
// tile) must NOT clip its content. Figma frames clip by default, which cuts
// off the shadow spread/blur at the frame edge — so each wrapper has to opt
// out explicitly. This test fails if any of them clips again.

import { describe, expect, it } from "vitest";
import { addBoxShadows } from "../../src/designSystem/sections/boxShadow";
import type { DesignSystemInputs } from "../../src/designSystem";
import { SHADOW_STYLES } from "../../src/effects";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

type NodeLike = {
  type: string;
  name: string;
  children: NodeLike[];
  effects: unknown[];
  clipsContent?: boolean;
  createPage?(): NodeLike;
};

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
    effectStyles: generated.effectStyles,
  };
}

function page(): NodeLike {
  return (
    globalThis as { figma: { createPage(): NodeLike } }
  ).figma.createPage();
}

// Find the first node that carries a drop/inner shadow effect.
function findShadowTile(root: NodeLike): NodeLike | undefined {
  const effects = root.effects ?? [];
  const hasShadow = effects.some(
    (e) =>
      e &&
      typeof e === "object" &&
      ((e as { type?: string }).type === "DROP_SHADOW" ||
        (e as { type?: string }).type === "INNER_SHADOW"),
  );
  if (hasShadow) return root;
  for (const child of root.children ?? []) {
    const found = findShadowTile(child);
    if (found) return found;
  }
  return undefined;
}

// Collect the chain of ancestors from `target` up to (and including) `root`.
function ancestryTo(
  root: NodeLike,
  target: NodeLike,
  trail: NodeLike[] = [],
): NodeLike[] | undefined {
  const next = [...trail, root];
  if (root === target) return next;
  for (const child of root.children ?? []) {
    const found = ancestryTo(child, target, next);
    if (found) return found;
  }
  return undefined;
}

describe("addBoxShadows", () => {
  it("does not clip the Shadows section, so shadows can spread", async () => {
    const inputs = await makeInputs();
    const p = page();
    await addBoxShadows(p as unknown as PageNode, inputs);

    const section = p.children.find((c) => c.name === "Shadows");
    expect(section).toBeDefined();
    expect(section!.clipsContent).toBe(false);
  });

  it("leaves no clipping frame between a shadow tile and the section", async () => {
    const inputs = await makeInputs();
    const p = page();
    await addBoxShadows(p as unknown as PageNode, inputs);

    const section = p.children.find((c) => c.name === "Shadows")!;
    const tile = findShadowTile(section);
    expect(tile).toBeDefined();

    // Every frame from the section down to (but not including) the tile must
    // have clipping disabled, or the shadow bleed gets cut off.
    const chain = ancestryTo(section, tile!)!;
    const wrappers = chain.slice(0, -1); // drop the tile itself
    for (const node of wrappers) {
      expect(node.clipsContent).toBe(false);
    }
  });

  it("renders a tile for every shadow token", async () => {
    const inputs = await makeInputs();
    const p = page();
    await addBoxShadows(p as unknown as PageNode, inputs);

    const section = p.children.find((c) => c.name === "Shadows")!;
    let tiles = 0;
    const walk = (node: NodeLike) => {
      const effects = node.effects ?? [];
      if (
        effects.some(
          (e) =>
            e &&
            typeof e === "object" &&
            (e as { type?: string }).type === "DROP_SHADOW",
        )
      ) {
        tiles++;
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(section);
    // One tile per drop-shadow token (inner shadows use INNER_SHADOW).
    expect(tiles).toBe(SHADOW_STYLES.length);
  });
});
