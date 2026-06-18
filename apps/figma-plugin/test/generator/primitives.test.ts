import { describe, expect, it } from "vitest";
import {
  ensurePrimitivesCollection,
  resolveFontFamily,
} from "../../src/generator/primitives";

type AnyVar = { resolvedType: string; valuesByMode: Record<string, unknown> };

function soleValue(variable: unknown): unknown {
  return Object.values((variable as AnyVar).valuesByMode)[0];
}

describe("resolveFontFamily", () => {
  it("defaults to Inter / sans", () => {
    expect(resolveFontFamily(undefined)).toEqual({
      family: "Inter",
      bucket: "sans",
    });
  });

  it("resolves a known mono font", () => {
    expect(resolveFontFamily("jetbrains-mono")).toEqual({
      family: "JetBrains Mono",
      bucket: "mono",
    });
  });

  it("falls back to Inter for an unknown slug but keeps the bucket", () => {
    expect(resolveFontFamily("some-unknown-serif")).toEqual({
      family: "Inter",
      bucket: "sans",
    });
  });
});

describe("ensurePrimitivesCollection", () => {
  it("writes numeric and string primitive tokens", async () => {
    const map = await ensurePrimitivesCollection({
      fontFamily: { family: "Inter", bucket: "sans" },
    });
    expect(soleValue(map.get("radius/full"))).toBe(9999);
    expect(soleValue(map.get("spacing/px"))).toBe(1);
    expect(soleValue(map.get("font/size/base"))).toBe(16);
    expect(soleValue(map.get("opacity/100"))).toBe(100);
    expect(soleValue(map.get("font/style/italic"))).toBe("italic");
    expect((map.get("radius/full") as unknown as AnyVar).resolvedType).toBe(
      "FLOAT",
    );
  });

  it("only overrides the bucket matching the selected font", async () => {
    const map = await ensurePrimitivesCollection({
      fontFamily: { family: "JetBrains Mono", bucket: "mono" },
    });
    expect(soleValue(map.get("font/family/mono"))).toBe("JetBrains Mono");
    // Other buckets keep their defaults.
    expect(soleValue(map.get("font/family/sans"))).toBe("Inter");
    expect(soleValue(map.get("font/family/serif"))).toBe("Georgia");
  });

  it("keeps the fixed Tailwind radius scale regardless of preset", async () => {
    const map = await ensurePrimitivesCollection({
      fontFamily: { family: "Inter", bucket: "sans" },
    });
    // The Tailwind primitive radius scale is a stable reference: it never
    // changes with the preset (the preset drives the separate shadcn radius
    // scale in `shadcn / Theme`).
    expect(soleValue(map.get("radius/none"))).toBe(0);
    expect(soleValue(map.get("radius/xs"))).toBe(2);
    expect(soleValue(map.get("radius/sm"))).toBe(4);
    expect(soleValue(map.get("radius/md"))).toBe(6);
    expect(soleValue(map.get("radius/lg"))).toBe(8);
    expect(soleValue(map.get("radius/xl"))).toBe(12);
    expect(soleValue(map.get("radius/full"))).toBe(9999);
  });
});
