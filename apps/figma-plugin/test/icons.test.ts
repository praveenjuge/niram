import { describe, expect, it } from "vitest";
import {
  createIcon,
  createNamedIcon,
  instantiateIcon,
  type IconComponentMap,
} from "../src/icons";

type FakeNode = {
  type: string;
  name: string;
  rescale?: (factor: number) => void;
  [key: string]: unknown;
};

const fig = () => (globalThis as { figma: typeof figma }).figma;

describe("createIcon", () => {
  it("renders a recolored icon node from the active library", () => {
    const icon = createIcon({
      library: "lucide",
      name: "info",
      size: 24,
    }) as unknown as FakeNode;
    expect(icon).toBeDefined();
    expect(icon.name).toBe("icon");
  });

  it("rescales the geometry when the target size differs from 24px", () => {
    const calls: number[] = [];
    const figmaAny = fig() as unknown as {
      createNodeFromSvg: (svg: string) => FakeNode;
    };
    const orig = figmaAny.createNodeFromSvg.bind(figmaAny);
    figmaAny.createNodeFromSvg = (svg: string) => {
      const node = orig(svg);
      node.rescale = (factor: number) => calls.push(factor);
      return node;
    };

    createIcon({ library: "lucide", name: "info", size: 12 });
    expect(calls).toEqual([12 / 24]);
  });

  it("does not rescale when the target size is the native 24px", () => {
    const calls: number[] = [];
    const figmaAny = fig() as unknown as {
      createNodeFromSvg: (svg: string) => FakeNode;
    };
    const orig = figmaAny.createNodeFromSvg.bind(figmaAny);
    figmaAny.createNodeFromSvg = (svg: string) => {
      const node = orig(svg);
      node.rescale = (factor: number) => calls.push(factor);
      return node;
    };

    createIcon({ library: "lucide", name: "info", size: 24 });
    expect(calls).toEqual([]);
  });
});

describe("createNamedIcon", () => {
  type Node = { type: string; name: string; [key: string]: unknown };

  it("renders a named icon by exact name", () => {
    const icon = createNamedIcon({
      library: "lucide",
      name: "chevron-right",
      size: 16,
    }) as unknown as Node;
    expect(icon).toBeDefined();
    expect(icon.name).toBe("icon");
  });

  it("returns undefined when no candidate name exists in the library", () => {
    // phosphor has no `chevron-right` (it uses `caret-right`); a bare lookup
    // misses, which is the bug behind the previously-dropped chevron glyphs.
    const icon = createNamedIcon({
      library: "phosphor",
      name: "chevron-right",
      size: 16,
    });
    expect(icon).toBeUndefined();
  });

  it("falls back to the first candidate present in the active library", () => {
    // The Sidebar blocks pass cross-library candidate lists so a chevron still
    // renders as phosphor's caret instead of dropping out.
    const icon = createNamedIcon({
      library: "phosphor",
      name: ["chevron-right", "caret-right", "arrow-right"],
      size: 16,
    }) as unknown as Node;
    expect(icon).toBeDefined();
    expect(icon.name).toBe("icon");
  });

  it("rescales the geometry when the target size differs from 24px", () => {
    const calls: number[] = [];
    const figmaAny = fig() as unknown as {
      createNodeFromSvg: (svg: string) => FakeNode;
    };
    const orig = figmaAny.createNodeFromSvg.bind(figmaAny);
    figmaAny.createNodeFromSvg = (svg: string) => {
      const node = orig(svg);
      node.rescale = (factor: number) => calls.push(factor);
      return node;
    };

    createNamedIcon({ library: "lucide", name: "chevron-right", size: 18 });
    expect(calls).toEqual([18 / 24]);
  });
});

describe("instantiateIcon rescale", () => {
  it("rescales the instance when the target size differs from 24px", () => {
    const calls: number[] = [];
    const comp = fig().createComponent() as unknown as FakeNode;
    comp.name = "Icon=bold";
    comp.createInstance = () => {
      const instance = fig().createFrame() as unknown as FakeNode;
      instance.type = "INSTANCE";
      instance.rescale = (factor: number) => calls.push(factor);
      return instance;
    };
    const icons: IconComponentMap = new Map([
      ["bold", comp as unknown as ComponentNode],
    ]);

    const instance = instantiateIcon({
      icons,
      library: "lucide",
      name: "bold",
      size: 48,
    });
    expect(instance).toBeDefined();
    expect(calls).toEqual([48 / 24]);
  });
});
