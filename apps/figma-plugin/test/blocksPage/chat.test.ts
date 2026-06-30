// Coverage for the Chat block. It frames a conversation between a header bar
// and a prompt composer, reusing live instances of the page-built Bubble,
// Marker, and Attachment components — with drawn fallbacks when the page has no
// matching components (a bare page).

import { describe, expect, it } from "vitest";
import { addChatBlock } from "../../src/blocksPage/blocks/chat";
import type { BlocksInputs } from "../../src/blocksPage";
import { buildComponentsPage } from "../../src/componentsPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

type Root = { figma: { root: { children: { type: string; name: string }[] } } };

type GeneratedVars = Awaited<
  ReturnType<typeof generateFromRegistry>
>["variables"];

async function makeVars(code = "b2fA"): Promise<GeneratedVars> {
  const resolved = resolvePreset(code);
  if (!resolved.ok) throw new Error("fixture failed to resolve");
  const generated = await generateFromRegistry(resolved.data, {
    presetCode: code,
  });
  return generated.variables;
}

async function makeInputsOnComponentsPage(
  code = "b2fA",
): Promise<BlocksInputs> {
  const vars = await makeVars(code);
  const componentsInputs = {
    presetCode: code,
    primitives: vars.primitives,
    tailwindColors: vars.tailwindColors,
    theme: vars.theme,
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

function byName(node: FakeNode, name: string): FakeNode | undefined {
  return collect(node, (n) => n.name === name)[0];
}

function textSet(node: FakeNode): Set<string> {
  return new Set(
    collect(node, (n) => n.type === "TEXT").map((n) => n.characters ?? ""),
  );
}

async function renderChat(): Promise<FakeNode> {
  const inputs = await makeInputsOnComponentsPage();
  const pageChildren = (
    inputs.targetPage as unknown as { children: FakeNode[] }
  ).children;
  const count = await addChatBlock(inputs.targetPage, inputs);
  expect(count).toBeGreaterThan(0);
  const block = pageChildren[pageChildren.length - 1]!;
  expect(block.name).toBe("Chat");
  return block;
}

describe("Chat block", () => {
  it("frames a chat window with a header, conversation, and composer", async () => {
    const block = await renderChat();
    const window = byName(block, "Chat Window");
    expect(window).toBeDefined();
    expect(byName(window!, "Header")).toBeDefined();
    expect(byName(window!, "Conversation")).toBeDefined();
    expect(byName(window!, "Composer")).toBeDefined();
  });

  it("renders the conversation turns and the composer prompt", async () => {
    const block = await renderChat();
    const text = textSet(block);
    // Header identity + composer placeholder are drawn by the block.
    expect(text.has("Acme AI")).toBe(true);
    expect(text.has("Message Acme AI...")).toBe(true);

    const conversation = byName(block, "Conversation")!;
    const rows = (conversation.children ?? []).filter(
      (c) => c.name === "Message",
    );
    expect(rows.length).toBe(3);
  });

  it("reuses live component instances when the page has them", async () => {
    const block = await renderChat();
    // The conversation embeds Bubble / Marker / Attachment instances.
    expect(collect(block, (n) => n.type === "INSTANCE").length).toBeGreaterThan(
      0,
    );
  });

  it("falls back to drawn stand-ins on a bare page", async () => {
    const vars = await makeVars();
    const figma = (
      globalThis as unknown as { figma: { createPage: () => PageNode } }
    ).figma;
    const barePage = figma.createPage();
    (barePage as unknown as { name: string }).name = "Scratch";

    const count = await addChatBlock(barePage, {
      presetCode: "b2fA",
      primitives: vars.primitives,
      tailwindColors: vars.tailwindColors,
      theme: vars.theme,
      targetPage: barePage,
    });
    expect(count).toBeGreaterThan(0);

    const block = (barePage as unknown as { children: FakeNode[] })
      .children[0]!;
    expect(block.name).toBe("Chat");
    // No components on the page → every reuse misses and draws a stand-in.
    expect(collect(block, (n) => n.type === "INSTANCE").length).toBe(0);
    // The conversation still renders its turns and chrome.
    expect(byName(block, "Conversation")).toBeDefined();
    expect(byName(block, "Composer")).toBeDefined();
  });
});
