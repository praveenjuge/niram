import { describe, expect, it } from "vitest";
import {
  fillHeight,
  fillWidth,
  growWidth,
  instanceFromComponents,
  loadBlocksFonts,
  overrideFirstText,
} from "../../src/blocksPage/utils";
import type { BlocksInputs } from "../../src/blocksPage";

type FakeNode = {
  type: string;
  name: string;
  children: FakeNode[];
  appendChild(child: FakeNode): void;
  [key: string]: unknown;
};

const fig = () => (globalThis as { figma: typeof figma }).figma;

function frame(name = ""): FakeNode {
  const f = fig().createFrame() as unknown as FakeNode;
  f.name = name;
  return f;
}

function comp(name: string): FakeNode {
  const c = fig().createComponent() as unknown as FakeNode;
  c.name = name;
  return c;
}

const baseInputs = {
  presetCode: "x",
  primitives: { get: () => undefined },
  tailwindColors: { get: () => undefined },
  theme: { light: { get: () => undefined }, dark: { get: () => undefined } },
} as unknown as BlocksInputs;

describe("loadBlocksFonts", () => {
  it("loads the preset fonts when supplied", async () => {
    await loadBlocksFonts({
      ...baseInputs,
      fonts: { body: "Roboto", heading: "Lora" } as never,
    });
    const families = fig().loadFontAsync.mock.calls.map(
      (c: unknown[]) => (c[0] as { family: string }).family,
    );
    expect(families).toContain("Roboto");
    expect(families).toContain("Lora");
  });

  it("falls back to Inter when no preset fonts are supplied", async () => {
    await loadBlocksFonts(baseInputs);
    const families = fig().loadFontAsync.mock.calls.map(
      (c: unknown[]) => (c[0] as { family: string }).family,
    );
    expect(families).toContain("Inter");
  });
});

describe("instanceFromComponents", () => {
  it("returns undefined when there is no target page", () => {
    const inputs = { ...baseInputs, targetPage: undefined } as BlocksInputs;
    expect(instanceFromComponents(inputs, "Button")).toBeUndefined();
  });

  it("returns undefined when the page has no matching component", () => {
    const page = frame("Components");
    const inputs = {
      ...baseInputs,
      targetPage: page as unknown as PageNode,
    } as BlocksInputs;
    expect(instanceFromComponents(inputs, "Button")).toBeUndefined();
  });

  it("instantiates a matching component found on the target page", () => {
    const page = frame("Components");
    page.appendChild(comp("Label"));
    const inputs = {
      ...baseInputs,
      targetPage: page as unknown as PageNode,
    } as BlocksInputs;

    const instance = instanceFromComponents(inputs, "Label");
    expect(instance).toBeDefined();
    expect((instance as unknown as FakeNode).type).toBe("INSTANCE");
  });
});

describe("overrideFirstText", () => {
  it("rewrites the first text node it finds", () => {
    const text = fig().createText() as unknown as FakeNode;
    const wrapper = frame();
    wrapper.appendChild(text);
    expect(overrideFirstText(wrapper as unknown as SceneNode, "Hi")).toBe(true);
    expect(text.characters).toBe("Hi");
  });

  it("returns false when the subtree has no text node", () => {
    const wrapper = frame();
    wrapper.appendChild(frame());
    expect(overrideFirstText(wrapper as unknown as SceneNode, "Hi")).toBe(
      false,
    );
  });

  it("returns false (best-effort) when the host rejects the edit", () => {
    const text = fig().createText() as unknown as FakeNode;
    Object.defineProperty(text, "characters", {
      get() {
        return "original";
      },
      set() {
        throw new Error("locked layer");
      },
    });
    expect(overrideFirstText(text as unknown as SceneNode, "Hi")).toBe(false);
    expect(text.characters).toBe("original");
  });
});

describe("fillWidth", () => {
  it("sets layoutSizingHorizontal to FILL", () => {
    const node = frame();
    fillWidth(node as unknown as SceneNode);
    expect(node.layoutSizingHorizontal).toBe("FILL");
  });

  it("swallows hosts that reject FILL", () => {
    const node = frame();
    Object.defineProperty(node, "layoutSizingHorizontal", {
      set() {
        throw new Error("cannot FILL");
      },
    });
    expect(() => fillWidth(node as unknown as SceneNode)).not.toThrow();
  });
});

describe("fillHeight", () => {
  it("sets layoutSizingVertical to FILL", () => {
    const node = frame();
    fillHeight(node as unknown as SceneNode);
    expect(node.layoutSizingVertical).toBe("FILL");
  });

  it("swallows hosts that reject vertical FILL", () => {
    const node = frame();
    Object.defineProperty(node, "layoutSizingVertical", {
      set() {
        throw new Error("cannot FILL");
      },
    });
    expect(() => fillHeight(node as unknown as SceneNode)).not.toThrow();
  });
});

describe("growWidth", () => {
  it("sets layoutGrow to 1", () => {
    const node = frame();
    growWidth(node as unknown as SceneNode);
    expect(node.layoutGrow).toBe(1);
  });

  it("swallows hosts that reject layoutGrow", () => {
    const node = frame();
    Object.defineProperty(node, "layoutGrow", {
      set() {
        throw new Error("cannot grow");
      },
    });
    expect(() => growWidth(node as unknown as SceneNode)).not.toThrow();
  });
});
