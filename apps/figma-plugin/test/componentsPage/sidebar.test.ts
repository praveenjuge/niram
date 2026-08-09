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
  it("publishes the Sidebar Menu Button set with State × Size × Display variants", async () => {
    const page = await build();
    const set = findByName(page, "COMPONENT_SET", "Sidebar Menu Button");
    expect(set).toBeDefined();
    // 2 states × 3 sizes × expanded/icon-only display.
    expect(set!.children).toHaveLength(12);
    const names = set!.children.map((c) => c.name).sort();
    const expected: string[] = [];
    for (const state of ["default", "active"]) {
      for (const size of ["default", "sm", "lg"]) {
        for (const display of ["expanded", "icon"]) {
          expected.push(
            `State=${state}, Size=${size}, Display=${display}`,
          );
        }
      }
    }
    expect(names).toEqual(expected.sort());
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

  it("clamps menu labels to one ellipsized line", async () => {
    const page = await build();
    const buttonSet = findByName(
      page,
      "COMPONENT_SET",
      "Sidebar Menu Button",
    )!;
    const subButtonSet = findByName(
      page,
      "COMPONENT_SET",
      "Sidebar Menu Sub Button",
    )!;

    for (const set of [buttonSet, subButtonSet]) {
      const labels = collect(
        set,
        (node) => node.type === "TEXT" && node.name === "Label",
      );
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) {
        expect(label.layoutSizingHorizontal).toBe("FILL");
        expect(label.textAutoResize).toBe("HEIGHT");
        expect(label.textTruncation).toBe("ENDING");
        expect(label.maxLines).toBe(1);
      }
    }
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

  it("publishes interchangeable sidebar rows, groups, and shell variants", async () => {
    const page = await build();
    for (const name of [
      "Sidebar Project Row",
      "Sidebar Workspace Row",
      "Sidebar Search",
      "Sidebar Team Switcher",
      "Sidebar User Menu",
      "Sidebar Group",
    ]) {
      const set = findByName(page, "COMPONENT_SET", name);
      expect(set, `missing ${name}`).toBeDefined();
      expect(set!.children.map((child) => child.name).sort()).toEqual([
        "State=collapsed",
        "State=expanded",
      ]);
    }

    const shell = findByName(page, "COMPONENT_SET", "Sidebar Shell")!;
    expect(shell.children).toHaveLength(12);
    expect(
      shell.children.some(
        (child) =>
          child.name ===
          "State=collapsed, Side=right, Style=floating",
      ),
    ).toBe(true);
  });

  it("gives every shell semantic content slots and every group an Items slot", async () => {
    const page = await build();
    const shell = findByName(page, "COMPONENT_SET", "Sidebar Shell")!;
    for (const variant of shell.children) {
      const slotNames = collect(variant, (node) => node.type === "SLOT")
        .map((slot) => slot.name)
        .sort();
      expect(slotNames).toEqual(
        ["Footer", "Header", "Navigation", "Secondary Navigation"].sort(),
      );
    }

    const group = findByName(page, "COMPONENT_SET", "Sidebar Group")!;
    for (const variant of group.children) {
      expect(
        collect(
          variant,
          (node) => node.type === "SLOT" && node.name === "Items",
        ),
      ).toHaveLength(1);
    }
  });

  it("keeps the sidebar library in one top-level Components section", async () => {
    const page = await build();
    expect(page.children).toHaveLength(1);
    expect(page.children[0]!.type).toBe("FRAME");
    expect(page.children[0]!.name).toBe("Sidebar");
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

  it("exposes editable content and visibility controls across menu-button variants", async () => {
    const page = await build();
    const set = findByName(page, "COMPONENT_SET", "Sidebar Menu Button")!;
    const props = set.__componentProperties as
      | Record<string, { type: string }>
      | undefined;
    expect(props).toBeDefined();
    const names = Object.keys(props!).map((key) => key.split("#")[0]);
    expect(names).toEqual(
      expect.arrayContaining([
        "Label",
        "Subtitle",
        "Show subtitle",
        "Badge",
        "Show badge",
      ]),
    );
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
    expect(iconInstances.length).toBe(12);
    const trailingInstances = collect(
      set,
      (n) => n.type === "INSTANCE" && n.name === "Trailing",
    );
    expect(trailingInstances.length).toBe(12);
    const properties = set.__componentProperties as Record<string, unknown>;
    const propertyNames = Object.keys(properties).map((key) => key.split("#")[0]);
    expect(propertyNames).toEqual(
      expect.arrayContaining([
        "Show leading icon",
        "Show trailing icon",
        "Leading icon",
        "Trailing icon",
      ]),
    );
  });
});
