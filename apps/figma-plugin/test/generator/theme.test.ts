import { describe, expect, it } from "vitest";
import { TAILWIND_COLORS } from "../../src/colors";
import { ensureTailwindColorCollection } from "../../src/generator/tailwindColors";
import { ensureThemeCollection } from "../../src/generator/theme";
import type { ResolvedRegistry } from "../../src/generator/types";

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
    // config.radius is undefined here → default scale (matches Tailwind values).
    const result = await ensureThemeCollection(makeRegistry(), tw);
    expect(soleValue(result.radiusScale.get("sm"))).toBe(4);
    expect(soleValue(result.radiusScale.get("md"))).toBe(6);
    expect(soleValue(result.radiusScale.get("lg"))).toBe(8);
    expect(soleValue(result.radiusScale.get("xl"))).toBe(12);
    // none / xs / full are structural and never part of this derived scale.
    expect(result.radiusScale.has("none")).toBe(false);
    expect(result.radiusScale.has("full")).toBe(false);
  });

  it("collapses the shadcn radius scale to 0 for radius=none", async () => {
    const tw = await ensureTailwindColorCollection();
    const registry = makeRegistry();
    registry.config = { radius: "none" } as ResolvedRegistry["config"];
    const result = await ensureThemeCollection(registry, tw);
    expect(soleValue(result.radiusScale.get("sm"))).toBe(0);
    expect(soleValue(result.radiusScale.get("lg"))).toBe(0);
  });

  it("scales the shadcn radius scale up for radius=large", async () => {
    const tw = await ensureTailwindColorCollection();
    const registry = makeRegistry();
    registry.config = { radius: "large" } as ResolvedRegistry["config"];
    const result = await ensureThemeCollection(registry, tw);
    // 0.875rem / 0.625rem default = 1.4x.
    expect(soleValue(result.radiusScale.get("lg"))).toBeCloseTo(11.2); // 8 * 1.4
    expect(soleValue(result.radiusScale.get("md"))).toBeCloseTo(8.4); // 6 * 1.4
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
});
