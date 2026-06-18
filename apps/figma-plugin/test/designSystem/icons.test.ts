import { describe, expect, it } from "vitest";
import { addIconLibrary } from "../../src/designSystem/sections/icons";
import type { DesignSystemInputs } from "../../src/designSystem";
import { ICON_LIBRARIES } from "../../src/data/icons";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

type NodeLike = {
  type: string;
  name: string;
  children: NodeLike[];
  boundVariables: Record<string, { id: string }>;
  fills: unknown[];
  strokes: unknown[];
};

async function makeInputs(
  iconLibrary?: string,
  code = "b2fA",
): Promise<DesignSystemInputs> {
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error("fixture failed to resolve");
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
  });
  return {
    presetCode: code,
    presetSummary: iconLibrary ? { iconLibrary } : undefined,
    tailwindColors: generated.variables.tailwindColors,
    primitives: generated.variables.primitives,
    theme: generated.variables.theme,
  };
}

function page(): NodeLike {
  const p = (
    globalThis as { figma: { createPage(): NodeLike } }
  ).figma.createPage();
  return p;
}

function findComponentSet(root: NodeLike): NodeLike | undefined {
  if (root.type === "COMPONENT_SET") return root;
  for (const child of root.children ?? []) {
    const found = findComponentSet(child);
    if (found) return found;
  }
  return undefined;
}

describe("addIconLibrary", () => {
  it("builds a component set for the preset's selected icon library", async () => {
    const inputs = await makeInputs("phosphor");
    const p = page();
    const count = await addIconLibrary(p as unknown as PageNode, inputs);
    expect(count).toBeGreaterThan(0);

    const set = findComponentSet(p);
    expect(set).toBeDefined();
    expect(set!.name).toBe("Phosphor Icons");
    // One component per curated phosphor icon.
    const expected = Object.keys(ICON_LIBRARIES.phosphor.icons).length;
    expect(set!.children.length).toBe(expected);
    // Variants are named with a single `Icon=` property.
    expect(set!.children.every((c) => c.name.startsWith("Icon="))).toBe(true);
  });

  it("falls back to lucide when the preset summary has no icon library", async () => {
    const inputs = await makeInputs();
    const p = page();
    await addIconLibrary(p as unknown as PageNode, inputs);

    const set = findComponentSet(p);
    expect(set).toBeDefined();
    expect(set!.name).toBe("Lucide Icons");
    const expected = Object.keys(ICON_LIBRARIES.lucide.icons).length;
    expect(set!.children.length).toBe(expected);
  });

  it("binds rendered icon vectors to the theme foreground variable", async () => {
    const inputs = await makeInputs("lucide");
    const foreground = inputs.theme.light.get("foreground");
    expect(foreground).toBeDefined();

    const p = page();
    await addIconLibrary(p as unknown as PageNode, inputs);
    const set = findComponentSet(p);

    // Drill into the first icon component → svg frame → vector and confirm the
    // recolor pass bound the paint to the foreground variable.
    const firstIcon = set!.children[0]!;
    const svgFrame = firstIcon.children[0]!;
    // The createNodeFromSvg wrapper frame must be cleared to transparent —
    // otherwise its background paints a solid square over the icon geometry.
    expect(svgFrame.fills).toEqual([]);
    const vector = svgFrame.children[0]!;
    const boundIds = [
      ...Object.values(vector.boundVariables ?? {}),
      ...(
        (vector.fills as {
          boundVariables?: Record<string, { id: string }>;
        }[]) ?? []
      ).flatMap((paint) => Object.values(paint.boundVariables ?? {})),
      ...(
        (vector.strokes as {
          boundVariables?: Record<string, { id: string }>;
        }[]) ?? []
      ).flatMap((paint) => Object.values(paint.boundVariables ?? {})),
    ].map((alias) => alias.id);
    expect(boundIds).toContain(foreground!.id);
  });
});
