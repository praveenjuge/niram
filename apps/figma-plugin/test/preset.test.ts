import { describe, expect, it } from "vitest";
import {
  decodePreset,
  encodePreset,
  extractPresetCode,
  generateRandomConfig,
  generateRandomPreset,
  isPresetCode,
  PRESET_FONTS,
} from "../src/preset";
import {
  MENU_BOLD_CODE,
  OUT_OF_RANGE_CODE,
  REAL_PRESETS,
  V1_MINIMAL_CODE,
} from "./fixtures/presets";

describe("isPresetCode", () => {
  it("accepts a real code", () => {
    expect(isPresetCode("b2fA")).toBe(true);
  });

  it("rejects codes that are too short or too long", () => {
    expect(isPresetCode("")).toBe(false);
    expect(isPresetCode("b")).toBe(false);
    expect(isPresetCode("b234567890")).toBe(true); // exactly 10
    expect(isPresetCode("b2345678901")).toBe(false); // 11
  });

  it("rejects an unknown version prefix", () => {
    expect(isPresetCode("c2fA")).toBe(false);
    expect(isPresetCode("z123")).toBe(false);
  });

  it("rejects non-base62 characters in the body", () => {
    expect(isPresetCode("b2f-")).toBe(false);
    expect(isPresetCode("b2f.")).toBe(false);
    expect(isPresetCode("b2f ")).toBe(false);
  });

  it("accepts both v1 and v2 prefixes", () => {
    expect(isPresetCode("a0")).toBe(true);
    expect(isPresetCode("b0")).toBe(true);
  });
});

describe("extractPresetCode", () => {
  it("returns a bare code untouched", () => {
    expect(extractPresetCode("b2fA")).toBe("b2fA");
    expect(extractPresetCode("  b2fA  ")).toBe("b2fA");
  });

  it("pulls the code off a --preset flag", () => {
    expect(extractPresetCode("--preset b2fA")).toBe("b2fA");
    expect(extractPresetCode("--preset=b2fA")).toBe("b2fA");
  });

  it("handles full CLI commands", () => {
    expect(extractPresetCode("npx shadcn@latest init --preset b2fA")).toBe(
      "b2fA",
    );
    expect(extractPresetCode("pnpm dlx shadcn@latest init --preset=b2fA")).toBe(
      "b2fA",
    );
  });

  it("pulls the code off a query param", () => {
    expect(extractPresetCode("https://ui.shadcn.com/init?preset=b2fA")).toBe(
      "b2fA",
    );
    expect(extractPresetCode("https://x.com/?foo=1&preset=b2fA&bar=2")).toBe(
      "b2fA",
    );
  });

  it("does not bare-scan prose for false positives", () => {
    expect(extractPresetCode("install it at the root")).toBeNull();
    expect(extractPresetCode("")).toBeNull();
    expect(extractPresetCode("   ")).toBeNull();
  });

  it("returns null when the flag value isn't a valid code", () => {
    expect(extractPresetCode("--preset not-a-code!!")).toBeNull();
  });
});

