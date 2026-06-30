import { describe, expect, it } from "vitest";
import type { ComponentsInputs } from "../../src/componentsPage";
import { addSidebarSection } from "../../src/componentsPage/sections/sidebar";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

// Real generated variables so the atoms bind their `--sidebar-*` tokens exactly
// like a live run.
async function makeInputs(code = "b2fA"): Promise<ComponentsInputs> {
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error("fixture failed to resolve");
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
  });
  return {
    presetCode: code,
    primitives: generated.variables.primitives,
    tailwindColors: generated.variables.tailwindColors,
    theme: generated.variables.theme,
  };
}

type FakeNode = {
  type: string;
  name: string;
  children: FakeNode[];
  fills?: unknown[];
  [key: string]: unknown;
};

function fig(): { createPage: () => FakeNode } {
  return (globalThis as unknown as { figma: { createPage: () => FakeNode } })
    .figma;
}

function collect(
  root: FakeNode,
  predicate: (n: FakeNode) => boolean,
): FakeNode[] {
  const out: FakeNode[] = [];
  const visit = (n: FakeNode) => {
    if (predicate(n)) out.push(n);
    for (const child of n.children ?? []) visit(child);
  };
  visit(root);
  return out;
}

function findByName(
  root: FakeNode,
  type: string,
  name: string,
): FakeNode | undefined {
  return collect(root, (n) => n.type === type && n.name === name)[0];
}

function hasBoundFill(root: FakeNode): boolean {
  return collect(root, () => true).some((node) => {
    const fills = node.fills as
      | { boundVariables?: { color?: { id: string } } }[]
      | undefined;
    return Boolean(fills?.[0]?.boundVariables?.color?.id);
  });
}

async function build(): Promise<FakeNode> {
  const page = fig().createPage();
  const count = await addSidebarSection(page as never, await makeInputs());
  expect(count).toBeGreaterThan(0);
  return page as FakeNode;
}

describe("addSidebarSection", () => {
  it("publishes the Sidebar Menu Button set with State × Size variants", async () => {
    const page = await build();
    const set = findByName(page, "COMPONENT_SET", "Sidebar Menu Button");
    expect(set).toBeDefined();
    // 2 states × 3 sizes.
    expect(set!.children).toHaveLength(6);
    const names = set!.children.map((c) => c.name).sort();
    expect(names).toEqual(
      [
        "State=default, Size=default",
        "State=default, Size=sm",
        "State=default, Size=lg",
        "State=active, Size=default",
        "State=active, Size=sm",
        "State=active, Size=lg",
      ].sort(),
    );
    // The active variants bind the sidebar accent fill.
    expect(hasBoundFill(set!)).toBe(true);
  });

  it("publishes the Sidebar Menu Sub Button set with State variants", async () => {
    const page = await build();
    const set = findByName(page, "COMPONENT_SET", "Sidebar Menu Sub Button");
    expect(set).toBeDefined();
    expect(set!.children).toHaveLength(2);
    expect(set!.children.map((c) => c.name).sort()).toEqual(
      ["State=active", "State=default"].sort(),
    );
  });

  it("publishes the Group Label, Separator atoms and the Menu variant set", async () => {
    const page = await build();
    expect(findByName(page, "COMPONENT", "Sidebar Group Label")).toBeDefined();
    expect(findByName(page, "COMPONENT", "Sidebar Separator")).toBeDefined();
    const menuSet = findByName(page, "COMPONENT_SET", "Sidebar Menu");
    expect(menuSet).toBeDefined();
    expect(menuSet!.children.map((c) => c.name).sort()).toEqual(
      ["Variant=default", "Variant=labeled", "Variant=submenu"].sort(),
    );
  });

  it("composes each Sidebar Menu variant from a real Items slot of instances", async () => {
    const page = await build();
    const menuSet = findByName(page, "COMPONENT_SET", "Sidebar Menu")!;
    for (const variant of menuSet.children) {
      const slots = collect(
        variant,
        (n) => n.type === "SLOT" && n.name === "Items",
      );
      expect(slots, `${variant.name} missing Items slot`).toHaveLength(1);
      const instances = collect(slots[0]!, (n) => n.type === "INSTANCE");
      expect(
        instances.length,
        `${variant.name} has no instances`,
      ).toBeGreaterThan(0);
    }
    // The submenu variant nests a SidebarMenuSub of sub-button instances.
    const submenu = menuSet.children.find((c) => c.name === "Variant=submenu")!;
    const sub = collect(submenu, (n) => n.type === "FRAME" && n.name === "Sub");
    expect(sub.length).toBeGreaterThan(0);
  });

  it("exposes an editable Label across the menu-button variants", async () => {
    const page = await build();
    const set = findByName(page, "COMPONENT_SET", "Sidebar Menu Button")!;
    const props = set.__componentProperties as
      | Record<string, { type: string }>
      | undefined;
    expect(props).toBeDefined();
    const hasLabel = Object.keys(props!).some((k) => k.startsWith("Label#"));
    expect(hasLabel).toBe(true);
  });

  it("uses swappable icon-set instances when the icon set is published", async () => {
    const inputs = await makeInputs();
    // A minimal published icon set: the default (lucide) leading + trailing
    // glyphs as components the buttons instance (and the rails can swap).
    const figmaApi = (
      globalThis as unknown as { figma: { createComponent: () => FakeNode } }
    ).figma;
    const iconComponents = new Map<string, FakeNode>([
      ["folder", figmaApi.createComponent()],
      ["chevron-right", figmaApi.createComponent()],
    ]);

    const page = fig().createPage();
    await addSidebarSection(page as never, {
      ...inputs,
      iconComponents: iconComponents as never,
    });

    const set = findByName(
      page as FakeNode,
      "COMPONENT_SET",
      "Sidebar Menu Button",
    )!;
    // Each menu-button variant now carries an "Icon" instance of the set.
    const iconInstances = collect(
      set,
      (n) => n.type === "INSTANCE" && n.name === "Icon",
    );
    expect(iconInstances.length).toBe(6);
    const trailingInstances = collect(
      set,
      (n) => n.type === "INSTANCE" && n.name === "Trailing",
    );
    expect(trailingInstances.length).toBe(6);
  });
});
