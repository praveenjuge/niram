// The "Border radius" section documents the FIXED Tailwind radius primitives.
// It is a stable reference scale and must never collapse with the preset — the
// preset's chosen `--radius` drives the separate shadcn radius scale that
// components bind to, not this legend. Regression guard for the all-squares bug
// where a `radius=none` preset zeroed the shared primitives.

import { describe, expect, it } from "vitest";
import { addRadiusScale } from "../../src/designSystem/sections/radius";
import type { DesignSystemInputs } from "../../src/designSystem";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";
import { RADIUS_TOKENS } from "../../src/primitives";

type NodeLike = {
  type: string;
  name: string;
  characters?: string;
  children: NodeLike[];
  topLeftRadius?: number;
  boundVariables: Record<string, unknown>;
};

async function makeInputs(
  radius: string | undefined,
  code = "b2fA",
): Promise<DesignSystemInputs> {
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error("fixture failed to resolve");
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
    presetSummary: { radius },
  });
  return {
    presetCode: code,
    presetSummary: { radius },
    tailwindColors: generated.variables.tailwindColors,
    primitives: generated.variables.primitives,
    theme: generated.variables.theme,
  };
}

function page(): NodeLike {
  return (
    globalThis as { figma: { createPage(): NodeLike } }
  ).figma.createPage();
}

function collectTiles(
  section: NodeLike,
): Array<{ radius: number; bound: boolean; px: number }> {
  const out: Array<{ radius: number; bound: boolean; px: number }> = [];
  const walk = (node: NodeLike) => {
    for (const cell of node.children ?? []) {
      const tile = cell.children?.[0];
      const caption = cell.children?.[1];
      if (
        tile &&
        tile.type === "RECTANGLE" &&
        typeof tile.topLeftRadius === "number" &&
        caption &&
        caption.type === "TEXT"
      ) {
        const match = /(\d+)px/.exec(String(caption.characters ?? ""));
        out.push({
          radius: tile.topLeftRadius,
          bound: "topLeftRadius" in (tile.boundVariables ?? {}),
          px: match ? parseInt(match[1]!, 10) : NaN,
        });
      } else {
        walk(cell);
      }
    }
  };
  walk(section);
  return out;
}

describe("addRadiusScale", () => {
  it("renders the fixed Tailwind radius scale, bound to the primitives", async () => {
    const inputs = await makeInputs("default");
    const p = page();
    await addRadiusScale(p as unknown as PageNode, inputs);

    const section = p.children.find((c) => c.name === "Border radius")!;
    const tiles = collectTiles(section);
    expect(tiles.length).toBe(RADIUS_TOKENS.length);
    expect(tiles.every((t) => t.bound)).toBe(true);
    // The printed values are exactly the canonical Tailwind scale.
    expect(tiles.map((t) => t.px)).toEqual(RADIUS_TOKENS.map((t) => t.value));
  });

  it("does NOT collapse to squares even when the preset radius is none", async () => {
    const inputs = await makeInputs("none");
    const p = page();
    await addRadiusScale(p as unknown as PageNode, inputs);

    const section = p.children.find((c) => c.name === "Border radius")!;
    const tiles = collectTiles(section);
    // Identical to the default preset: this legend is preset-independent.
    expect(tiles.map((t) => t.px)).toEqual(RADIUS_TOKENS.map((t) => t.value));
    const rounded = tiles.filter((t) => t.radius > 0);
    expect(rounded.length).toBeGreaterThan(3);
  });
});
