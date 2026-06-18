import { describe, expect, it } from "vitest";
import { addSidebarBlock } from "../../src/blocksPage/blocks/sidebar";
import { SIDEBAR_VARIANTS } from "../../src/blocksPage/blocks/sidebar/variants";
import { SIDEBAR_HEIGHT } from "../../src/blocksPage/blocks/sidebar/primitives";
import type { BlocksInputs } from "../../src/blocksPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

// Build real theme/primitive variables so the rails bind their sidebar tokens
// (`--sidebar-*`) exactly like a live run, then render the block onto a bare
// page (no Components grid — the sidebar variants are self-contained).
async function makeInputs(code = "b2fA"): Promise<BlocksInputs> {
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error("fixture failed to resolve");
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
  });
  const figma = (
    globalThis as unknown as { figma: { createPage: () => PageNode } }
  ).figma;
  const page = figma.createPage();
  (page as unknown as { name: string }).name = "Scratch";
  return {
    presetCode: code,
    primitives: generated.variables.primitives,
    tailwindColors: generated.variables.tailwindColors,
    theme: generated.variables.theme,
    targetPage: page,
  };
}

type FakeNode = {
  type: string;
  name: string;
  width: number;
  height: number;
  children: FakeNode[];
};

describe("addSidebarBlock", () => {
  it("combines the 16 shadcn sidebar layouts into one component set", async () => {
    const inputs = await makeInputs();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };

    const count = await addSidebarBlock(page as never, inputs);
    expect(count).toBeGreaterThan(0);

    // One top-level node: the bordered card wrapping the set.
    expect(page.children).toHaveLength(1);
    const set = findComponentSet(page.children[0]!);
    expect(set).toBeDefined();
    expect(set!.name).toBe("Sidebar");
    expect(set!.children).toHaveLength(16);
  });

  it("names every variant Variant=sidebar-NN", async () => {
    const inputs = await makeInputs();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };
    await addSidebarBlock(page as never, inputs);

    const set = findComponentSet(page.children[0]!)!;
    const names = set.children.map((c) => c.name).sort();
    expect(names).toEqual(
      SIDEBAR_VARIANTS.map((v) => `Variant=${v.key}`).sort(),
    );
  });

  it("gives each sidebar variant the requested 982px height", async () => {
    const inputs = await makeInputs();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };
    await addSidebarBlock(page as never, inputs);

    const set = findComponentSet(page.children[0]!)!;
    for (const variant of set.children) {
      expect(variant.height).toBe(SIDEBAR_HEIGHT);
    }
  });

  it("pins the set to the full 1512 block-canvas width", async () => {
    const inputs = await makeInputs();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };
    await addSidebarBlock(page as never, inputs);

    const set = findComponentSet(page.children[0]!)!;
    expect(set.width).toBe(1512);
  });

  it("wraps each SidebarMenu's items in a Menu Items slot", async () => {
    const inputs = await makeInputs();
    const page = inputs.targetPage as unknown as { children: FakeNode[] };
    await addSidebarBlock(page as never, inputs);

    const set = findComponentSet(page.children[0]!)!;
    // Every variant slots at least its primary menu; the items are preserved
    // inside the slot (so fidelity assertions still find the rows).
    for (const variant of set.children) {
      const slots = collect(
        variant,
        (n) => n.type === "SLOT" && n.name.startsWith("Menu Items"),
      );
      expect(
        slots.length,
        `${variant.name} has no Menu Items slot`,
      ).toBeGreaterThan(0);
    }
  });
});

function findComponentSet(node: FakeNode): FakeNode | undefined {
  if (node.type === "COMPONENT_SET") return node;
  for (const child of node.children ?? []) {
    const found = findComponentSet(child);
    if (found) return found;
  }
  return undefined;
}

