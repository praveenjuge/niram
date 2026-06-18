import { describe, expect, it } from "vitest";
import { parseColor, parseHex, parseOklch } from "../../src/colors";

describe("parseHex", () => {
  it("parses 6-digit hex", () => {
    expect(parseHex("#000000")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseHex("#ffffff")).toEqual({ r: 1, g: 1, b: 1, a: 1 });
  });

  it("parses 8-digit hex with alpha", () => {
    const rgba = parseHex("#00000080");
    expect(rgba).not.toBeNull();
    expect(rgba!.a).toBeCloseTo(0.502, 3);
  });

  it("rejects malformed hex", () => {
    expect(parseHex("#fff")).toBeNull(); // 3-digit not supported by parseHex
    expect(parseHex("#12345")).toBeNull();
    expect(parseHex("not-hex")).toBeNull();
  });
});

describe("parseOklch", () => {
  it("converts white and black", () => {
    const white = parseOklch("oklch(1 0 0)")!;
    expect(white.r).toBeCloseTo(1, 4);
    expect(white.g).toBeCloseTo(1, 4);
    expect(white.b).toBeCloseTo(1, 4);
    expect(white.a).toBe(1);

    const black = parseOklch("oklch(0 0 0)")!;
    expect(black.r).toBeCloseTo(0, 4);
    expect(black.g).toBeCloseTo(0, 4);
    expect(black.b).toBeCloseTo(0, 4);
  });

  it("accepts a percentage lightness", () => {
    const rgba = parseOklch("oklch(50% 0 0)")!;
    expect(rgba).not.toBeNull();
    // Achromatic grey: channels equal, between 0 and 1.
    expect(rgba.r).toBeCloseTo(rgba.g, 6);
    expect(rgba.g).toBeCloseTo(rgba.b, 6);
    expect(rgba.r).toBeGreaterThan(0);
    expect(rgba.r).toBeLessThan(1);
  });

  it("parses alpha as percent and as a unit value", () => {
    expect(parseOklch("oklch(1 0 0 / 50%)")!.a).toBeCloseTo(0.5, 6);
    expect(parseOklch("oklch(1 0 0 / 0.5)")!.a).toBeCloseTo(0.5, 6);
  });

  it("clamps out-of-gamut results into [0,1]", () => {
    const rgba = parseOklch("oklch(0.7 0.4 30)")!;
    for (const channel of [rgba.r, rgba.g, rgba.b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(1);
    }
  });

  it("accepts a percentage on the chroma/hue channels", () => {
    // parseChannel divides any percent value by 100 regardless of channel, so
    // a percent chroma is read as its unit value. Exercises the
    // percentToUnit=false percent branch.
    const withPercentChroma = parseOklch("oklch(0.7 50% 30)")!;
    const withUnitChroma = parseOklch("oklch(0.7 0.5 30)")!;
    expect(withPercentChroma).not.toBeNull();
    expect(withPercentChroma.r).toBeCloseTo(withUnitChroma.r, 6);
    expect(withPercentChroma.g).toBeCloseTo(withUnitChroma.g, 6);
    expect(withPercentChroma.b).toBeCloseTo(withUnitChroma.b, 6);
  });

  it("rejects malformed oklch", () => {
    expect(parseOklch("oklch(1 0)")).toBeNull(); // fewer than 3 parts
    expect(parseOklch("rgb(1,2,3)")).toBeNull();
    expect(parseOklch("oklch()")).toBeNull();
  });

  it("rejects a non-numeric channel", () => {
    // Non-percent NaN channel.
    expect(parseOklch("oklch(abc 0 0)")).toBeNull();
    // Percent NaN channel.
    expect(parseOklch("oklch(abc% 0 0)")).toBeNull();
  });

  it("rejects a non-numeric alpha", () => {
    expect(parseOklch("oklch(1 0 0 / xyz)")).toBeNull();
  });
});

describe("parseColor", () => {
  it("dispatches to hex and oklch", () => {
    expect(parseColor("#ffffff")).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    expect(parseColor("oklch(0 0 0)")).not.toBeNull();
  });

  it("returns null for unsupported formats", () => {
    expect(parseColor("red")).toBeNull();
    expect(parseColor("rgb(0,0,0)")).toBeNull();
  });
});
