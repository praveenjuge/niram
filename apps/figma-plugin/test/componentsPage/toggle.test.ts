import { describe, expect, it } from "vitest";
import { addToggleSection } from "../../src/componentsPage/sections/toggle";
import { addToggleGroupSection } from "../../src/componentsPage/sections/toggleGroup";
import type { ComponentsInputs } from "../../src/componentsPage";
import { buildDesignSystem } from "../../src/designSystem";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";
import { collectIconComponents, type IconComponentMap } from "../../src/icons";

type NodeLike = {
  type: string;
  name: string;
  children: NodeLike[];
};

// Build a full set of Components inputs, optionally carrying the Design System
// icon component map (built by running buildDesignSystem first, exactly like
// the real plugin flow in code.ts).
async function makeInputs(opts: {
  iconLibrary?: string;
  withIcons: boolean;
  code?: string;
}): Promise<ComponentsInputs> {
  const code = opts.code ?? "b2fA";
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error("fixture failed to resolve");
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
  });

  const presetSummary = opts.iconLibrary
    ? { iconLibrary: opts.iconLibrary }
    : undefined;

  let iconComponents: IconComponentMap | undefined;
  if (opts.withIcons) {
    const ds = await buildDesignSystem({
      presetCode: code,
      presetSummary,
      tailwindColors: generated.variables.tailwindColors,
      primitives: generated.variables.primitives,
      theme: generated.variables.theme,
    });
    iconComponents = ds.iconComponents;
  }

  return {
    presetCode: code,
    presetSummary,
    primitives: generated.variables.primitives,
    tailwindColors: generated.variables.tailwindColors,
    theme: generated.variables.theme,
    iconComponents,
  };
}

function page(): NodeLike {
  return (
    globalThis as { figma: { createPage(): NodeLike } }
  ).figma.createPage();
}

function findComponentSet(root: NodeLike, name: string): NodeLike | undefined {
  if (root.type === "COMPONENT_SET" && root.name === name) return root;
  for (const child of root.children ?? []) {
    const found = findComponentSet(child, name);
    if (found) return found;
  }
  return undefined;
}

function descendants(root: NodeLike): NodeLike[] {
  const out: NodeLike[] = [];
  for (const child of root.children ?? []) {
    out.push(child, ...descendants(child));
  }
  return out;
}

describe("addToggleSection icons", () => {
  it("embeds icon instances when the icon component map is present", async () => {
    const inputs = await makeInputs({ withIcons: true });
    const p = page();
    await addToggleSection(p as unknown as PageNode, inputs);

    const set = findComponentSet(p, "Toggle");
    expect(set).toBeDefined();
    // Every variant component should hold an INSTANCE (the bold icon) and no
    // text fallback.
    for (const variant of set!.children) {
      const kids = variant.children;
      expect(kids.some((c) => c.type === "INSTANCE")).toBe(true);
      expect(kids.some((c) => c.type === "TEXT")).toBe(false);
    }
  });

  it("falls back to a text glyph when no icon map is provided", async () => {
    const inputs = await makeInputs({ withIcons: false });
    const p = page();
    await addToggleSection(p as unknown as PageNode, inputs);

    const set = findComponentSet(p, "Toggle");
    expect(set).toBeDefined();
    for (const variant of set!.children) {
      expect(variant.children.some((c) => c.type === "TEXT")).toBe(true);
      expect(variant.children.some((c) => c.type === "INSTANCE")).toBe(false);
    }
  });
});

describe("addToggleGroupSection icons", () => {
  it("embeds bold/italic/underline icon instances when the map is present", async () => {
    const inputs = await makeInputs({ withIcons: true });
    const p = page();
    await addToggleGroupSection(p as unknown as PageNode, inputs);

    const set = findComponentSet(p, "Toggle Group");
    expect(set).toBeDefined();
    // Each group variant holds three items; each item should embed one icon
    // instance (and no text fallback).
    for (const variant of set!.children) {
      const instances = descendants(variant).filter(
        (n) => n.type === "INSTANCE",
      );
      expect(instances.length).toBe(3);
      expect(descendants(variant).some((n) => n.type === "TEXT")).toBe(false);
    }
  });

  it("reuses the published Design System icon components (same names)", async () => {
    const code = "b2fA";
    const resolved = resolvePreset(code);
    if (!resolved.ok) throw new Error("fixture failed to resolve");
    const generated = await generateFromRegistry(resolved.data, {
      presetCode: code,
    });
    const ds = await buildDesignSystem({
      presetCode: code,
      tailwindColors: generated.variables.tailwindColors,
      primitives: generated.variables.primitives,
      theme: generated.variables.theme,
    });

    // The bold/italic/underline lucide icons (default library) must be present
    // in the collected map, proving the toggle group can reuse them.
    expect(ds.iconComponents.has("bold")).toBe(true);
    expect(ds.iconComponents.has("italic")).toBe(true);
    expect(ds.iconComponents.has("underline")).toBe(true);

    // The same map round-trips through collectIconComponents on the page.
    const dsPage = (
      globalThis as { figma: { root: { children: NodeLike[] } } }
    ).figma.root.children.find((c) => c.name === "Niram");
    expect(dsPage).toBeDefined();
    const recollected = collectIconComponents(dsPage as unknown as SceneNode);
    expect(recollected.has("bold")).toBe(true);
  });

  it("falls back to text glyphs when no icon map is provided", async () => {
    const inputs = await makeInputs({ withIcons: false });
    const p = page();
    await addToggleGroupSection(p as unknown as PageNode, inputs);

    const set = findComponentSet(p, "Toggle Group");
    expect(set).toBeDefined();
    for (const variant of set!.children) {
      const texts = descendants(variant).filter((n) => n.type === "TEXT");
      expect(texts.length).toBe(3);
      expect(descendants(variant).some((n) => n.type === "INSTANCE")).toBe(
        false,
      );
    }
  });
});
