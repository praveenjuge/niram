import { describe, expect, it } from "vitest";
import {
  applyTextStyles,
  ensureTextStyles,
  textStyleName,
} from "../src/textStyles";
import { ensurePrimitivesCollection } from "../src/generator/primitives";
import { ensureThemeCollection } from "../src/generator/theme";
import { ensureTailwindColorCollection } from "../src/generator/tailwindColors";
import { resolvePreset } from "../src/registry";
import { FONT_SIZE_TOKENS, FONT_WEIGHT_TOKENS } from "../src/primitives";
import { resetActiveFonts } from "../src/fonts";
import type { FigmaMock } from "./figma-mock";

function liveFigma(): FigmaMock {
  return (globalThis as unknown as { figma: FigmaMock }).figma;
}

type StyleLike = {
  id: string;
  name: string;
  fontSize: number;
  lineHeight: { unit: string; value?: number };
  boundVariables?: Record<string, { id: string }>;
};

const TOTAL_STYLES = FONT_SIZE_TOKENS.length * FONT_WEIGHT_TOKENS.length;

async function primitives() {
  return ensurePrimitivesCollection({
    fontFamily: { family: "Inter", bucket: "sans" },
  });
}

describe("ensureTextStyles", () => {
  it("creates one text style per size × weight", async () => {
    const map = await ensureTextStyles(await primitives());
    expect(map.count).toBe(TOTAL_STYLES);

    const styles =
      (await liveFigma().getLocalTextStylesAsync()) as unknown as StyleLike[];
    expect(styles).toHaveLength(TOTAL_STYLES);

    // Spot-check the screenshot's leading examples and the slash grouping.
    expect(map.idFor("text-xs/thin")).toBeDefined();
    expect(map.idFor("text-xs/black")).toBeDefined();
    expect(map.idFor("text-9xl/medium")).toBeDefined();
    // Unknown names return undefined.
    expect(map.idFor("text-7xl/heavy")).toBeUndefined();
  });

  it("carries Tailwind's size / line-height metrics", async () => {
    await ensureTextStyles(await primitives());
    const styles =
      (await liveFigma().getLocalTextStylesAsync()) as unknown as StyleLike[];

    // text-xs → 12 / 16.
    const xs = styles.find((s) => s.name === "text-xs/normal");
    expect(xs!.fontSize).toBe(12);
    expect(xs!.lineHeight).toEqual({ unit: "PIXELS", value: 16 });

    // text-sm → 14 / 20.
    const sm = styles.find((s) => s.name === "text-sm/medium");
    expect(sm!.fontSize).toBe(14);
    expect(sm!.lineHeight).toEqual({ unit: "PIXELS", value: 20 });

    // Large display sizes use line-height: 1 (px === font size).
    const big = styles.find((s) => s.name === "text-9xl/bold");
    expect(big!.fontSize).toBe(128);
    expect(big!.lineHeight).toEqual({ unit: "PIXELS", value: 128 });
  });

  it("binds fontSize + lineHeight + fontWeight to the matching primitives", async () => {
    const prims = await primitives();
    await ensureTextStyles(prims);
    const styles =
      (await liveFigma().getLocalTextStylesAsync()) as unknown as StyleLike[];

    const sm = styles.find((s) => s.name === "text-sm/semibold");
    expect(sm!.boundVariables?.fontSize?.id).toBe(
      (prims.get("font/size/sm") as unknown as { id: string }).id,
    );
    // text-sm pairs with leading/5 (20px).
    expect(sm!.boundVariables?.lineHeight?.id).toBe(
      (prims.get("font/leading/5") as unknown as { id: string }).id,
    );
    expect(sm!.boundVariables?.fontWeight?.id).toBe(
      (prims.get("font/weight/semibold") as unknown as { id: string }).id,
    );
  });

  it("binds line height to the size variable for the line-height:1 sizes", async () => {
    const prims = await primitives();
    await ensureTextStyles(prims);
    const styles =
      (await liveFigma().getLocalTextStylesAsync()) as unknown as StyleLike[];

    const big = styles.find((s) => s.name === "text-6xl/black");
    // No leading token matches, so the line height tracks the size variable.
    expect(big!.boundVariables?.lineHeight?.id).toBe(
      (prims.get("font/size/6xl") as unknown as { id: string }).id,
    );
  });

  it("does not duplicate styles when re-run (idempotent)", async () => {
    await ensureTextStyles(await primitives());
    const firstIds = (
      (await liveFigma().getLocalTextStylesAsync()) as unknown as {
        id: string;
      }[]
    ).map((s) => s.id);

    await ensureTextStyles(await primitives());
    const styles = (await liveFigma().getLocalTextStylesAsync()) as unknown as {
      id: string;
    }[];
    expect(styles).toHaveLength(TOTAL_STYLES);
    expect(styles.map((s) => s.id).sort()).toEqual([...firstIds].sort());
  });

  it("binds fontFamily to the preset body variable when supplied", async () => {
    resetActiveFonts();
    const colorVars = await ensureTailwindColorCollection();
    const resolved = resolvePreset("b2fA");
    if (!resolved.ok) throw new Error("fixture failed to resolve");
    const theme = await ensureThemeCollection(resolved.data, colorVars);

    await ensureTextStyles(await primitives(), theme.fontVars);
    const styles =
      (await liveFigma().getLocalTextStylesAsync()) as unknown as StyleLike[];
    const base = styles.find((s) => s.name === "text-base/normal");
    expect(base!.boundVariables?.fontFamily?.id).toBe(
      (theme.fontVars.body as unknown as { id: string }).id,
    );
  });
});

