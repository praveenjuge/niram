import { describe, expect, it } from "vitest";
import type { ComponentsInputs } from "../../src/componentsPage";
import { buildComponentsPage } from "../../src/componentsPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

import { addFieldSection } from "../../src/componentsPage/sections/field";
import { addInputGroupSection } from "../../src/componentsPage/sections/inputGroup";
import { addComboboxSection } from "../../src/componentsPage/sections/combobox";
import { addDatePickerSection } from "../../src/componentsPage/sections/datePicker";
import { addCalendarSection } from "../../src/componentsPage/sections/calendar";
import { addContextMenuSection } from "../../src/componentsPage/sections/contextMenu";
import { addItemSection } from "../../src/componentsPage/sections/item";
import { addEmptySection } from "../../src/componentsPage/sections/empty";
import { addSkeletonSection } from "../../src/componentsPage/sections/skeleton";
import { addCardSection } from "../../src/componentsPage/sections/card";

type FakeNode = {
  type: string;
  name: string;
  children: FakeNode[];
  fills?: unknown[];
  strokes?: unknown[];
  [key: string]: unknown;
};

const fig = () => (globalThis as { figma: typeof figma }).figma;

// Real generated variables so binding assertions exercise the preset pipeline
// (resolvePreset -> Figma variables) rather than empty maps.
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

function page(): FakeNode {
  return fig().createPage() as unknown as FakeNode;
}

function findSet(root: FakeNode, name: string): FakeNode | undefined {
  if (root.type === "COMPONENT_SET" && root.name === name) return root;
  for (const child of root.children ?? []) {
    const found = findSet(child, name);
    if (found) return found;
  }
  return undefined;
}

function descendants(root: FakeNode): FakeNode[] {
  const out: FakeNode[] = [];
  for (const child of root.children ?? [])
    out.push(child, ...descendants(child));
  return out;
}

// True when any descendant carries a fill bound to a colour variable — proves
// the section binds semantic tokens rather than baking literal colours.
function hasBoundFill(root: FakeNode): boolean {
  return descendants(root).some((node) => {
    const fills = node.fills as
      | { boundVariables?: { color?: { id: string } } }[]
      | undefined;
    return Boolean(fills?.[0]?.boundVariables?.color?.id);
  });
}

// True when any descendant has a bound corner radius (setBoundVariable records
// the field in the mock's boundVariables map).
function hasBoundRadius(root: FakeNode): boolean {
  return descendants(root).some((node) => {
    const bound = node.boundVariables as Record<string, unknown> | undefined;
    return Boolean(bound && bound.topLeftRadius);
  });
}

async function buildSet(
  build: (p: PageNode, i: ComponentsInputs) => Promise<number>,
  setName: string,
): Promise<{ set: FakeNode; variants: string[] }> {
  const inputs = await makeInputs();
  const p = page();
  const count = await build(p as unknown as PageNode, inputs);
  expect(count).toBeGreaterThan(0);
  const set = findSet(p, setName);
  expect(set, `expected a component set named ${setName}`).toBeDefined();
  return { set: set!, variants: set!.children.map((c) => c.name) };
}

