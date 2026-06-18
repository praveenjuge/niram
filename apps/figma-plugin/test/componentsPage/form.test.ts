import { describe, expect, it } from "vitest";
import { addFormSection } from "../../src/componentsPage/sections/form";
import type { ComponentsInputs } from "../../src/componentsPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

type FakeNode = {
  type: string;
  name: string;
  children: FakeNode[];
  appendChild(child: FakeNode): void;
  createInstance?: () => FakeNode;
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

function comp(name: string): FakeNode {
  const c = fig().createComponent() as unknown as FakeNode;
  c.name = name;
  return c;
}

function componentSet(name: string, variants: FakeNode[]): FakeNode {
  const set = fig().createFrame() as unknown as FakeNode;
  set.type = "COMPONENT_SET" as never;
  set.name = name;
  for (const v of variants) set.appendChild(v);
  return set;
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

describe("addFormSection", () => {
  it("draws fallback fields when no Label/Input sources exist on the page", async () => {
    const inputs = await makeInputs();
    const p = page();
    const count = await addFormSection(p as unknown as PageNode, inputs);
    expect(count).toBeGreaterThan(0);

    const set = findSet(p, "Form");
    expect(set).toBeDefined();
    expect(set!.layoutMode).toBe("HORIZONTAL");
    // One variant per field: Email + Password.
    const variants = set!.children.map((c) => c.name).sort();
    expect(variants).toEqual(["Field=Email", "Field=Password"]);

    // Fallbacks: each field has a drawn TEXT label and a FRAME input (named
    // "Input"), and no embedded INSTANCE.
    for (const variant of set!.children) {
      const kids = descendants(variant);
      expect(kids.some((n) => n.type === "TEXT")).toBe(true);
      expect(kids.some((n) => n.type === "FRAME" && n.name === "Input")).toBe(
        true,
      );
      expect(kids.some((n) => n.type === "INSTANCE")).toBe(false);
    }
  });

  it("embeds live Label and Input instances when those sources are present", async () => {
    const inputs = await makeInputs();
    const p = page();
    // Publish the source components the form reuses.
    p.appendChild(comp("Label"));
    p.appendChild(componentSet("Input", [comp("State=default, Leading=none")]));

    await addFormSection(p as unknown as PageNode, inputs);

    const set = findSet(p, "Form")!;
    for (const variant of set.children) {
      const kids = descendants(variant);
      // Two embedded instances (the reused Label + Input), no drawn fallbacks.
      expect(kids.filter((n) => n.type === "INSTANCE").length).toBe(2);
      expect(kids.some((n) => n.type === "TEXT")).toBe(false);
    }
  });

  it("keeps the input instance at its built width when FILL is rejected", async () => {
    const inputs = await makeInputs();
    const p = page();
    p.appendChild(comp("Label"));

    // An Input source whose instances reject layoutSizingHorizontal = FILL.
    const variant = comp("State=default, Leading=none");
    variant.createInstance = () => {
      const instance = fig().createFrame() as unknown as FakeNode;
      instance.type = "INSTANCE" as never;
      Object.defineProperty(instance, "layoutSizingHorizontal", {
        set() {
          throw new Error("cannot FILL");
        },
      });
      return instance;
    };
    p.appendChild(componentSet("Input", [variant]));

    // The rejected FILL is swallowed, so the section still builds.
    await expect(
      addFormSection(p as unknown as PageNode, inputs),
    ).resolves.toBeGreaterThan(0);
  });
});
