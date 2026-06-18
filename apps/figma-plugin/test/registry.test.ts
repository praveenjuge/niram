import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateRandomResolvablePreset,
  isBaseColor,
  isResolvablePreset,
  listAvailableThemes,
  resolvePreset,
} from "../src/registry";
import { decodePreset } from "../src/preset";
import * as presetModule from "../src/preset";
import type { PresetConfig } from "../src/preset";
import {
  CHART_OVERRIDE_CODE,
  MENU_BOLD_CODE,
  RADIUS_LARGE_CODE,
  REAL_PRESETS,
  V1_MINIMAL_CODE,
} from "./fixtures/presets";

describe("resolvePreset", () => {
  it("resolves every real preset", () => {
    for (const preset of REAL_PRESETS) {
      const result = resolvePreset(preset.code);
      expect(result.ok, preset.name).toBe(true);
      if (!result.ok) continue;
      expect(result.presetCode).toBe(preset.code);
      expect(Object.keys(result.data.cssVars.light).length).toBeGreaterThan(0);
      expect(Object.keys(result.data.cssVars.dark).length).toBeGreaterThan(0);
    }
  });

  it("accepts a code embedded in a CLI command", () => {
    const result = resolvePreset("npx shadcn@latest init --preset b2fA");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.presetCode).toBe("b2fA");
  });

  it("rejects a non-preset string with a friendly error", () => {
    const result = resolvePreset("hello world");
    expect(result).toEqual({
      ok: false,
      error: "That doesn't look like a shadcn preset code.",
    });
  });

  it("rejects a shape-valid but undecodable code", () => {
    // "bzzzzzz" passes isPresetCode but overflows the field range.
    const result = resolvePreset("bzzzzzz");
    expect(result).toEqual({
      ok: false,
      error: "Couldn't decode that preset code.",
    });
  });

  it("applies the chart-color override from a different family", () => {
    const result = resolvePreset(CHART_OVERRIDE_CODE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const blue = resolvePreset("bIkeymG"); // neutral/neutral baseline-ish
    expect(blue.ok).toBe(true);
    // chart-1 should come from the blue theme, not neutral. The two differ.
    const neutral = result.data.cssVars; // theme=neutral, chartColor=blue
    expect(neutral.light["chart-1"]).toBeDefined();
    // The chart color was overridden, so it should not equal neutral's own
    // chart-1 (which a plain neutral preset would carry).
    const plainNeutral = resolvePreset("b2fA");
    if (plainNeutral.ok) {
      expect(neutral.light["chart-1"]).not.toBe(
        plainNeutral.data.cssVars.light["chart-1"],
      );
    }
  });

  it("rewrites accent from primary when menuAccent is bold", () => {
    const result = resolvePreset(MENU_BOLD_CODE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { light, dark } = result.data.cssVars;
    expect(light["accent"]).toBe(light["primary"]);
    expect(light["accent-foreground"]).toBe(light["primary-foreground"]);
    expect(dark["accent"]).toBe(dark["primary"]);
    expect(dark["accent-foreground"]).toBe(dark["primary-foreground"]);
  });

  it("carries a non-default radius on the light side only", () => {
    const result = resolvePreset(RADIUS_LARGE_CODE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.cssVars.light["radius"]).toBe("0.875rem");
    // Dark side doesn't get the radius override.
    expect(result.data.cssVars.dark["radius"]).toBeUndefined();
  });

  it("resolves the minimal v1 code", () => {
    const result = resolvePreset(V1_MINIMAL_CODE);
    expect(result.ok).toBe(true);
  });
});

describe("listAvailableThemes / isBaseColor", () => {
  it("lists the bundled themes", () => {
    const themes = listAvailableThemes();
    expect(themes).toContain("neutral");
    expect(themes).toContain("blue");
    // Known gap: "gray" is a valid preset value but is absent from the
    // bundled catalogue (see the gray-throws regression test below).
    expect(themes).not.toContain("gray");
    expect(themes.length).toBe(24);
  });

  it("recognizes base colors", () => {
    expect(isBaseColor("neutral")).toBe(true);
    expect(isBaseColor("stone")).toBe(true);
    expect(isBaseColor("blue")).toBe(false);
  });
});

describe("gray theme is missing from the catalogue", () => {
  it("returns a friendly error instead of throwing", () => {
    // "gray" is a valid PRESET_BASE_COLOR / PRESET_THEME index but has no entry
    // in src/data/themes.json. resolvePreset must surface this as an error
    // rather than throwing — an uncaught throw hangs the UI on "Resolving…".
    //
    // encodeGray() decodes to baseColor=gray, theme=gray.
    const grayCode = encodeGray();
    expect(() => resolvePreset(grayCode)).not.toThrow();
    const result = resolvePreset(grayCode);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/gray/);
    }
  });
});