describe("decodePreset", () => {
  it("decodes every real preset into a complete config", () => {
    for (const preset of REAL_PRESETS) {
      const config = decodePreset(preset.code);
      expect(config, preset.name).not.toBeNull();
      expect(config!.font, preset.name).toBe(preset.font);
      expect(config!.style, preset.name).toBe(preset.style);
      // chartColor and fontHeading are always present on a decoded config.
      expect(config!).toHaveProperty("chartColor");
      expect(config!).toHaveProperty("fontHeading");
    }
  });

  it("decodes Nova (b2fA) exactly", () => {
    const config = decodePreset("b2fA");
    expect(config).toMatchObject({
      style: "nova",
      baseColor: "neutral",
      theme: "neutral",
      chartColor: "neutral",
      font: "geist",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
    });
  });

  it("applies the v1 upgrade defaults", () => {
    const config = decodePreset(V1_MINIMAL_CODE);
    expect(config).not.toBeNull();
    expect(config!.fontHeading).toBe("inherit");
    // v1 has no chartColor field. shadcn restores the original colored chart
    // palette for base-color themes, so a v1 neutral preset gets blue charts.
    expect(config!.theme).toBe("neutral");
    expect(config!.chartColor).toBe("blue");
  });

  it("restores v1 chart colors for base-color themes", () => {
    // stone -> lime (V1_CHART_COLOR_MAP). Re-version a v2 {theme: stone} code
    // to "a"; the v1 field layout is a prefix of v2 so theme still decodes.
    const code = encodePreset({ theme: "stone" }).replace(/^b/, "a");
    const stone = decodePreset(code);
    expect(stone).not.toBeNull();
    expect(stone!.theme).toBe("stone");
    expect(stone!.chartColor).toBe("lime");
  });

  it("keeps the theme as chartColor for non-base v1 themes", () => {
    // A v1 code whose theme is a colored family (not in V1_CHART_COLOR_MAP)
    // keeps its own theme as the chartColor. Re-version a v2 {theme: blue}
    // code to "a": the v1 field layout is a prefix of v2, and the unused high
    // bits stay zero, so the theme still decodes to blue.
    const code = encodePreset({ theme: "blue" }).replace(/^b/, "a");
    const config = decodePreset(code);
    expect(config).not.toBeNull();
    expect(config!.theme).toBe("blue");
    expect(config!.chartColor).toBe("blue");
  });

  it("decodes the bold-accent edge fixture", () => {
    const config = decodePreset(MENU_BOLD_CODE);
    expect(config).toMatchObject({
      menuAccent: "bold",
      theme: "blue",
      chartColor: "blue",
    });
  });

  it("rejects bits that overflow the encoded field range", () => {
    expect(decodePreset(OUT_OF_RANGE_CODE)).toBeNull();
  });

  it("rejects a code whose packed value exceeds the total field width", () => {
    // OUT_OF_RANGE_CODE trips the per-field index guard; a longer all-"z" body
    // overshoots the *total* bit width (51 bits) and must be rejected by the
    // earlier `bits >= 2 ** totalBits` check.
    expect(decodePreset("bzzzzzzzzz")).toBeNull();
  });

  it("rejects malformed codes", () => {
    expect(decodePreset("")).toBeNull();
    expect(decodePreset("nope!")).toBeNull();
    expect(decodePreset("c2fA")).toBeNull();
  });

  it("exposes the font catalogue used for decoding", () => {
    // Guards against a silent reordering of PRESET_FONTS, which would shift
    // every decoded font index.
    expect(PRESET_FONTS[0]).toBe("inter");
    expect(PRESET_FONTS).toContain("geist");
  });
});

describe("encodePreset", () => {
  it("round-trips every real preset through decode", () => {
    for (const preset of REAL_PRESETS) {
      const config = decodePreset(preset.code);
      expect(config, preset.name).not.toBeNull();
      // Re-encoding a decoded config reproduces the original code exactly.
      expect(encodePreset(config!), preset.name).toBe(preset.code);
    }
  });

  it("always emits a v2 ('b') code", () => {
    expect(encodePreset({})[0]).toBe("b");
  });

  it("fills defaults for a partial config", () => {
    const code = encodePreset({ style: "lyra" });
    const config = decodePreset(code);
    expect(config).not.toBeNull();
    expect(config!.style).toBe("lyra");
    // Unspecified fields fall back to the first value of each field.
    expect(config!.baseColor).toBe("neutral");
    expect(config!.theme).toBe("neutral");
  });

  it("ignores undefined values when merging", () => {
    expect(encodePreset({ style: undefined })).toBe(encodePreset({}));
  });

  it("treats an unknown field value as index 0", () => {
    // A value that isn't in the field catalogue (indexOf === -1) is encoded as
    // index 0, so it round-trips to the field's default rather than corrupting
    // neighbouring fields.
    const code = encodePreset({
      font: "not-a-real-font" as unknown as PresetConfig["font"],
    });
    const config = decodePreset(code);
    expect(config).not.toBeNull();
    expect(config!.font).toBe("inter"); // PRESET_FONTS[0]
  });
});

describe("generateRandomConfig / generateRandomPreset", () => {
  it("produces a valid, decodable preset code", () => {
    const code = generateRandomPreset();
    expect(isPresetCode(code)).toBe(true);
    expect(decodePreset(code)).not.toBeNull();
  });

  it("round-trips the random code through decode/encode", () => {
    const code = generateRandomPreset();
    const config = decodePreset(code);
    expect(config).not.toBeNull();
    expect(encodePreset(config!)).toBe(code);
  });

  it("only picks values from the known field catalogues", () => {
    const config = generateRandomConfig();
    expect(PRESET_FONTS).toContain(config.font);
    // A round-trip re-encode must succeed for any random config.
    expect(decodePreset(encodePreset(config))).not.toBeNull();
  });
});
