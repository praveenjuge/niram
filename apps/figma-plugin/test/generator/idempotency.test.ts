// Layer 1 — pure-logic guarantees that don't need a real Figma:
//   1. Idempotency: re-running generation (same OR different preset) reuses
//      existing collections/variables in place; it never duplicates a
//      collection or leaves dangling variables.
//   2. Golden tree: the full variable/collection projection for a known preset
//      is captured as an inline snapshot so accidental shape changes surface in
//      review.
//
// Both rely on test/helpers/snapshot.ts to strip non-deterministic IDs.

import { beforeEach, describe, expect, it } from "vitest";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";
import type { FigmaMock } from "../figma-mock";
import { countState, snapshotCollections } from "../helpers/snapshot";

function resolved(code: string) {
  const result = resolvePreset(code);
  if (!result.ok) throw new Error(`fixture ${code} failed to resolve`);
  return result.data;
}

async function generate(code: string, font?: string) {
  return generateFromRegistry(resolved(code), {
    presetCode: code,
    presetSummary: font ? { font } : undefined,
  });
}

// The setup.ts beforeEach installs a fresh mock; grab the live reference.
function liveFigma(): FigmaMock {
  return (globalThis as unknown as { figma: FigmaMock }).figma;
}

describe("generation idempotency", () => {
  it("reuses collections and variables when re-run with the same preset", async () => {
    await generate("b2fA", "geist");
    const first = await countState(liveFigma());

    await generate("b2fA", "geist");
    const second = await countState(liveFigma());

    expect(second).toEqual(first);
  });

  it("does not duplicate collections when re-run with a different preset", async () => {
    await generate("b2fA", "geist");
    const first = await countState(liveFigma());

    // A different theme/font must update values in place, not add collections.
    await generate("bIkeymG", "inter");
    const second = await countState(liveFigma());

    expect(second.collectionCount).toBe(first.collectionCount);
    expect(second.collectionCount).toBe(3);
    // Tailwind colors + primitives are preset-independent, so their counts
    // must be identical across the two runs.
    expect(second.variableCounts["Tailwind / Colors"]).toBe(
      first.variableCounts["Tailwind / Colors"],
    );
    expect(second.variableCounts["Tailwind / Primitives"]).toBe(
      first.variableCounts["Tailwind / Primitives"],
    );
  });

  it("converges to an identical tree regardless of run order", async () => {
    // Path A: generate b2fA, then switch to bIkeymG.
    await generate("b2fA", "geist");
    await generate("bIkeymG", "inter");
    const pathA = await snapshotCollections(liveFigma());

    // Fresh document, Path B: generate bIkeymG directly.
    (globalThis as Record<string, unknown>).figma = (
      await import("../figma-mock")
    ).createFigmaMock();
    await generate("bIkeymG", "inter");
    const pathB = await snapshotCollections(liveFigma());

    // Re-running over an existing b2fA document must leave exactly the state a
    // clean bIkeymG run produces — no leftovers from the first preset.
    expect(pathA).toEqual(pathB);
  });
});

describe("golden variable tree", () => {
  beforeEach(async () => {
    await generate("b2fA", "geist");
  });

  it("keeps the three collections single-mode with stable mode names", async () => {
    const tree = await snapshotCollections(liveFigma());
    expect(
      tree.map((c) => ({ name: c.name, modes: c.modes })),
    ).toMatchInlineSnapshot(`
      [
        {
          "modes": [
            "Default",
          ],
          "name": "shadcn / Theme",
        },
        {
          "modes": [
            "Default",
          ],
          "name": "Tailwind / Colors",
        },
        {
          "modes": [
            "Default",
          ],
          "name": "Tailwind / Primitives",
        },
      ]
    `);
  });

  it("captures a representative slice of theme aliasing", async () => {
    const tree = await snapshotCollections(liveFigma());
    const theme = tree.find((c) => c.name === "shadcn / Theme");
    expect(theme).toBeDefined();
    // `background` should alias into the Tailwind palette, not store a literal.
    const background = theme!.variables.find((v) => v.name === "background");
    expect(background).toBeDefined();
    expect(background!.type).toBe("COLOR");
  });
});
