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

  it("reconstructs a modes-strategy collection into shared light/dark maps", async () => {
    liveFigma().__setModeLimit(4);
    const resolved = resolvePreset("b2fA");
    if (!resolved.ok) throw new Error(resolved.error);
    await generateFromRegistry(resolved.data, {
      presetCode: resolved.presetCode,
      presetSummary: { font: "geist" },
      theming: { strategy: "modes" },
    });

    const existing = await loadExistingGeneratedAssets("replacement-code");
    expect(existing).not.toBeNull();
    expect(existing!.themingStrategy).toBe("modes");

    // One unprefixed variable per role populates BOTH maps.
    const lightBg = existing!.variables.theme.light.get("background");
    const darkBg = existing!.variables.theme.dark.get("background");
    expect(darkBg).toBeDefined();
    expect(darkBg!.id).toBe(lightBg!.id);

    // Mode ids are surfaced so consumers can pin explicit modes.
    expect(existing!.variables.theme.modeIds).toBeDefined();
  });
});
