import { describe, expect, it } from "vitest";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

function resolved(code: string) {
  const result = resolvePreset(code);
  if (!result.ok) throw new Error(`fixture ${code} failed to resolve`);
  return result.data;
}

describe("generateFromRegistry", () => {
  it("produces the three named collections end to end", async () => {
    const data = resolved("b2fA");
    const result = await generateFromRegistry(data, {
      presetCode: "b2fA",
      presetSummary: { font: "geist" },
    });

    const names = result.collections.map((c) => c.name);
    expect(names).toEqual([
      "Tailwind / Colors",
      "Tailwind / Primitives",
      "shadcn / Theme",
    ]);
    for (const collection of result.collections) {
      expect(collection.variableCount).toBeGreaterThan(0);
    }
  });

  it("reports a non-negative fallback theme color count", async () => {
    const data = resolved("b2fA");
    const result = await generateFromRegistry(data, { presetCode: "b2fA" });
    // fallbackThemeColors mirrors the theme step's unaliased count.
    expect(typeof result.fallbackThemeColors).toBe("number");
    expect(result.fallbackThemeColors).toBeGreaterThanOrEqual(0);
    expect(result.presetCode).toBe("b2fA");
  });

  it("exposes populated variable maps", async () => {
    const data = resolved("bIkeymG");
    const result = await generateFromRegistry(data, { presetCode: "bIkeymG" });
    expect(result.variables.tailwindColors.size).toBeGreaterThan(0);
    expect(result.variables.primitives.size).toBeGreaterThan(0);
    expect(result.variables.theme.light.size).toBeGreaterThan(0);
    expect(result.variables.theme.dark.size).toBeGreaterThan(0);
  });
});
