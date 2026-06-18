import { describe, expect, it } from "vitest";
import {
  parseOklch,
  TAILWIND_COLOR_FAMILIES,
  TAILWIND_COLOR_SCALES,
  TAILWIND_COLORS,
} from "../../src/colors";
import { ensureTailwindColorCollection } from "../../src/generator/tailwindColors";

const FAMILY_COUNT = TAILWIND_COLOR_FAMILIES.length; // 26
const SCALE_COUNT = TAILWIND_COLOR_SCALES.length; // 11

type AnyVar = {
  resolvedType: string;
  valuesByMode: Record<string, unknown>;
};

function soleValue(variable: AnyVar): unknown {
  const values = Object.values(variable.valuesByMode);
  return values[0];
}

describe("ensureTailwindColorCollection", () => {
  it("emits one variable per family/scale plus three neutrals", async () => {
    const map = await ensureTailwindColorCollection();
    expect(map.size).toBe(FAMILY_COUNT * SCALE_COUNT + 3);
    for (const variable of map.values()) {
      expect((variable as unknown as AnyVar).resolvedType).toBe("COLOR");
    }
  });

  it("stores exact values for the unscaled neutrals", async () => {
    const map = await ensureTailwindColorCollection();
    expect(soleValue(map.get("black") as unknown as AnyVar)).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 1,
    });
    expect(soleValue(map.get("white") as unknown as AnyVar)).toEqual({
      r: 1,
      g: 1,
      b: 1,
      a: 1,
    });
    expect(soleValue(map.get("transparent") as unknown as AnyVar)).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    });
  });

  it("converts a family/scale value to the parsed RGBA", async () => {
    const map = await ensureTailwindColorCollection();
    const expected = parseOklch(TAILWIND_COLORS.slate["500"])!;
    const actual = soleValue(map.get("slate/500") as unknown as AnyVar) as {
      r: number;
      g: number;
      b: number;
      a: number;
    };
    expect(actual.r).toBeCloseTo(expected.r, 6);
    expect(actual.g).toBeCloseTo(expected.g, 6);
    expect(actual.b).toBeCloseTo(expected.b, 6);
    expect(actual.a).toBeCloseTo(expected.a, 6);
  });

  it("is idempotent across runs", async () => {
    const first = await ensureTailwindColorCollection();
    const second = await ensureTailwindColorCollection();
    expect(second.size).toBe(first.size);
  });
});
