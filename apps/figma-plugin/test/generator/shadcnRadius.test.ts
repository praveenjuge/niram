// Verifies the architectural split: the fixed Tailwind `radius/*` primitives
// never change with the preset, while components bind their corners to the
// separate preset-driven shadcn radius scale (overlaid via `withShadcnRadius`).

import { describe, expect, it } from "vitest";
import { generateFromRegistry, withShadcnRadius } from "../../src/generator";
import { addMenubarSection } from "../../src/componentsPage/sections/menubar";
import type { ComponentsInputs } from "../../src/componentsPage";
import { resolvePreset } from "../../src/registry";
import { encodePreset } from "../../src/preset";

type AnyVar = { id: string; valuesByMode: Record<string, unknown> };

function soleValue(variable: unknown): unknown {
  return Object.values((variable as AnyVar).valuesByMode)[0];
}

type NodeLike = {
  name: string;
  boundVariables: Record<string, { id: string }>;
  children: NodeLike[];
};

function page(): NodeLike {
  return (
    globalThis as { figma: { createPage(): NodeLike } }
  ).figma.createPage();
}

// Find the first node carrying a topLeftRadius binding (the actual Menubar
// component; an outer section-card wrapper shares the name but has no corner
// binding).
function findBoundCorner(root: NodeLike): NodeLike | undefined {
  if (root.boundVariables && root.boundVariables["topLeftRadius"]) return root;
  for (const child of root.children ?? []) {
    const found = findBoundCorner(child);
    if (found) return found;
  }
  return undefined;
}

async function build(radius: string) {
  const code = encodePreset({ radius: radius as never });
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error(`failed to resolve ${radius}`);
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
    presetSummary: { radius },
  });
  const primitives = withShadcnRadius(
    generated.variables.primitives,
    generated.variables.radiusScale,
  );
  const inputs = {
    presetCode: code,
    primitives,
    tailwindColors: generated.variables.tailwindColors,
    theme: generated.variables.theme,
  } as unknown as ComponentsInputs;

  const p = page();
  await addMenubarSection(p as unknown as PageNode, inputs);
  return { generated, primitives, page: p };
}

describe("shadcn radius scale (component binding)", () => {
  it("keeps the Tailwind radius primitives fixed across presets", async () => {
    const none = await build("none");
    const large = await build("large");

    // The raw primitives are identical regardless of preset.
    expect(
      soleValue(none.generated.variables.primitives.get("radius/lg")),
    ).toBe(8);
    expect(
      soleValue(large.generated.variables.primitives.get("radius/lg")),
    ).toBe(8);
  });

  it("binds the Menubar corner to the preset-scaled shadcn radius (radius=none → 0)", async () => {
    const { generated, page: p } = await build("none");
    const menubar = findBoundCorner(p)!;
    const boundId = menubar.boundVariables["topLeftRadius"]?.id;

    // It must bind to the theme-collection radius/md variable, whose value is
    // collapsed to 0 by radius=none — NOT the fixed Tailwind primitive (6).
    const shadcnMd = generated.variables.radiusScale.get("md") as AnyVar;
    expect(boundId).toBe(shadcnMd.id);
    expect(soleValue(shadcnMd)).toBe(0);
  });

  it("binds the Menubar corner to a larger radius for radius=large", async () => {
    const { generated, page: p } = await build("large");
    const menubar = findBoundCorner(p)!;
    const boundId = menubar.boundVariables["topLeftRadius"]?.id;

    const shadcnMd = generated.variables.radiusScale.get("md") as AnyVar;
    expect(boundId).toBe(shadcnMd.id);
    // 6 (md) * 1.4 (0.875rem / 0.625rem) = 8.4.
    expect(soleValue(shadcnMd)).toBeCloseTo(8.4);
  });
});
