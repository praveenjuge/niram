import { describe, expect, it } from "vitest";
import {
  BLOCK_MANIFEST,
  BLOCK_CANVAS_NAMES,
  SIDEBAR_VARIANT_KEYS,
  SUPPORTED_BLOCK_IDS,
  blockById,
} from "../../src/blocksPage/manifest";
import { buildBlocksRegion } from "../../src/blocksPage";
import type { BlocksInputs } from "../../src/blocksPage";
import { SIDEBAR_VARIANTS } from "../../src/blocksPage/blocks/sidebar/variants";
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

// Build the Components grid so the blocks reuse live component instances, then
// return inputs targeting the shared Niram page (matching the live run).
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

describe("block manifest", () => {
  it("declares exactly the 27 in-scope blocks", () => {
    // 5 login + 5 signup + 16 sidebar + 1 dashboard.
    expect(BLOCK_MANIFEST).toHaveLength(27);
    expect(SUPPORTED_BLOCK_IDS).toHaveLength(27);
  });

  it("has unique ids and a non-empty description for every block", () => {
    const ids = new Set(SUPPORTED_BLOCK_IDS);
    expect(ids.size).toBe(BLOCK_MANIFEST.length);
    for (const entry of BLOCK_MANIFEST) {
      expect(entry.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("covers every login / signup / sidebar / dashboard id", () => {
    const expected = [
      ...["01", "02", "03", "04", "05"].map((n) => `login-${n}`),
      ...["01", "02", "03", "04", "05"].map((n) => `signup-${n}`),
      ...Array.from(
        { length: 16 },
        (_, i) => `sidebar-${String(i + 1).padStart(2, "0")}`,
      ),
      "dashboard-01",
    ];
    expect(new Set(SUPPORTED_BLOCK_IDS)).toEqual(new Set(expected));
  });

  it("excludes the out-of-scope otp / calendar / chart registry blocks", () => {
    for (const id of ["otp-01", "calendar-01", "chart-01"]) {
      expect(blockById(id)).toBeUndefined();
    }
  });

  it("maps every sidebar entry onto a real Sidebar variant builder", () => {
    const builderKeys = new Set(SIDEBAR_VARIANTS.map((v) => v.key));
    expect(SIDEBAR_VARIANT_KEYS).toHaveLength(16);
    for (const key of SIDEBAR_VARIANT_KEYS) {
      expect(builderKeys.has(key)).toBe(true);
    }
    // And the builders introduce no variants the manifest forgot.
    expect(new Set(SIDEBAR_VARIANT_KEYS)).toEqual(builderKeys);
  });
});

describe("manifest coverage against the rendered region", () => {
  it("renders a canvas frame for every standalone block and a variant for every sidebar layout", async () => {
    const inputs = await makeInputsOnComponentsPage();
    const existing = new Set(
      (inputs.targetPage as unknown as { children: FakeNode[] }).children,
    );

    await buildBlocksRegion(inputs);

    const page = inputs.targetPage as unknown as { children: FakeNode[] };
    const added = page.children.filter((c) => !existing.has(c));

    // Every canvas-kind block is a top-level frame the region appended.
    const topLevelNames = new Set(added.map((c) => c.name));
    for (const name of BLOCK_CANVAS_NAMES) {
      expect(topLevelNames.has(name)).toBe(true);
    }

    // Every sidebar layout is a variant on the appended "Sidebar" component set.
    const set = added
      .flatMap((node) => collect(node, (n) => n.type === "COMPONENT_SET"))
      .find((n) => n.name === "Sidebar");
    expect(set).toBeDefined();
    const variantNames = new Set((set!.children ?? []).map((c) => c.name));
    for (const key of SIDEBAR_VARIANT_KEYS) {
      expect(variantNames.has(`Variant=${key}`)).toBe(true);
    }
  });
});