describe("textStyleName", () => {
  it("groups by size with a weight leaf, matching the Figma picker", () => {
    expect(textStyleName("xs", "thin")).toBe("text-xs/thin");
    expect(textStyleName("2xl", "semibold")).toBe("text-2xl/semibold");
  });
});

describe("applyTextStyles", () => {
  it("maps a text node whose size + weight land on the scale", async () => {
    const figma = liveFigma();
    const map = await ensureTextStyles(await primitives());

    const text = figma.createText();
    (text as unknown as { fontSize: number }).fontSize = 14;
    (text as unknown as { fontName: unknown }).fontName = {
      family: "Inter",
      style: "Medium",
    };

    await applyTextStyles(text as never, map);

    expect((text as unknown as { textStyleId?: string }).textStyleId).toBe(
      map.idFor("text-sm/medium"),
    );
  });

  it("leaves a node alone when its size is off the scale", async () => {
    const figma = liveFigma();
    const map = await ensureTextStyles(await primitives());

    const text = figma.createText();
    (text as unknown as { fontSize: number }).fontSize = 13; // no token
    (text as unknown as { fontName: unknown }).fontName = {
      family: "Inter",
      style: "Regular",
    };

    await applyTextStyles(text as never, map);
    expect(
      (text as unknown as { textStyleId?: string }).textStyleId,
    ).toBeUndefined();
  });

  it("skips nodes that carry an explicit pixel line height override", async () => {
    const figma = liveFigma();
    const map = await ensureTextStyles(await primitives());

    const text = figma.createText();
    (text as unknown as { fontSize: number }).fontSize = 14;
    (text as unknown as { fontName: unknown }).fontName = {
      family: "Inter",
      style: "Regular",
    };
    // A deliberate leading demo — the style would clobber it.
    (text as unknown as { lineHeight: unknown }).lineHeight = {
      unit: "PIXELS",
      value: 28,
    };

    await applyTextStyles(text as never, map);
    expect(
      (text as unknown as { textStyleId?: string }).textStyleId,
    ).toBeUndefined();
  });

  it("recurses into children", async () => {
    const figma = liveFigma();
    const map = await ensureTextStyles(await primitives());

    const frame = figma.createFrame();
    const text = figma.createText();
    (text as unknown as { fontSize: number }).fontSize = 16;
    (text as unknown as { fontName: unknown }).fontName = {
      family: "Inter",
      style: "Bold",
    };
    frame.appendChild(text as never);

    await applyTextStyles(frame as never, map);
    expect((text as unknown as { textStyleId?: string }).textStyleId).toBe(
      map.idFor("text-base/bold"),
    );
  });

  it("skips a node whose weight is off the Tailwind scale", async () => {
    const figma = liveFigma();
    const map = await ensureTextStyles(await primitives());

    const text = figma.createText();
    (text as unknown as { fontSize: number }).fontSize = 14;
    // "Ultra" is not one of the published Tailwind weight style names.
    (text as unknown as { fontName: unknown }).fontName = {
      family: "Inter",
      style: "Ultra",
    };

    await applyTextStyles(text as never, map);
    expect(
      (text as unknown as { textStyleId?: string }).textStyleId,
    ).toBeUndefined();
  });

  it("skips a node with no concrete fontName (mixed styling)", async () => {
    const figma = liveFigma();
    const map = await ensureTextStyles(await primitives());

    const text = figma.createText();
    (text as unknown as { fontSize: number }).fontSize = 14;
    (text as unknown as { fontName?: unknown }).fontName = undefined;

    await applyTextStyles(text as never, map);
    expect(
      (text as unknown as { textStyleId?: string }).textStyleId,
    ).toBeUndefined();
  });

  it("skips nodes that carry an explicit pixel letter-spacing override", async () => {
    const figma = liveFigma();
    const map = await ensureTextStyles(await primitives());

    const text = figma.createText();
    (text as unknown as { fontSize: number }).fontSize = 14;
    (text as unknown as { fontName: unknown }).fontName = {
      family: "Inter",
      style: "Regular",
    };
    (text as unknown as { letterSpacing: unknown }).letterSpacing = {
      unit: "PIXELS",
      value: 1,
    };

    await applyTextStyles(text as never, map);
    expect(
      (text as unknown as { textStyleId?: string }).textStyleId,
    ).toBeUndefined();
  });

  it("swallows a host that rejects the style id", async () => {
    const figma = liveFigma();
    const map = await ensureTextStyles(await primitives());

    const text = figma.createText();
    (text as unknown as { fontSize: number }).fontSize = 14;
    (text as unknown as { fontName: unknown }).fontName = {
      family: "Inter",
      style: "Regular",
    };
    (
      text as unknown as { setTextStyleIdAsync: () => Promise<void> }
    ).setTextStyleIdAsync = () => Promise.reject(new Error("locked style"));

    await expect(applyTextStyles(text as never, map)).resolves.toBeUndefined();
  });

  it("skips a node whose host can't set text styles", async () => {
    const figma = liveFigma();
    const map = await ensureTextStyles(await primitives());

    const text = figma.createText();
    (text as unknown as { fontSize: number }).fontSize = 14;
    (text as unknown as { fontName: unknown }).fontName = {
      family: "Inter",
      style: "Regular",
    };
    (text as unknown as { setTextStyleIdAsync?: unknown }).setTextStyleIdAsync =
      undefined;

    await expect(applyTextStyles(text as never, map)).resolves.toBeUndefined();
  });

  it("does not retag a node using a family outside the resolved set", async () => {
    const figma = liveFigma();
    // No active font context → styles resolve to Inter only.
    resetActiveFonts();
    const map = await ensureTextStyles(await primitives());
    expect(map.appliesToFamily("Inter")).toBe(true);
    expect(map.appliesToFamily("Playfair Display")).toBe(false);

    const heading = figma.createText();
    (heading as unknown as { fontSize: number }).fontSize = 16;
    // A heading on a distinct display family must be left untouched, since a
    // text style would also overwrite its font family.
    (heading as unknown as { fontName: unknown }).fontName = {
      family: "Playfair Display",
      style: "Bold",
    };

    await applyTextStyles(heading as never, map);
    expect(
      (heading as unknown as { textStyleId?: string }).textStyleId,
    ).toBeUndefined();
  });
});
