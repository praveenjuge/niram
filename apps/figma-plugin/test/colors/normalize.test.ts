import { describe, expect, it } from "vitest";
import { normalizeColorValue } from "../../src/colors";

describe("normalizeColorValue", () => {
  it("collapses whitespace and lowercases", () => {
    expect(normalizeColorValue("OKLCH(  0.5   0.1  20 )")).toBe(
      "oklch(0.5 0.1 20)",
    );
  });

  it("converts percentage lightness and alpha to unit", () => {
    expect(normalizeColorValue("oklch(50% 0 0)")).toBe("oklch(0.5 0 0)");
    expect(normalizeColorValue("oklch(1 0 0 / 50%)")).toBe(
      "oklch(1 0 0 / 0.5)",
    );
  });

  it("drops trailing zeros via toFixed(12)", () => {
    expect(normalizeColorValue("oklch(0.500000 0 0)")).toBe("oklch(0.5 0 0)");
  });

  it("preserves a precise value", () => {
    expect(normalizeColorValue("oklch(0.623 0.214 259.815)")).toBe(
      "oklch(0.623 0.214 259.815)",
    );
  });

  it("passes non-oklch values through lowercased", () => {
    expect(normalizeColorValue("#FFFFFF")).toBe("#ffffff");
    expect(normalizeColorValue("Red")).toBe("red");
  });

  it("converts a percentage on a non-lightness channel too", () => {
    // The `else if (endsWith("%"))` branch: chroma/hue carrying a percent are
    // also divided by 100 (defensive — real values rarely do this).
    expect(normalizeColorValue("oklch(0.5 50% 0)")).toBe("oklch(0.5 0.5 0)");
    expect(normalizeColorValue("oklch(0.5 0 50%)")).toBe("oklch(0.5 0 0.5)");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeColorValue(undefined)).toBe("");
    expect(normalizeColorValue("")).toBe("");
  });

  it("returns the lowered original when there are too few parts", () => {
    expect(normalizeColorValue("oklch(1 0)")).toBe("oklch(1 0)");
  });

  it("emits empty channels for non-numeric values", () => {
    // Each channel runs through normalizeNumber; a non-numeric one yields "".
    expect(normalizeColorValue("oklch(abc def ghi)")).toBe("oklch(  )");
  });
});
