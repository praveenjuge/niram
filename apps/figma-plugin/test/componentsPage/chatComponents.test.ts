// Coverage for the June 2026 shadcn chat components: Bubble, Marker,
// Attachment, and Message. Each is built in isolation against the in-memory
// figma-mock and asserted on its variant set, theme-bound fills, and the
// editable text content it ships.

import { describe, expect, it } from "vitest";
import { addBubbleSection } from "../../src/componentsPage/sections/bubble";
import { addMarkerSection } from "../../src/componentsPage/sections/marker";
import { addAttachmentSection } from "../../src/componentsPage/sections/attachment";
import { addMessageSection } from "../../src/componentsPage/sections/message";
import type { ComponentsInputs } from "../../src/componentsPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

type FakeNode = {
  type: string;
  name: string;
  children: FakeNode[];
  characters?: string;
  fills?: { boundVariables?: { color?: { id: string } } }[];
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

function hasBoundFill(root: FakeNode): boolean {
  return descendants(root).some(
    (node) => Boolean(node.fills?.[0]?.boundVariables?.color?.id),
  );
}

function textChars(root: FakeNode): Set<string> {
  return new Set(
    descendants(root)
      .filter((n) => n.type === "TEXT")
      .map((n) => n.characters ?? ""),
  );
}

function byName(root: FakeNode, name: string): FakeNode[] {
  return descendants(root).filter((n) => n.name === name);
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

describe("Bubble section", () => {
  it("ships the seven variants crossed with both alignments", async () => {
    const { set, variants } = await buildSet(addBubbleSection, "Bubble");
    expect(set.children).toHaveLength(14);
    for (const variant of [
      "default",
      "secondary",
      "muted",
      "tinted",
      "outline",
      "ghost",
      "destructive",
    ]) {
      expect(variants).toContain(`Variant=${variant}, Align=start`);
      expect(variants).toContain(`Variant=${variant}, Align=end`);
    }
    expect(hasBoundFill(set)).toBe(true);
  });

  it("exposes editable message copy and a hidden reactions pill", async () => {
    const { set } = await buildSet(addBubbleSection, "Bubble");
    expect(byName(set, "Message").length).toBe(14);
    const reactions = byName(set, "Reactions");
    expect(reactions.length).toBe(14);
    // The reactions pill ships hidden (toggled on via the component property).
    expect(reactions.every((r) => r.visible === false)).toBe(true);
  });
});

describe("Marker section", () => {
  it("ships the default, separator, and border variants", async () => {
    const { set, variants } = await buildSet(addMarkerSection, "Marker");
    expect(set.children).toHaveLength(3);
    expect(variants.sort()).toEqual(
      ["Variant=border", "Variant=default", "Variant=separator"].sort(),
    );
    expect(hasBoundFill(set)).toBe(true);
  });

  it("flanks the separator label with rules", async () => {
    const { set } = await buildSet(addMarkerSection, "Marker");
    const separator = set.children.find((c) => c.name === "Variant=separator")!;
    expect(byName(separator, "Rule").length).toBe(2);
  });
});

describe("Attachment section", () => {
  it("ships the media kinds crossed with the upload states", async () => {
    const { set, variants } = await buildSet(
      addAttachmentSection,
      "Attachment",
    );
    expect(set.children).toHaveLength(6);
    for (const media of ["icon", "image"]) {
      for (const state of ["done", "uploading", "error"]) {
        expect(variants).toContain(`Media=${media}, State=${state}`);
      }
    }
    expect(hasBoundFill(set)).toBe(true);
  });

  it("carries a media tile and an editable title", async () => {
    const { set } = await buildSet(addAttachmentSection, "Attachment");
    expect(byName(set, "Media").length).toBe(6);
    expect(textChars(set).has("document.pdf")).toBe(true);
    expect(textChars(set).has("photo.jpg")).toBe(true);
  });
});

describe("Message section", () => {
  it("ships the start and end alignments", async () => {
    const { set, variants } = await buildSet(addMessageSection, "Message");
    expect(set.children).toHaveLength(2);
    expect(variants.sort()).toEqual(["Align=end", "Align=start"].sort());
    expect(hasBoundFill(set)).toBe(true);
  });

  it("composes an avatar, a bubble, a header, and a footer", async () => {
    const { set } = await buildSet(addMessageSection, "Message");
    const start = set.children.find((c) => c.name === "Align=start")!;
    expect(byName(start, "Avatar").length).toBe(1);
    expect(byName(start, "Bubble").length).toBe(1);
    expect(byName(start, "Header").length).toBe(1);
    expect(byName(start, "Footer").length).toBe(1);
    // The assistant side ships its default name + message copy.
    const text = textChars(start);
    expect(text.has("Acme AI")).toBe(true);
    expect(text.has("Here's the summary you asked for.")).toBe(true);
  });
});
