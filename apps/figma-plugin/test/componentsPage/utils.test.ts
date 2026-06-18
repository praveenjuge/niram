import { describe, expect, it } from "vitest";
import {
  countDescendants,
  findInstanceSource,
  instantiateBuiltComponent,
  loadComponentsFonts,
} from "../../src/componentsPage/utils";
import type { ComponentsInputs } from "../../src/componentsPage";

type FakeNode = {
  type: string;
  name: string;
  children: FakeNode[];
  appendChild(child: FakeNode): void;
  [key: string]: unknown;
};

const fig = () => (globalThis as { figma: typeof figma }).figma;

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

function frame(name = ""): FakeNode {
  const f = fig().createFrame() as unknown as FakeNode;
  f.name = name;
  return f;
}

describe("countDescendants", () => {
  it("counts the node itself when it has no children", () => {
    expect(countDescendants(frame() as unknown as SceneNode)).toBe(1);
  });

  it("counts nested descendants recursively", () => {
    const root = frame();
    const child = frame();
    const grandchild = frame();
    child.appendChild(grandchild);
    root.appendChild(child);
    root.appendChild(frame());
    // root + child + grandchild + second child = 4
    expect(countDescendants(root as unknown as SceneNode)).toBe(4);
  });
});

describe("findInstanceSource", () => {
  it("returns the variant matching the requested name within a set", () => {
    const a = comp("Variant=a");
    const b = comp("Variant=b");
    const root = frame();
    root.appendChild(componentSet("Button", [a, b]));

    const found = findInstanceSource(
      root as unknown as SceneNode,
      "Button",
      "Variant=b",
    );
    expect(found).toBe(b as unknown as ComponentNode);
  });

  it("falls back to the first variant when the requested variant is absent", () => {
    const a = comp("Variant=a");
    const b = comp("Variant=b");
    const root = frame();
    root.appendChild(componentSet("Button", [a, b]));

    const found = findInstanceSource(
      root as unknown as SceneNode,
      "Button",
      "Variant=missing",
    );
    expect(found).toBe(a as unknown as ComponentNode);
  });

  it("returns the first variant when no variant is requested", () => {
    const a = comp("Variant=a");
    const root = frame();
    root.appendChild(componentSet("Button", [a, comp("Variant=b")]));

    const found = findInstanceSource(root as unknown as SceneNode, "Button");
    expect(found).toBe(a as unknown as ComponentNode);
  });

  it("matches a standalone component by name", () => {
    const label = comp("Label");
    const root = frame();
    const nested = frame();
    nested.appendChild(label);
    root.appendChild(nested);

    const found = findInstanceSource(root as unknown as SceneNode, "Label");
    expect(found).toBe(label as unknown as ComponentNode);
  });

  it("prefers a matching set over a standalone component", () => {
    const standalone = comp("Button");
    const variant = comp("Variant=a");
    const root = frame();
    root.appendChild(standalone);
    root.appendChild(componentSet("Button", [variant]));

    const found = findInstanceSource(root as unknown as SceneNode, "Button");
    expect(found).toBe(variant as unknown as ComponentNode);
  });

  it("returns undefined when nothing matches", () => {
    const root = frame();
    root.appendChild(comp("Other"));
    expect(
      findInstanceSource(root as unknown as SceneNode, "Missing"),
    ).toBeUndefined();
  });

  it("ignores a component set whose name does not match", () => {
    const root = frame();
    root.appendChild(componentSet("Other", [comp("Variant=a")]));
    expect(
      findInstanceSource(root as unknown as SceneNode, "Button"),
    ).toBeUndefined();
  });

  it("returns undefined when a matching set holds no component variants", () => {
    const root = frame();
    // A set whose only child isn't a COMPONENT (e.g. a stray frame).
    root.appendChild(componentSet("Button", [frame("not-a-component")]));
    expect(
      findInstanceSource(root as unknown as SceneNode, "Button"),
    ).toBeUndefined();
  });
});

describe("instantiateBuiltComponent", () => {
  it("returns undefined when the source cannot create instances", () => {
    const source = { name: "X" } as unknown as ComponentNode;
    expect(instantiateBuiltComponent(source)).toBeUndefined();
  });

  it("creates an instance without touching text when no override is given", () => {
    const source = comp("Label");
    const instance = instantiateBuiltComponent(
      source as unknown as ComponentNode,
    );
    expect(instance).toBeDefined();
    expect((instance as unknown as FakeNode).type).toBe("INSTANCE");
  });

  it("overrides the first text descendant of the new instance", () => {
    const text = fig().createText() as unknown as FakeNode;
    const wrapper = frame();
    wrapper.appendChild(text);
    const source = {
      createInstance: () => wrapper,
    } as unknown as ComponentNode;

    instantiateBuiltComponent(source, "Email");
    expect(text.characters).toBe("Email");
  });

  it("keeps the original text when the host rejects the edit", () => {
    const text = fig().createText() as unknown as FakeNode;
    text.characters = "original";
    Object.defineProperty(text, "characters", {
      get() {
        return "original";
      },
      set() {
        throw new Error("locked layer");
      },
    });
    const wrapper = frame();
    wrapper.appendChild(text);
    const source = {
      createInstance: () => wrapper,
    } as unknown as ComponentNode;

    expect(() => instantiateBuiltComponent(source, "Email")).not.toThrow();
    expect(text.characters).toBe("original");
  });
});

describe("loadComponentsFonts", () => {
  const baseInputs = {
    presetCode: "x",
    primitives: { get: () => undefined },
    tailwindColors: { get: () => undefined },
    theme: { light: { get: () => undefined }, dark: { get: () => undefined } },
  } as unknown as ComponentsInputs;

  it("loads the preset fonts when supplied", async () => {
    await loadComponentsFonts({
      ...baseInputs,
      fonts: { body: "Roboto", heading: "Lora" } as never,
    });
    const families = fig()
      .loadFontAsync.mock.calls.map(
        (c: unknown[]) => (c[0] as { family: string }).family,
      );
    expect(families).toContain("Roboto");
    expect(families).toContain("Lora");
  });

  it("falls back to Inter when no preset fonts are supplied", async () => {
    await loadComponentsFonts(baseInputs);
    const families = fig()
      .loadFontAsync.mock.calls.map(
        (c: unknown[]) => (c[0] as { family: string }).family,
      );
    expect(families).toContain("Inter");
  });
});
