import { describe, expect, it } from "vitest";
import {
  generateFromRegistry,
  loadExistingGeneratedAssets,
} from "../../src/generator";
import { resolvePreset } from "../../src/registry";
import type { FigmaMock } from "../figma-mock";
import { countState } from "../helpers/snapshot";

function liveFigma(): FigmaMock {
  return (globalThis as unknown as { figma: FigmaMock }).figma;
}

describe("existing generated assets", () => {
  it("reconstructs variables and styles without mutating the document", async () => {
    const resolved = resolvePreset("b2fA");
    if (!resolved.ok) throw new Error(resolved.error);
    const generated = await generateFromRegistry(resolved.data, {
      presetCode: resolved.presetCode,
      presetSummary: { font: "geist" },
    });
    const before = await countState(liveFigma());

    const existing = await loadExistingGeneratedAssets("replacement-code");
    const after = await countState(liveFigma());

    expect(existing).not.toBeNull();
    expect(after).toEqual(before);
    expect(existing!.variables.tailwindColors.size).toBe(
      generated.variables.tailwindColors.size,
    );
    expect(existing!.variables.primitives.size).toBe(
      generated.variables.primitives.size,
    );
    expect(existing!.variables.radiusScale.get("lg")?.id).toBe(
      generated.variables.radiusScale.get("lg")?.id,
    );
    expect(existing!.fonts).toEqual(generated.fonts);
    expect(existing!.effectStyles.count).toBe(generated.effectStyles.count);
    expect(existing!.textStyles.count).toBe(generated.textStyles.count);
  });

  it("returns null before Niram collections exist", async () => {
    await expect(loadExistingGeneratedAssets("b2fA")).resolves.toBeNull();
  });
});