describe("isResolvablePreset", () => {
  it("accepts a config whose colors are all bundled", () => {
    const config = decodePreset("b2fA"); // neutral/neutral
    expect(config).not.toBeNull();
    expect(isResolvablePreset(config!)).toBe(true);
  });

  it("rejects a config that lands on the missing gray family", () => {
    const config = decodePreset(encodeGray());
    expect(config).not.toBeNull();
    expect(isResolvablePreset(config!)).toBe(false);
  });
});

describe("generateRandomResolvablePreset", () => {
  it("always produces a code that resolves cleanly", () => {
    // The generator re-rolls unresolvable configs (e.g. gray), so every code
    // it returns must build without error.
    for (let i = 0; i < 200; i++) {
      const code = generateRandomResolvablePreset();
      const result = resolvePreset(code);
      expect(result.ok, code).toBe(true);
    }
  });

  it("pins color fields when every random roll is unresolvable", () => {
    // Force the rare fallback path: stub the shuffle so it only ever returns a
    // config whose colors (baseColor/theme/chartColor) all land on the missing
    // "gray" family. After MAX_ATTEMPTS failed rolls the function must pin the
    // color fields to known-good values and still emit a resolvable code.
    const grayConfig: PresetConfig = {
      style: "nova",
      baseColor: "gray",
      theme: "gray",
      chartColor: "gray",
      iconLibrary: "lucide",
      font: "inter",
      fontHeading: "inherit",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
    };
    const spy = vi
      .spyOn(presetModule, "generateRandomConfig")
      .mockReturnValue({ ...grayConfig });
    try {
      const code = generateRandomResolvablePreset();
      // It re-rolled 20 times (all gray), then fell back.
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(20);
      const result = resolvePreset(code);
      expect(result.ok, code).toBe(true);
      if (result.ok) {
        // baseColor/theme pinned to the first resolvable family (neutral),
        // and the unresolvable gray chartColor was rewritten to the theme.
        expect(result.data.config.baseColor).toBe("neutral");
        expect(result.data.config.theme).toBe("neutral");
        expect(result.data.config.chartColor).toBe("neutral");
      }
    } finally {
      spy.mockRestore();
    }
  });
});

// Builds a v2 code whose baseColor and theme both resolve to "gray".
// gray is index 3 in both PRESET_BASE_COLORS and PRESET_THEMES.
function encodeGray(): string {
  const BASE62 =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  // Field bit widths, in order: menuColor(3) menuAccent(3) radius(4) font(6)
  // iconLibrary(6) theme(6) baseColor(6) style(6) chartColor(6) fontHeading(5)
  const offsets = {
    theme: 3 + 3 + 4 + 6 + 6,
    baseColor: 3 + 3 + 4 + 6 + 6 + 6,
  };
  let bits = 0;
  bits += 3 * 2 ** offsets.theme; // theme = gray (index 3)
  bits += 3 * 2 ** offsets.baseColor; // baseColor = gray (index 3)
  let body = "";
  let n = bits;
  if (n === 0) body = "0";
  while (n > 0) {
    body = BASE62[n % 62] + body;
    n = Math.floor(n / 62);
  }
  return "b" + body;
}
