// Fidelity coverage for the dashboard-01 block. Pins the structure and exact
// drawn copy shadcn's dashboard-01 ships (verified against
// https://ui.shadcn.com/r/styles/new-york-v4/dashboard-01.json): an inset
// sidebar rail, a site header, four KPI section cards, the interactive chart
// row, and the data-table toolbar/table. Copy that the block draws directly is
// asserted as exact text; reused component surfaces (Chart, Data Table, Badge,
// Button) are asserted structurally, since the Figma fake exposes only an
// instance's source name (not its inner overrides).

import { describe, expect, it } from "vitest";
import { addDashboardBlock } from "../../src/blocksPage/blocks/dashboard";
import type { BlocksInputs } from "../../src/blocksPage";
import { buildComponentsPage } from "../../src/componentsPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

type Root = { figma: { root: { children: { type: string; name: string }[] } } };

async function makeInputsOnComponentsPage(
  code = "b2fA",
): Promise<BlocksInputs> {
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error("fixture failed to resolve");
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
  });
  const componentsInputs = {
    presetCode: code,
    primitives: generated.variables.primitives,
    tailwindColors: generated.variables.tailwindColors,
    theme: generated.variables.theme,
  };
  await buildComponentsPage(componentsInputs);
  const targetPage = (globalThis as unknown as Root).figma.root.children.find(
    (c) => c.type === "PAGE" && c.name === "Niram",
  ) as unknown as PageNode;
  return { ...componentsInputs, targetPage };
}

type FakeNode = {
  type: string;
  name: string;
  characters?: string;
  children?: FakeNode[];
};

function collect(
  node: FakeNode,
  predicate: (n: FakeNode) => boolean,
): FakeNode[] {
  const out: FakeNode[] = [];
  const visit = (n: FakeNode) => {
    if (predicate(n)) out.push(n);
    for (const child of n.children ?? []) visit(child);
  };
  visit(node);
  return out;
}

function textSet(node: FakeNode): Set<string> {
  return new Set(
    collect(node, (n) => n.type === "TEXT").map((n) => n.characters ?? ""),
  );
}

function byName(node: FakeNode, name: string): FakeNode | undefined {
  return collect(node, (n) => n.name === name)[0];
}

async function renderDashboard(): Promise<FakeNode> {
  const inputs = await makeInputsOnComponentsPage();
  const page = inputs.targetPage as unknown as { children: FakeNode[] };
  const count = await addDashboardBlock(inputs.targetPage, inputs);
  expect(count).toBeGreaterThan(0);
  const block = page.children[page.children.length - 1]!;
  expect(block.name).toBe("Dashboard");
  return block;
}

describe("dashboard-01 fidelity", () => {
  it("renders an inset sidebar rail with the dashboard nav", async () => {
    const block = await renderDashboard();
    const rail = byName(block, "Sidebar");
    expect(rail).toBeDefined();
    const railTexts = textSet(rail!);
    expect(railTexts.has("Acme Inc.")).toBe(true);
    for (const item of ["Dashboard", "Lifecycle", "Analytics"]) {
      expect(railTexts.has(item), `rail missing ${item}`).toBe(true);
    }
  });

  it("renders the site header with the Documents title", async () => {
    const block = await renderDashboard();
    const header = byName(block, "Site Header");
    expect(header).toBeDefined();
    expect(textSet(header!).has("Documents")).toBe(true);
  });

  it("renders four KPI section cards with the exact registry copy", async () => {
    const block = await renderDashboard();
    const cards = byName(block, "Section Cards");
    expect(cards).toBeDefined();
    expect((cards!.children ?? []).length).toBe(4);

    const texts = textSet(block);
    // Descriptions, values, footer titles, and footer notes, per stat.
    const expected = [
      "Total Revenue",
      "$1,250.00",
      "Trending up this month",
      "Visitors for the last 6 months",
      "New Customers",
      "1,234",
      "Down 20% this period",
      "Acquisition needs attention",
      "Active Accounts",
      "45,678",
      "Strong user retention",
      "Engagement exceed targets",
      "Growth Rate",
      "4.5%",
      "Steady performance increase",
      "Meets growth projections",
    ];
    for (const copy of expected) {
      expect(texts.has(copy), `cards missing "${copy}"`).toBe(true);
    }
  });

  it("renders the interactive chart row holding a reused/fallback chart", async () => {
    const block = await renderDashboard();
    const chartRow = byName(block, "Chart Row");
    expect(chartRow).toBeDefined();
    // The row holds either a reused Chart instance (components page present) or
    // the drawn fallback panel — never empty.
    expect((chartRow!.children ?? []).length).toBeGreaterThan(0);
  });

  it("renders the table toolbar tabs and actions above the data table", async () => {
    const block = await renderDashboard();
    const tableRow = byName(block, "Table Row");
    expect(tableRow).toBeDefined();

    const toolbar = byName(block, "Toolbar");
    expect(toolbar).toBeDefined();

    // The tabs strip carries the three table views, with Outline active.
    const tabs = byName(toolbar!, "Tabs");
    expect(tabs).toBeDefined();
    expect((tabs!.children ?? []).length).toBe(3);
    expect(byName(tabs!, "Tab (active)")).toBeDefined();

    const tabTexts = textSet(tabs!);
    for (const label of ["Outline", "Past Performance", "Key Personnel"]) {
      expect(tabTexts.has(label), `tabs missing ${label}`).toBe(true);
    }

    // The data table row holds content (reused Data Table instance or fallback).
    expect((tableRow!.children ?? []).length).toBeGreaterThan(1);
  });

  it("reuses live component instances on the components page", async () => {
    const block = await renderDashboard();
    expect(collect(block, (n) => n.type === "INSTANCE").length).toBeGreaterThan(
      0,
    );
  });
});
