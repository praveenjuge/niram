import { describe, expect, it } from "vitest";
import {
  DEFAULT_FONT_FAMILY,
  FONT_SIZE_TOKENS,
  fontSlugBucket,
  PRESET_FONT_FAMILY_MAP,
  presetFontFamily,
  RADIUS_TOKENS,
  radiusScaleForSlug,
  resolveFonts,
  scaleRadiusTokens,
  SPACING_TOKENS,
} from "../src/primitives";

describe("fontSlugBucket", () => {
  it("classifies mono fonts", () => {
    expect(fontSlugBucket("jetbrains-mono")).toBe("mono");
    expect(fontSlugBucket("geist-mono")).toBe("mono");
  });

  it("classifies serif fonts", () => {
    expect(fontSlugBucket("lora")).toBe("serif");
    expect(fontSlugBucket("playfair-display")).toBe("serif");
    expect(fontSlugBucket("instrument-serif")).toBe("serif");
  });

  it("defaults everything else to sans", () => {
    expect(fontSlugBucket("inter")).toBe("sans");
    expect(fontSlugBucket("geist")).toBe("sans");
    expect(fontSlugBucket("unknown-font")).toBe("sans");
  });
});

describe("token tables", () => {
  it("anchors the radius and spacing scales", () => {
    expect(RADIUS_TOKENS.find((t) => t.name === "none")?.value).toBe(0);
    expect(RADIUS_TOKENS.find((t) => t.name === "full")?.value).toBe(9999);
    expect(SPACING_TOKENS.find((t) => t.name === "px")?.value).toBe(1);
    expect(SPACING_TOKENS.find((t) => t.name === "4")?.value).toBe(16);
    expect(FONT_SIZE_TOKENS.find((t) => t.name === "base")?.value).toBe(16);
  });

  it("emits the three default font buckets", () => {
    const names = DEFAULT_FONT_FAMILY.map((t) => t.name);
    expect(names).toEqual(["sans", "serif", "mono"]);
  });
});

describe("PRESET_FONT_FAMILY_MAP", () => {
  it("maps slugs to Figma-friendly family names", () => {
    expect(PRESET_FONT_FAMILY_MAP["dm-sans"]).toBe("DM Sans");
    expect(PRESET_FONT_FAMILY_MAP["jetbrains-mono"]).toBe("JetBrains Mono");
    expect(PRESET_FONT_FAMILY_MAP["unknown"]).toBeUndefined();
  });
});

describe("presetFontFamily", () => {
  it("resolves a known slug", () => {
    expect(presetFontFamily("geist")).toBe("Geist");
    expect(presetFontFamily("lora")).toBe("Lora");
  });

  it("falls back to Inter for unknown or missing slugs", () => {
    expect(presetFontFamily(undefined)).toBe("Inter");
    expect(presetFontFamily("not-a-font")).toBe("Inter");
  });
});

describe("resolveFonts", () => {
  it("uses distinct body and heading families", () => {
    expect(resolveFonts("geist", "lora")).toEqual({
      body: "Geist",
      heading: "Lora",
    });
  });

  it("reuses the body font when heading is inherit", () => {
    expect(resolveFonts("geist", "inherit")).toEqual({
      body: "Geist",
      heading: "Geist",
    });
  });

  it("reuses the body font when heading is missing", () => {
    expect(resolveFonts("dm-sans", undefined)).toEqual({
      body: "DM Sans",
      heading: "DM Sans",
    });
  });

  it("defaults both to Inter when nothing is provided", () => {
    expect(resolveFonts(undefined, undefined)).toEqual({
      body: "Inter",
      heading: "Inter",
    });
  });
});

describe("radiusScaleForSlug", () => {
  it("returns 1 (no change) for the default/medium radius", () => {
    expect(radiusScaleForSlug("default")).toBe(1);
    expect(radiusScaleForSlug("medium")).toBe(1);
  });

  it("returns 1 for unknown or missing slugs", () => {
    expect(radiusScaleForSlug(undefined)).toBe(1);
    expect(radiusScaleForSlug("not-a-radius")).toBe(1);
  });

  it("scales below 1 for none/small and above 1 for large", () => {
    // none → --radius 0, so every scaled token collapses to a sharp corner.
    expect(radiusScaleForSlug("none")).toBe(0);
    // small → 0.45rem (7.2px) / 0.625rem (10px) default.
    expect(radiusScaleForSlug("small")).toBeCloseTo(0.72);
    // large → 0.875rem (14px) / 10px default.
    expect(radiusScaleForSlug("large")).toBeCloseTo(1.4);
  });
});

describe("scaleRadiusTokens", () => {
  function valueOf(tokens: typeof RADIUS_TOKENS, name: string) {
    return tokens.find((t) => t.name === name)?.value;
  }

  it("returns the table unchanged at scale 1", () => {
    expect(scaleRadiusTokens(RADIUS_TOKENS, 1)).toBe(RADIUS_TOKENS);
  });

  it("scales the derived tokens (sm…4xl) by the ratio", () => {
    const scaled = scaleRadiusTokens(RADIUS_TOKENS, 1.4);
    expect(valueOf(scaled, "sm")).toBeCloseTo(5.6); // 4 * 1.4
    expect(valueOf(scaled, "md")).toBeCloseTo(8.4); // 6 * 1.4
    expect(valueOf(scaled, "lg")).toBeCloseTo(11.2); // 8 * 1.4
    expect(valueOf(scaled, "xl")).toBeCloseTo(16.8); // 12 * 1.4
    expect(valueOf(scaled, "4xl")).toBeCloseTo(44.8); // 32 * 1.4
  });

  it("leaves the structural tokens (none/xs/full) untouched", () => {
    const scaled = scaleRadiusTokens(RADIUS_TOKENS, 0.72);
    expect(valueOf(scaled, "none")).toBe(0);
    expect(valueOf(scaled, "xs")).toBe(2);
    expect(valueOf(scaled, "full")).toBe(9999);
  });

  it("collapses scaled tokens to 0 at scale 0 (radius=none)", () => {
    const scaled = scaleRadiusTokens(RADIUS_TOKENS, 0);
    expect(valueOf(scaled, "sm")).toBe(0);
    expect(valueOf(scaled, "lg")).toBe(0);
    // Pill + sharp corners still pass through.
    expect(valueOf(scaled, "full")).toBe(9999);
    expect(valueOf(scaled, "xs")).toBe(2);
  });
});
