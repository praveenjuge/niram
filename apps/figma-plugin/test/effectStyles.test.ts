import { describe, expect, it } from "vitest";
import {
  BACKDROP_BLUR_STYLE_SPECS,
  BLUR_STYLE_SPECS,
  INNER_SHADOW_STYLES,
  SHADOW_STYLES,
} from "../src/effects";
import { applyEffectStyle, ensureEffectStyles } from "../src/effectStyles";
import { ensurePrimitivesCollection } from "../src/generator/primitives";
import type { FigmaMock } from "./figma-mock";

function liveFigma(): FigmaMock {
  return (globalThis as unknown as { figma: FigmaMock }).figma;
}

type StyleLike = { name: string; effects: unknown[] };

const TOTAL_STYLES =
  SHADOW_STYLES.length +
  INNER_SHADOW_STYLES.length +
  BLUR_STYLE_SPECS.length +
  BACKDROP_BLUR_STYLE_SPECS.length;

describe("ensureEffectStyles", () => {
  it("creates one effect style per shadow + blur token", async () => {
    const map = await ensureEffectStyles();
    expect(map.count).toBe(TOTAL_STYLES);

    const styles =
      (await liveFigma().getLocalEffectStylesAsync()) as unknown as StyleLike[];
    expect(styles).toHaveLength(TOTAL_STYLES);

    // Every spec name resolves to a style id.
    for (const spec of [...SHADOW_STYLES, ...INNER_SHADOW_STYLES]) {
      expect(map.idFor(spec.name)).toBeDefined();
    }
    expect(map.idFor("Blur/xs")).toBeDefined();
    expect(map.idFor("Backdrop Blur/3xl")).toBeDefined();
    // Unknown names return undefined.
    expect(map.idFor("Shadow/does-not-exist")).toBeUndefined();
  });

  it("carries the literal effects on a shadow style", async () => {
    await ensureEffectStyles();
    const styles =
      (await liveFigma().getLocalEffectStylesAsync()) as unknown as StyleLike[];
    const sm = styles.find((s) => s.name === "Shadow/sm");
    expect(sm).toBeDefined();
    // Shadow/sm is a two-layer drop shadow.
    expect(sm!.effects).toHaveLength(2);
    expect((sm!.effects[0] as { type: string }).type).toBe("DROP_SHADOW");
  });

  it("does not duplicate styles when re-run (idempotent)", async () => {
    await ensureEffectStyles();
    const firstIds = (
      (await liveFigma().getLocalEffectStylesAsync()) as unknown as {
        id: string;
      }[]
    ).map((s) => s.id);

    await ensureEffectStyles();
    const styles =
      (await liveFigma().getLocalEffectStylesAsync()) as unknown as {
        id: string;
      }[];
    // Re-running reuses styles by name; the id set is unchanged.
    expect(styles).toHaveLength(TOTAL_STYLES);
    expect(styles.map((s) => s.id).sort()).toEqual([...firstIds].sort());
  });

  it("binds blur radii to the matching blur primitive when provided", async () => {
    const primitives = await ensurePrimitivesCollection({
      fontFamily: { family: "Inter", bucket: "sans" },
    });
    await ensureEffectStyles(primitives);

    const styles =
      (await liveFigma().getLocalEffectStylesAsync()) as unknown as StyleLike[];
    const blurMd = styles.find((s) => s.name === "Blur/md");
    expect(blurMd).toBeDefined();
    const effect = blurMd!.effects[0] as {
      type: string;
      boundVariables?: { radius?: { id: string } };
    };
    expect(effect.type).toBe("LAYER_BLUR");
    expect(effect.boundVariables?.radius?.id).toBe(
      (primitives.get("blur/md") as unknown as { id: string }).id,
    );
  });

  it("leaves blur radii as literals when no primitives are supplied", async () => {
    await ensureEffectStyles();
    const styles =
      (await liveFigma().getLocalEffectStylesAsync()) as unknown as StyleLike[];
    const blurLg = styles.find((s) => s.name === "Blur/lg");
    const effect = blurLg!.effects[0] as {
      radius: number;
      boundVariables?: unknown;
    };
    expect(effect.radius).toBe(16);
    expect(effect.boundVariables).toBeUndefined();
  });
});

describe("applyEffectStyle", () => {
  it("sets the effect style id on the node", async () => {
    const node = liveFigma().createFrame();
    await applyEffectStyle(node as never, "style-123");
    expect((node as unknown as { effectStyleId: string }).effectStyleId).toBe(
      "style-123",
    );
  });

  it("no-ops when the style id is undefined", async () => {
    const node = liveFigma().createFrame();
    await applyEffectStyle(node as never, undefined);
    expect(
      (node as unknown as { effectStyleId?: string }).effectStyleId,
    ).toBeUndefined();
  });

  it("swallows host rejections", async () => {
    const node = {
      setEffectStyleIdAsync: () => Promise.reject(new Error("nope")),
    };
    await expect(
      applyEffectStyle(node as never, "style-1"),
    ).resolves.toBeUndefined();
  });
});
