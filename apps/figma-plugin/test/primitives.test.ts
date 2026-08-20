import { describe, expect, it } from "vitest";
import {
  DEFAULT_FONT_FAMILY,
  FONT_SIZE_TOKENS,
  fontSlugBucket,
  PRESET_FONT_FAMILY_MAP,
  presetFontFamily,
  RADIUS_TOKENS,
  resolveFonts,
  shadcnRadiusScale,
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

describe("shadcnRadiusScale", () => {
  function valueOf(tokens: ReturnType<typeof shadcnRadiusScale>, name: string) {
    return tokens.find((t) => t.name === name)?.value;
  }

  it("derives every semantic step directly from the shadcn base radius", () => {
    const scaled = shadcnRadiusScale(10);
    expect(scaled.map((token) => token.value)).toEqual([
      6, 8, 10, 14, 18, 22, 26,
    ]);
  });

  it("applies the current shadcn multipliers to non-default bases", () => {
    const small = shadcnRadiusScale(7.2);
    expect(small.map((token) => token.value)).toEqual([
      4.32, 5.76, 7.2, 10.08, 12.96, 15.84, 18.72,
    ]);
    const large = shadcnRadiusScale(14);
    expect(large.map((token) => token.value)).toEqual([
      8.4, 11.2, 14, 19.6, 25.2, 30.8, 36.4,
    ]);
  });

  it("collapses every semantic step at a zero base radius", () => {
    const scaled = shadcnRadiusScale(0);
    expect(valueOf(scaled, "sm")).toBe(0);
    expect(valueOf(scaled, "lg")).toBe(0);
    expect(scaled).toHaveLength(7);
  });
});
