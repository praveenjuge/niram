import { describe, expect, it } from "vitest";
import { TAILWIND_COLORS } from "../../src/colors";
import { ensureTailwindColorCollection } from "../../src/generator/tailwindColors";
import { ensureThemeCollection } from "../../src/generator/theme";
import type { ResolvedRegistry } from "../../src/generator/types";
import { resetLoadedFontsCache } from "../../src/fonts";
import type { FigmaMock } from "../figma-mock";

type AnyVar = { id: string; valuesByMode: Record<string, unknown> };
type Alias = { type: "VARIABLE_ALIAS"; id: string };

function soleValue(variable: unknown): unknown {
  return Object.values((variable as AnyVar).valuesByMode)[0];
}

function makeRegistry(): ResolvedRegistry {
  return {
    name: "test",
    // The generator only reads cssVars; config is along for the ride.
    config: {} as ResolvedRegistry["config"],
    cssVars: {
      light: {
        background: "oklch(1 0 0)", // -> white alias
        primary: TAILWIND_COLORS.slate["500"], // -> slate/500 alias
        custom: "oklch(0.123 0.456 78)", // -> literal RGBA (no alias)
        radius: "0.625rem", // -> FLOAT 10
      },
      dark: {
        background: "oklch(0 0 0)", // -> dark-background, black alias
      },
    },
  };
}

