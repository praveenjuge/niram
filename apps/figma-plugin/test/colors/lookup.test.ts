import { describe, expect, it } from "vitest";
import {
  findTailwindAlias,
  findTailwindColor,
  TAILWIND_COLORS,
} from "../../src/colors";

describe("findTailwindAlias", () => {
  it("maps hex white/black shortcuts", () => {
    expect(findTailwindAlias("#fff")).toBe("white");
    expect(findTailwindAlias("#FFFFFF")).toBe("white");
    expect(findTailwindAlias("#000")).toBe("black");
    expect(findTailwindAlias("#000000")).toBe("black");
  });

  it("maps exact oklch white/black", () => {
    expect(findTailwindAlias("oklch(1 0 0)")).toBe("white");
    expect(findTailwindAlias("oklch(0 0 0)")).toBe("black");
  });

  it("maps a real Tailwind value to family/scale", () => {
    const slate500 = TAILWIND_COLORS.slate["500"];
    expect(findTailwindAlias(slate500)).toBe("slate/500");
  });

  it("refuses to alias partial alpha", () => {
    expect(findTailwindAlias("oklch(1 0 0 / 50%)")).toBeNull();
    expect(findTailwindAlias("oklch(1 0 0 / 0.5)")).toBeNull();
  });

  it("treats zero alpha as transparent and full alpha as opaque", () => {
    expect(findTailwindAlias("oklch(1 0 0 / 0%)")).toBe("transparent");
    expect(findTailwindAlias("oklch(1 0 0 / 0)")).toBe("transparent");
    expect(findTailwindAlias("oklch(1 0 0 / 1)")).toBe("white");
    expect(findTailwindAlias("oklch(1 0 0 / 100%)")).toBe("white");
  });

  it("returns null for unknown colors and empty input", () => {
    expect(findTailwindAlias("oklch(0.123 0.456 78)")).toBeNull();
    expect(findTailwindAlias(undefined)).toBeNull();
    expect(findTailwindAlias("")).toBeNull();
  });

  it("returns null when the alpha component isn't a number", () => {
    // Normalizes to a blank alpha, which parses as NaN.
    expect(findTailwindAlias("oklch(1 0 0 / abc)")).toBeNull();
  });
});

describe("findTailwindColor", () => {
  it("splits a scaled alias into family + scale", () => {
    const slate500 = TAILWIND_COLORS.slate["500"];
    expect(findTailwindColor(slate500)).toEqual({
      family: "slate",
      scale: "500",
    });
  });

  it("returns null for unscaled neutrals and misses", () => {
    expect(findTailwindColor("#fff")).toBeNull(); // "white" has no slash
    expect(findTailwindColor("oklch(0.123 0.456 78)")).toBeNull();
  });
});