// ----- Per-variant fidelity ------------------------------------------------
// Each of the 16 sidebar layouts must render its signature content (group
// labels, nav rows, sample data) and, where the official block marks a current
// route, an active row (`data-active` → an "(active)"-named node). Anchor text
// is transcribed from src/blocksPage/blocks/sidebar/data.ts, which mirrors
// shadcn's apps/v4 sidebar-01 … sidebar-16.

type TextNode = FakeNode & { characters?: string };

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

function variantTexts(node: FakeNode): Set<string> {
  return new Set(
    collect(node, (n) => n.type === "TEXT").map(
      (n) => (n as TextNode).characters ?? "",
    ),
  );
}

function hasActiveRow(node: FakeNode): boolean {
  return collect(node, (n) => n.name.endsWith("(active)")).length > 0;
}

// key → { signature copy that must render, whether a current row is active }.
const VARIANT_CONTENT: Record<string, { contains: string[]; active: boolean }> =
  {
    "sidebar-01": {
      contains: ["Documentation", "Getting Started", "Data Fetching"],
      active: true,
    },
    "sidebar-02": {
      contains: ["Documentation", "Getting Started"],
      active: true,
    },
    "sidebar-03": {
      contains: ["Documentation", "Getting Started"],
      active: true,
    },
    "sidebar-04": {
      contains: ["Documentation", "Getting Started"],
      active: true,
    },
    "sidebar-05": {
      contains: ["Documentation", "Getting Started"],
      active: true,
    },
    "sidebar-06": {
      contains: ["Documentation", "Subscribe to our newsletter"],
      active: false,
    },
    // The Platform nav (07/08/16) doesn't highlight a current row; instead the
    // active "Playground" group renders expanded (its History/Starred/Settings
    // submenu), mirroring shadcn's collapsible `defaultOpen={isActive}`.
    "sidebar-07": {
      contains: [
        "Acme Inc",
        "Platform",
        "Playground",
        "History",
        "Starred",
        "Projects",
        "shadcn",
      ],
      active: false,
    },
    "sidebar-08": {
      contains: [
        "Acme Inc",
        "Platform",
        "History",
        "Starred",
        "Projects",
        "Support",
        "shadcn",
      ],
      active: false,
    },
    "sidebar-09": {
      contains: ["Inbox", "Meeting Tomorrow", "William Smith"],
      active: true,
    },
    "sidebar-10": {
      contains: ["Acme Inc", "Favorites", "Workspaces", "Home"],
      active: true,
    },
    "sidebar-11": {
      contains: ["Changes", "Files", "README.md", "button.tsx"],
      active: true,
    },
    "sidebar-12": {
      contains: ["New Calendar", "My Calendars", "October 2024"],
      active: false,
    },
    "sidebar-13": {
      contains: ["Messages & media", "Notifications"],
      active: true,
    },
    "sidebar-14": {
      contains: ["Table of Contents", "Getting Started"],
      active: true,
    },
    "sidebar-15": {
      contains: ["Acme Inc", "Favorites", "Workspaces"],
      active: true,
    },
    "sidebar-16": {
      contains: [
        "Acme Inc",
        "Platform",
        "History",
        "Starred",
        "Projects",
        "shadcn",
      ],
      active: false,
    },
  };

describe("sidebar variant fidelity", () => {
  for (const [key, spec] of Object.entries(VARIANT_CONTENT)) {
    it(`${key} renders its signature sections${
      spec.active ? " and an active row" : ""
    }`, async () => {
      const inputs = await makeInputs();
      const page = inputs.targetPage as unknown as { children: FakeNode[] };
      await addSidebarBlock(page as never, inputs);

      const set = findComponentSet(page.children[0]!)!;
      const variant = set.children.find((c) => c.name === `Variant=${key}`);
      expect(variant, `missing Variant=${key}`).toBeDefined();

      const texts = variantTexts(variant!);
      for (const copy of spec.contains) {
        expect(texts.has(copy), `${key} missing "${copy}"`).toBe(true);
      }

      if (spec.active) {
        expect(hasActiveRow(variant!), `${key} has no active row`).toBe(true);
      }
    });
  }
});