describe("ensureThemeCollection", () => {
  it("aliases matching colors to the Tailwind collection", async () => {
    const tw = await ensureTailwindColorCollection();
    const result = await ensureThemeCollection(makeRegistry(), tw);

    const whiteId = (tw.get("white") as unknown as AnyVar).id;
    const slateId = (tw.get("slate/500") as unknown as AnyVar).id;

    const background = soleValue(result.maps.light.get("background")) as Alias;
    expect(background).toEqual({ type: "VARIABLE_ALIAS", id: whiteId });

    const primary = soleValue(result.maps.light.get("primary")) as Alias;
    expect(primary).toEqual({ type: "VARIABLE_ALIAS", id: slateId });
  });

  it("falls back to a literal RGBA for non-Tailwind colors", async () => {
    const tw = await ensureTailwindColorCollection();
    const result = await ensureThemeCollection(makeRegistry(), tw);

    const custom = soleValue(result.maps.light.get("custom")) as Record<
      string,
      unknown
    >;
    expect(custom).not.toBeNull();
    expect(custom.type).toBeUndefined(); // not an alias
    expect(custom).toHaveProperty("r");
    expect(result.unaliasedCount).toBe(1);
  });

  it("parses radius rem into a FLOAT of pixels", async () => {
    const tw = await ensureTailwindColorCollection();
    const result = await ensureThemeCollection(makeRegistry(), tw);
    expect(soleValue(result.maps.light.get("radius"))).toBe(10); // 0.625 * 16
  });

  it("parses a px radius as a literal pixel FLOAT", async () => {
    const tw = await ensureTailwindColorCollection();
    const registry = makeRegistry();
    registry.cssVars.light.radius = "12px";
    const result = await ensureThemeCollection(registry, tw);
    expect(soleValue(result.maps.light.get("radius"))).toBe(12);
  });

  it("parses a unitless radius as a plain number", async () => {
    const tw = await ensureTailwindColorCollection();
    const registry = makeRegistry();
    registry.cssVars.light.radius = "8";
    const result = await ensureThemeCollection(registry, tw);
    expect(soleValue(result.maps.light.get("radius"))).toBe(8);
  });

  it("leaves a non-numeric radius unset (parseLengthRem returns null)", async () => {
    const tw = await ensureTailwindColorCollection();
    const registry = makeRegistry();
    registry.cssVars.light.radius = "not-a-length";
    const result = await ensureThemeCollection(registry, tw);
    // The FLOAT variable is created but no value is written for the mode.
    const radius = result.maps.light.get("radius") as unknown as {
      valuesByMode: Record<string, unknown>;
    };
    expect(radius).toBeDefined();
    expect(Object.keys(radius.valuesByMode)).toHaveLength(0);
  });

  it("emits dark values as a separate dark-prefixed variable", async () => {
    const tw = await ensureTailwindColorCollection();
    const result = await ensureThemeCollection(makeRegistry(), tw);
    const darkBg = result.maps.dark.get("background") as unknown as {
      name: string;
    };
    expect(darkBg).toBeDefined();
    expect(darkBg.name).toBe("dark-background");
  });

  it("accounts for every variable processed", async () => {
    const tw = await ensureTailwindColorCollection();
    const result = await ensureThemeCollection(makeRegistry(), tw);
    // 4 light keys + 1 dark key + 2 font variables (font-sans, font-heading)
    // + 7 shadcn radius-scale steps (sm…4xl).
    expect(result.variableCount).toBe(14);
  });

  it("derives the shadcn radius scale from the preset --radius", async () => {
    const tw = await ensureTailwindColorCollection();
    // The default --radius is 10px. shadcn derives sm…4xl directly from it
    // with 0.6, 0.8, 1, 1.4, 1.8, 2.2, and 2.6 multipliers.
    const result = await ensureThemeCollection(makeRegistry(), tw);
    expect(soleValue(result.radiusScale.get("sm"))).toBe(6);
    expect(soleValue(result.radiusScale.get("md"))).toBe(8);
    expect(soleValue(result.radiusScale.get("lg"))).toBe(10);
    expect(soleValue(result.radiusScale.get("xl"))).toBe(14);
    expect(soleValue(result.radiusScale.get("2xl"))).toBe(18);
    expect(soleValue(result.radiusScale.get("3xl"))).toBe(22);
    expect(soleValue(result.radiusScale.get("4xl"))).toBe(26);
    // none / xs / full are structural and never part of this derived scale.
    expect(result.radiusScale.has("none")).toBe(false);
    expect(result.radiusScale.has("full")).toBe(false);
  });

  it("collapses the shadcn radius scale to 0 for radius=none", async () => {
    const tw = await ensureTailwindColorCollection();
    const registry = makeRegistry();
    registry.cssVars.light.radius = "0";
    const result = await ensureThemeCollection(registry, tw);
    expect(soleValue(result.radiusScale.get("sm"))).toBe(0);
    expect(soleValue(result.radiusScale.get("lg"))).toBe(0);
  });

  it("scales the shadcn radius scale up for radius=large", async () => {
    const tw = await ensureTailwindColorCollection();
    const registry = makeRegistry();
    registry.cssVars.light.radius = "0.875rem";
    const result = await ensureThemeCollection(registry, tw);
    expect(soleValue(result.radiusScale.get("lg"))).toBeCloseTo(14);
    expect(soleValue(result.radiusScale.get("md"))).toBeCloseTo(11.2);
  });

  it("emits body + heading font variables, defaulting to Inter", async () => {
    const tw = await ensureTailwindColorCollection();
    const result = await ensureThemeCollection(makeRegistry(), tw);
    // config has no font/fontHeading, so both resolve to the Inter fallback.
    expect(result.fonts).toEqual({ body: "Inter", heading: "Inter" });
    expect(result.fontVars.body).toBeDefined();
    expect(result.fontVars.heading).toBeDefined();
    expect(soleValue(result.fontVars.body)).toBe("Inter");
    expect(soleValue(result.fontVars.heading)).toBe("Inter");
    expect(
      (result.fontVars.body as unknown as { resolvedType: string })
        .resolvedType,
    ).toBe("STRING");
  });

  it("uses the preset body + heading fonts, with heading inherit falling back", async () => {
    const tw = await ensureTailwindColorCollection();
    const registry = makeRegistry();
    registry.config = {
      font: "geist",
      fontHeading: "inherit",
    } as ResolvedRegistry["config"];
    const result = await ensureThemeCollection(registry, tw);
    // Geist body; heading "inherit" reuses the body family.
    expect(result.fonts).toEqual({ body: "Geist", heading: "Geist" });

    const registry2 = makeRegistry();
    registry2.config = {
      font: "geist",
      fontHeading: "lora",
    } as ResolvedRegistry["config"];
    const result2 = await ensureThemeCollection(registry2, tw);
    expect(result2.fonts).toEqual({ body: "Geist", heading: "Lora" });
  });

  it("loads the resolved font families before writing the font variables", async () => {
    const tw = await ensureTailwindColorCollection();
    const registry = makeRegistry();
    registry.config = {
      font: "figtree",
      fontHeading: "lora",
    } as ResolvedRegistry["config"];

    await ensureThemeCollection(registry, tw);

    // Figma rejects setValueForMode on a bound font variable unless the font
    // is loaded first; ensure the generator loaded both families.
    const loaded = (
      figma.loadFontAsync as unknown as {
        mock: { calls: Array<[{ family: string; style: string }]> };
      }
    ).mock.calls.map((c) => c[0].family);
    expect(loaded).toContain("Figtree");
    expect(loaded).toContain("Lora");
  });

  it("loads Playfair Display Medium before rewriting an existing font variable", async () => {
    const tw = await ensureTailwindColorCollection();
    const firstRegistry = makeRegistry();
    firstRegistry.config = {
      font: "playfair-display",
      fontHeading: "inherit",
    } as ResolvedRegistry["config"];
    const first = await ensureThemeCollection(firstRegistry, tw);

    const bodyVar = first.fontVars.body as unknown as {
      setValueForMode(modeId: string, value: unknown): void;
    };
    const originalSetValue = bodyVar.setValueForMode.bind(bodyVar);
    let mediumLoaded = false;
    const originalLoadFont = figma.loadFontAsync;
    (figma as unknown as { loadFontAsync: unknown }).loadFontAsync = (font: {
      family: string;
      style: string;
    }) => {
      if (font.family === "Playfair Display" && font.style === "Medium") {
        mediumLoaded = true;
      }
      return Promise.resolve();
    };
    bodyVar.setValueForMode = (modeId, value) => {
      if (!mediumLoaded) {
        throw new Error('unloaded font "Playfair Display Medium"');
      }
      originalSetValue(modeId, value);
    };

    const secondRegistry = makeRegistry();
    secondRegistry.config = {
      font: "inter",
      fontHeading: "inherit",
    } as ResolvedRegistry["config"];
    try {
      // Forget the faces the first pass loaded so this pass must request them
      // itself — mirroring the fresh-session guarantee the regression guards.
      resetLoadedFontsCache();
      await expect(
        ensureThemeCollection(secondRegistry, tw),
      ).resolves.toBeDefined();
      expect(mediumLoaded).toBe(true);
    } finally {
      (figma as unknown as { loadFontAsync: unknown }).loadFontAsync =
        originalLoadFont;
      bodyVar.setValueForMode = originalSetValue;
    }
  });
});

