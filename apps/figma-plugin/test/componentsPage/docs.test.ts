import { describe, expect, it } from "vitest";
import {
  applyComponentDocs,
  collectPublishableComponents,
  componentDocs,
} from "../../src/componentsPage/docs";
import { buildComponentsPage } from "../../src/componentsPage";
import type { ComponentsInputs } from "../../src/componentsPage";
import { buildBlocksRegion } from "../../src/blocksPage";
import type { BlocksInputs } from "../../src/blocksPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

type Root = {
  figma: { root: { children: { type: string; name: string }[] } };
};

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

async function makeInputs(code = "b2fA"): Promise<ComponentsInputs> {
  const vars = await makeVars(code);
  return {
    presetCode: code,
    primitives: vars.primitives,
    tailwindColors: vars.tailwindColors,
    theme: vars.theme,
  };
}

function niramPage() {
  return (globalThis as unknown as Root).figma.root.children.find(
    (c) => c.type === "PAGE" && c.name === "Niram",
  ) as unknown as { children: { type: string; name: string }[] };
}

type Documented = {
  type: string;
  name: string;
  description?: string;
  descriptionMarkdown?: string;
  documentationLinks?: ReadonlyArray<{ uri: string }>;
};

function publishables(page: {
  children: { type: string; name: string }[];
}): Documented[] {
  const out: Documented[] = [];
  for (const child of page.children) {
    for (const node of collectPublishableComponents(
      child as unknown as { type: string; children?: ReadonlyArray<unknown> },
    )) {
      out.push(node as Documented);
    }
  }
  return out;
}

describe("componentDocs registry", () => {
  it("uses official shadcn URLs and non-empty descriptions", () => {
    for (const [name, meta] of Object.entries(componentDocs)) {
      expect(meta.url, name).toMatch(/^https:\/\/ui\.shadcn\.com\//);
      expect(meta.description.length, name).toBeGreaterThan(0);
    }
  });

  it("covers Chart and Sidebar from the Blocks region", () => {
    expect(componentDocs["Chart"]).toBeDefined();
    expect(componentDocs["Sidebar"]).toBeDefined();
  });
});

describe("applyComponentDocs", () => {
  it("sets descriptionMarkdown and exactly one documentation link", () => {
    const node = { type: "COMPONENT_SET", name: "Button" } as Documented;
    expect(applyComponentDocs(node)).toBe(true);
    expect(node.descriptionMarkdown).toContain("Triggers an action");
    expect(node.documentationLinks).toHaveLength(1);
    expect(node.documentationLinks?.[0]?.uri).toBe(
      "https://ui.shadcn.com/docs/components/button",
    );
  });

  it("appends usage notes as a second paragraph when present", () => {
    const node = { type: "COMPONENT_SET", name: "Button" } as Documented;
    applyComponentDocs(node);
    // Button has notes, so the markdown is description + blank line + notes.
    expect(node.descriptionMarkdown).toContain("\n\n");
  });

  it("returns false for an unknown component name", () => {
    const node = { type: "COMPONENT", name: "Nonexistent" } as Documented;
    expect(applyComponentDocs(node)).toBe(false);
    expect(node.documentationLinks).toBeUndefined();
  });
});

describe("docs metadata on the built Components region", () => {
  it("gives every publishable component a description and one link", async () => {
    await buildComponentsPage(await makeInputs());
    const nodes = publishables(niramPage());

    // 56 component sections plus the extra "Chart Tooltip" set from the
    // Tooltip section → every one must carry docs metadata.
    expect(nodes.length).toBeGreaterThanOrEqual(56);
    for (const node of nodes) {
      expect(node.descriptionMarkdown, node.name).toBeTruthy();
      expect(node.documentationLinks, node.name).toHaveLength(1);
      expect(componentDocs[node.name], node.name).toBeDefined();
    }
  });

  it("registers docs for every name the builder emits", async () => {
    await buildComponentsPage(await makeInputs());
    const names = publishables(niramPage()).map((n) => n.name);
    for (const name of names) {
      expect(componentDocs[name], name).toBeDefined();
    }
  });
});

describe("docs metadata on the Blocks region", () => {
  it("documents the Chart and Sidebar component sets", async () => {
    const inputs = await makeInputs();
    await buildComponentsPage(inputs);
    const targetPage = (globalThis as unknown as Root).figma.root.children.find(
      (c) => c.type === "PAGE" && c.name === "Niram",
    ) as unknown as PageNode;
    await buildBlocksRegion({ ...inputs, targetPage } as BlocksInputs);

    const nodes = publishables(niramPage());
    const chart = nodes.find((n) => n.name === "Chart");
    const sidebar = nodes.find((n) => n.name === "Sidebar");

    expect(chart?.documentationLinks?.[0]?.uri).toBe(
      "https://ui.shadcn.com/charts",
    );
    expect(sidebar?.documentationLinks?.[0]?.uri).toBe(
      "https://ui.shadcn.com/blocks/sidebar",
    );
    expect(chart?.descriptionMarkdown).toBeTruthy();
    expect(sidebar?.descriptionMarkdown).toBeTruthy();
  });
});
