// Coverage for the July 2026 shadcn Message Scroller component, shipped as
// the standalone jump-to-latest control. Asserts both state variants, the
// fixed circle vs hugging pill sizing, theme-bound fills, the overlay shadow,
// and the unread-count copy.

import { describe, expect, it } from "vitest";
import { addMessageScrollerSection } from "../../src/componentsPage/sections/messageScroller";
import type { ComponentsInputs } from "../../src/componentsPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

type FakeNode = {
  type: string;
  name: string;
  children: FakeNode[];
  characters?: string;
  width?: number;
  height?: number;
  fills?: { boundVariables?: { color?: { id: string } } }[];
  effects?: unknown[];
  [key: string]: unknown;
};

const fig = () => (globalThis as { figma: typeof figma }).figma;

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

function byName(root: FakeNode, name: string): FakeNode[] {
  return descendants(root).filter((n) => n.name === name);
}

function hasBoundFill(root: FakeNode): boolean {
  return descendants(root).some(
    (node) => Boolean(node.fills?.[0]?.boundVariables?.color?.id),
  );
}

describe("Message Scroller section", () => {
  it("ships following and new-messages states", async () => {
    const inputs = await makeInputs();
    const p = page();
    const count = await addMessageScrollerSection(
      p as unknown as PageNode,
      inputs,
    );
    expect(count).toBeGreaterThan(0);

    const set = findSet(p, "Message Scroller");
    expect(set).toBeDefined();
    expect(set!.children.map((c) => c.name)).toEqual([
      "State=following",
      "State=new-messages",
    ]);
    expect(hasBoundFill(set!)).toBe(true);
  });

  it("keeps the icon-only control a fixed 28px rounded square", async () => {
    const inputs = await makeInputs();
    const p = page();
    await addMessageScrollerSection(p as unknown as PageNode, inputs);
    const set = findSet(p, "Message Scroller")!;

    const following = set.children.find((c) => c.name === "State=following")!;
    expect(following.width).toBe(28);
    expect(following.height).toBe(28);
    // The arrow is the only child; no count label on this variant.
    expect(byName(following, "Icon")).toHaveLength(1);
    expect(byName(following, "Count")).toHaveLength(0);
  });

  it("binds the source's background surface, border, and foreground glyph", async () => {
    const inputs = await makeInputs();
    const p = page();
    await addMessageScrollerSection(p as unknown as PageNode, inputs);
    const set = findSet(p, "Message Scroller")!;

    const backgroundId = inputs.theme.light.get("background")!.id;
    const borderId = inputs.theme.light.get("border")!.id;
    const foregroundId = inputs.theme.light.get("foreground")!.id;

    for (const variant of set.children) {
      // `bg-background` + `border-border` per the scroller's class overrides.
      expect(variant.fills?.[0]?.boundVariables?.color?.id).toBe(backgroundId);
      expect(variant.strokes?.[0]?.boundVariables?.color?.id).toBe(borderId);
      // The arrow follows `text-foreground`.
      const icon = byName(variant, "Icon")[0]!;
      const iconPaints = descendants(icon).find(
        (n) => n.fills?.[0]?.boundVariables?.color?.id !== undefined,
      )?.fills;
      expect(iconPaints?.[0]?.boundVariables?.color?.id).toBe(foregroundId);
      // No shadow — the base button and secondary variant carry none.
      expect(variant.effects?.length ?? 0).toBe(0);
    }
  });

  it("hugs the unread count into a pill", async () => {
    const inputs = await makeInputs();
    const p = page();
    await addMessageScrollerSection(p as unknown as PageNode, inputs);
    const set = findSet(p, "Message Scroller")!;

    const unread = set.children.find((c) => c.name === "State=new-messages")!;
    // Height stays fixed at 28 while the width hugs arrow + label.
    expect(unread.height).toBe(28);
    expect(unread.width).toBeGreaterThan(28);
    expect(byName(unread, "Icon")).toHaveLength(1);
    const counts = byName(unread, "Count");
    expect(counts).toHaveLength(1);
    expect(counts[0]!.characters).toBe("3 new");
  });
});