describe("ensureThemeCollection · variable modes strategy", () => {
  function liveFigma(): FigmaMock {
    return (globalThis as unknown as { figma: FigmaMock }).figma;
  }

  function themeCollection() {
    return figma.variables
      .getLocalVariableCollectionsAsync()
      .then((all) => all.find((c) => c.name === "shadcn / Theme")!);
  }

  it("writes light and dark values into one unprefixed variable per role", async () => {
    liveFigma().__setModeLimit(4);
    const tw = await ensureTailwindColorCollection();
    const result = await ensureThemeCollection(makeRegistry(), tw, {
      strategy: "modes",
    });

    expect(result.strategy).toBe("modes");
    expect(result.fellBack).toBe(false);

    const collection = await themeCollection();
    expect(collection.modes.map((m) => m.name)).toEqual(["Light", "Dark"]);
    const lightId = collection.modes[0]!.modeId;
    const darkId = collection.modes[1]!.modeId;

    // Both maps reference the SAME variable; it carries both values.
    const lightBg = result.maps.light.get("background") as unknown as AnyVar;
    const darkBg = result.maps.dark.get("background") as unknown as AnyVar;
    expect(darkBg.id).toBe(lightBg.id);
    expect(lightBg.name).toBe("background");
    expect(lightBg.valuesByMode[lightId]).toEqual({
      type: "VARIABLE_ALIAS",
      id: (tw.get("white") as unknown as AnyVar).id,
    });
    expect(lightBg.valuesByMode[darkId]).toEqual({
      type: "VARIABLE_ALIAS",
      id: (tw.get("black") as unknown as AnyVar).id,
    });

    // The mode ids ride along for consumers that pin explicit modes.
    expect(result.maps.modeIds).toEqual({ light: lightId, dark: darkId });
  });

  it("accounts for one variable per key plus fonts and radius steps", async () => {
    liveFigma().__setModeLimit(4);
    const tw = await ensureTailwindColorCollection();
    const result = await ensureThemeCollection(makeRegistry(), tw, {
      strategy: "modes",
    });
    // Union of light+dark keys is 4 (background, primary, custom, radius)
    // + 2 font variables + 7 radius-scale steps.
    expect(result.variableCount).toBe(13);
  });

  it("records the strategy on the collection", async () => {
    liveFigma().__setModeLimit(4);
    const tw = await ensureTailwindColorCollection();
    await ensureThemeCollection(makeRegistry(), tw, { strategy: "modes" });
    const collection = await themeCollection();
    expect(collection.getPluginData("niramThemeStrategy")).toBe("modes");
  });

  it("falls back to twins when the tier refuses addMode", async () => {
    // Mode limit stays at the free-tier default of 1.
    const tw = await ensureTailwindColorCollection();
    const result = await ensureThemeCollection(makeRegistry(), tw, {
      strategy: "modes",
    });

    expect(result.strategy).toBe("twins");
    expect(result.fellBack).toBe(true);

    const collection = await themeCollection();
    expect(collection.modes.map((m) => m.name)).toEqual(["Default"]);
    expect(collection.getPluginData("niramThemeStrategy")).toBe("twins");

    const darkBg = result.maps.dark.get("background") as unknown as {
      name: string;
    };
    expect(darkBg.name).toBe("dark-background");
  });

  it("removes dark-* twins when migrating from twins to modes", async () => {
    const tw = await ensureTailwindColorCollection();
    // First run: twins (default).
    await ensureThemeCollection(makeRegistry(), tw);
    let collection = await themeCollection();
    let names: string[] = [];
    for (const id of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(id);
      if (variable) names.push(variable.name);
    }
    expect(names).toContain("dark-background");

    // Second run: modes.
    liveFigma().__setModeLimit(4);
    await ensureThemeCollection(makeRegistry(), tw, { strategy: "modes" });
    collection = await themeCollection();

    names = [];
    for (const id of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(id);
      if (variable) names.push(variable.name);
    }
    expect(names.filter((name) => name.indexOf("dark-") === 0)).toEqual([]);
    expect(names).toContain("background");
  });

  it("collapses modes and recreates twins when migrating back", async () => {
    liveFigma().__setModeLimit(4);
    const tw = await ensureTailwindColorCollection();
    await ensureThemeCollection(makeRegistry(), tw, { strategy: "modes" });

    // Second run without a strategy request keeps the recorded "modes"
    // strategy (idempotent re-run), so pass twins explicitly.
    await ensureThemeCollection(makeRegistry(), tw, { strategy: "twins" });
    const collection = await themeCollection();
    expect(collection.modes.map((m) => m.name)).toEqual(["Default"]);

    const names: string[] = [];
    for (const id of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(id);
      if (variable) names.push(variable.name);
    }
    expect(names).toContain("dark-background");
  });

  it("keeps the recorded strategy when no explicit request is made", async () => {
    liveFigma().__setModeLimit(4);
    const tw = await ensureTailwindColorCollection();
    await ensureThemeCollection(makeRegistry(), tw, { strategy: "modes" });
    const result = await ensureThemeCollection(makeRegistry(), tw);
    expect(result.strategy).toBe("modes");
    const collection = await themeCollection();
    expect(collection.modes.map((m) => m.name)).toEqual(["Light", "Dark"]);
  });
});