describe("curated component variants", () => {
  it("Field exposes the curated control compositions", async () => {
    const { set, variants } = await buildSet(addFieldSection, "Field");
    expect(set.children).toHaveLength(5);
    expect(variants.sort()).toEqual(
      [
        "Variant=checkbox",
        "Variant=input",
        "Variant=invalid",
        "Variant=select",
        "Variant=textarea",
      ].sort(),
    );
    expect(hasBoundFill(set)).toBe(true);
    expect(hasBoundRadius(set)).toBe(true);
  });

  it("Input Group exposes the curated addon compositions", async () => {
    const { set, variants } = await buildSet(
      addInputGroupSection,
      "Input Group",
    );
    expect(set.children).toHaveLength(6);
    expect(variants.sort()).toEqual(
      [
        "Variant=button",
        "Variant=icon",
        "Variant=kbd",
        "Variant=spinner",
        "Variant=text",
        "Variant=textarea",
      ].sort(),
    );
    expect(hasBoundFill(set)).toBe(true);
    expect(hasBoundRadius(set)).toBe(true);
  });

  it("Combobox exposes the curated list compositions", async () => {
    const { set, variants } = await buildSet(addComboboxSection, "Combobox");
    expect(set.children).toHaveLength(5);
    expect(variants.sort()).toEqual(
      [
        "Variant=clearable",
        "Variant=default",
        "Variant=disabled",
        "Variant=grouped",
        "Variant=multiple",
      ].sort(),
    );
    expect(hasBoundFill(set)).toBe(true);
    expect(hasBoundRadius(set)).toBe(true);
  });

  it("Date Picker exposes the curated trigger compositions", async () => {
    const { set, variants } = await buildSet(
      addDatePickerSection,
      "Date Picker",
    );
    expect(set.children).toHaveLength(5);
    expect(variants.sort()).toEqual(
      [
        "Variant=basic",
        "Variant=dropdown",
        "Variant=input",
        "Variant=range",
        "Variant=time",
      ].sort(),
    );
    expect(hasBoundFill(set)).toBe(true);
    expect(hasBoundRadius(set)).toBe(true);
  });

  it("Calendar exposes the curated selection compositions", async () => {
    const { set, variants } = await buildSet(addCalendarSection, "Calendar");
    expect(set.children).toHaveLength(5);
    expect(variants.sort()).toEqual(
      [
        "Variant=basic",
        "Variant=dropdown",
        "Variant=multiple",
        "Variant=range",
        "Variant=week-numbers",
      ].sort(),
    );
    expect(hasBoundFill(set)).toBe(true);
    expect(hasBoundRadius(set)).toBe(true);
  });

  it("Context Menu exposes the curated item-type compositions", async () => {
    const { set, variants } = await buildSet(
      addContextMenuSection,
      "Context Menu",
    );
    expect(set.children).toHaveLength(6);
    expect(variants.sort()).toEqual(
      [
        "Variant=basic",
        "Variant=checkbox",
        "Variant=destructive",
        "Variant=icons",
        "Variant=shortcuts",
        "Variant=submenu",
      ].sort(),
    );
    expect(hasBoundFill(set)).toBe(true);
    expect(hasBoundRadius(set)).toBe(true);
  });

  it("Item exposes the curated content compositions", async () => {
    const { set, variants } = await buildSet(addItemSection, "Item");
    expect(set.children).toHaveLength(5);
    expect(variants.sort()).toEqual(
      [
        "Variant=action",
        "Variant=avatar",
        "Variant=default",
        "Variant=muted",
        "Variant=outline",
      ].sort(),
    );
    expect(hasBoundFill(set)).toBe(true);
    expect(hasBoundRadius(set)).toBe(true);
  });

  it("Empty exposes the curated empty-state compositions", async () => {
    const { set, variants } = await buildSet(addEmptySection, "Empty");
    expect(set.children).toHaveLength(3);
    expect(variants.sort()).toEqual(
      ["Variant=avatar", "Variant=background", "Variant=default"].sort(),
    );
    expect(hasBoundFill(set)).toBe(true);
    expect(hasBoundRadius(set)).toBe(true);
  });

  it("Skeleton exposes the curated loading shapes", async () => {
    const { set, variants } = await buildSet(addSkeletonSection, "Skeleton");
    expect(set.children).toHaveLength(7);
    expect(variants).toContain("Shape=list");
    expect(variants).toContain("Shape=card");
    expect(variants).toContain("Shape=paragraph");
    expect(hasBoundFill(set)).toBe(true);
  });

  it("Card exposes the curated container compositions", async () => {
    const { set, variants } = await buildSet(addCardSection, "Card");
    expect(set.children).toHaveLength(5);
    expect(variants.sort()).toEqual(
      [
        "Variant=action",
        "Variant=default",
        "Variant=image",
        "Variant=interactive",
        "Variant=simple",
      ].sort(),
    );
    expect(hasBoundFill(set)).toBe(true);
    expect(hasBoundRadius(set)).toBe(true);
  });
});

describe("curated variants in the full Components build", () => {
  // High-impact batch: build the whole region and confirm the upgraded sets
  // land on the single Niram page with their curated variant counts, surviving
  // the post-build text-style + token-binding sweeps.
  const EXPECTED: Record<string, number> = {
    Field: 5,
    "Input Group": 6,
    Combobox: 5,
    "Date Picker": 5,
    Calendar: 5,
    "Context Menu": 6,
    Item: 5,
    Empty: 3,
    Skeleton: 7,
    Card: 5,
  };

  async function fullInputs(code = "b2fA"): Promise<ComponentsInputs> {
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

  function niramPages(): FakeNode[] {
    return (fig().root as unknown as { children: FakeNode[] }).children.filter(
      (c) => c.name === "Niram",
    );
  }

  it("renders every curated set on a single rebuilt Niram page", async () => {
    const inputs = await fullInputs();
    await buildComponentsPage(inputs);
    // Re-run with the same preset: the builder must clear only its own region
    // and not mint a second page.
    await buildComponentsPage(inputs);

    const pages = niramPages();
    expect(pages).toHaveLength(1);
    const niram = pages[0]!;

    for (const [name, expectedCount] of Object.entries(EXPECTED)) {
      const set = findSet(niram, name);
      expect(set, `expected set ${name} on the Niram page`).toBeDefined();
      expect(
        set!.children.length,
        `${name} should have ${expectedCount} variants`,
      ).toBe(expectedCount);
    }
  });
});
