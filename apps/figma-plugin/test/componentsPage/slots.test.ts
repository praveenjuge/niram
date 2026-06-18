import { describe, expect, it } from "vitest";
import {
  createConfiguredSlot,
  defineSlotProperty,
} from "../../src/componentsPage/properties";

// The slot helpers are deliberately host-version aware: they prefer the native
// `createSlot()` API and degrade to a plain named frame on older hosts. These
// tests exercise both paths plus the option/limit-settings plumbing against the
// in-memory figma mock (native) and lightweight stubs (fallback / edge cases).

type AnyNode = Record<string, any>;

function figmaMock(): AnyNode {
  return (globalThis as unknown as { figma: AnyNode }).figma;
}

describe("defineSlotProperty", () => {
  it("registers a SLOT property with preferred values, description, settings", () => {
    const node = figmaMock().createComponent() as AnyNode;
    const id = defineSlotProperty(node as never, "Content", {
      description: "Card body content",
      preferredValues: [{ type: "COMPONENT", key: "item-key" }],
      settings: { minChildren: 1, maxChildren: 4 },
    })!;
    expect(id).toContain("Content#");
    const prop = node.__componentProperties[id];
    expect(prop.type).toBe("SLOT");
    expect(prop.description).toBe("Card body content");
    expect(prop.preferredValues).toEqual([
      { type: "COMPONENT", key: "item-key" },
    ]);
    expect(prop.slotSettings).toEqual({ minChildren: 1, maxChildren: 4 });
  });

  it("registers a bare SLOT property when no options are given", () => {
    const node = figmaMock().createComponent() as AnyNode;
    const id = defineSlotProperty(node as never, "Items")!;
    const prop = node.__componentProperties[id];
    expect(prop.type).toBe("SLOT");
    expect(prop.preferredValues).toBeUndefined();
    expect(prop.description).toBeUndefined();
  });

  it("treats an empty preferredValues array as no options", () => {
    const recorded: Array<unknown> = [];
    const container = {
      addComponentProperty: (
        _n: string,
        _t: string,
        _d: string | boolean,
        opts?: unknown,
      ) => {
        recorded.push(opts);
        return "X#1:0";
      },
    };
    defineSlotProperty(container, "X", { preferredValues: [] });
    expect(recorded[0]).toBeUndefined();
  });

  it("no-ops when the API surface is missing", () => {
    expect(defineSlotProperty({}, "Content")).toBeUndefined();
  });

  it("swallows a throwing addComponentProperty", () => {
    const container = {
      addComponentProperty: () => {
        throw new Error("duplicate property name");
      },
    };
    expect(defineSlotProperty(container, "Content")).toBeUndefined();
  });
});

describe("createConfiguredSlot — native path", () => {
  it("creates a SLOT node, seeds default children, and parents it", () => {
    const comp = figmaMock().createComponent() as AnyNode;
    const child = figmaMock().createText() as AnyNode;
    const slot = createConfiguredSlot(comp, "Content", [
      child as never,
    ]) as AnyNode;

    expect(slot.type).toBe("SLOT");
    expect(slot.name).toBe("Content");
    expect(slot.children).toContain(child);
    expect(comp.children).toContain(slot);
  });

  it("applies preferred values, description, and limit settings via editComponentProperty", () => {
    const comp = figmaMock().createComponent() as AnyNode;
    createConfiguredSlot(comp, "Actions", [], {
      description: "Footer actions",
      preferredValues: [{ type: "COMPONENT", key: "button-key" }],
      settings: { maxChildren: 2, allowPreferredValuesOnly: true },
    });
    const cfg = comp.__slotProperties.Actions;
    expect(cfg.description).toBe("Footer actions");
    expect(cfg.preferredValues).toEqual([
      { type: "COMPONENT", key: "button-key" },
    ]);
    expect(cfg.slotSettings).toEqual({
      maxChildren: 2,
      allowPreferredValuesOnly: true,
    });
  });

  it("skips configuration when no options are provided", () => {
    const comp = figmaMock().createComponent() as AnyNode;
    createConfiguredSlot(comp, "Content", []);
    expect(comp.__slotProperties).toBeUndefined();
  });

  it("does not throw when editComponentProperty is unavailable or fails", () => {
    const slotStub = { name: "", appendChild() {} };
    const missing = { createSlot: () => slotStub };
    expect(() =>
      createConfiguredSlot(missing as never, "C", [], { description: "d" }),
    ).not.toThrow();

    const throwing = {
      createSlot: () => slotStub,
      editComponentProperty: () => {
        throw new Error("nope");
      },
    };
    expect(() =>
      createConfiguredSlot(throwing as never, "C", [], {
        settings: { minChildren: 1 },
      }),
    ).not.toThrow();
  });

  it("exposes clone() as a frame and a no-throw resetSlot() on the slot node", () => {
    const comp = figmaMock().createComponent() as AnyNode;
    const slot = comp.createSlot() as AnyNode;
    slot.name = "S";
    const clone = slot.clone() as AnyNode;
    expect(clone.type).toBe("FRAME");
    expect(() => slot.resetSlot()).not.toThrow();
  });
});

describe("createConfiguredSlot — fallback path", () => {
  it("builds a named frame, parents it, and registers a SLOT property", () => {
    const children: AnyNode[] = [];
    const props: Record<string, unknown> = {};
    const fallbackComp = {
      addComponentProperty: (name: string, type: string) => {
        const id = `${name}#1:0`;
        props[id] = type;
        return id;
      },
      appendChild: (c: AnyNode) => children.push(c),
    };
    const child = figmaMock().createText() as AnyNode;
    const frame = createConfiguredSlot(fallbackComp as never, "Items", [
      child as never,
    ]) as AnyNode;

    expect(frame.type).toBe("FRAME");
    expect(frame.name).toBe("Items");
    expect(frame.children).toContain(child);
    expect(children).toContain(frame);
    expect(Object.values(props)).toContain("SLOT");
  });

  it("falls back when createSlot throws", () => {
    const fallbackComp = {
      createSlot: () => {
        throw new Error("unsupported");
      },
      addComponentProperty: (name: string) => `${name}#1:0`,
      appendChild() {},
    };
    const frame = createConfiguredSlot(
      fallbackComp as never,
      "Content",
      [],
    ) as AnyNode;
    expect(frame.type).toBe("FRAME");
  });

  it("tolerates a component without appendChild", () => {
    const bare = { addComponentProperty: (name: string) => `${name}#1:0` };
    const frame = createConfiguredSlot(bare as never, "X", []) as AnyNode;
    expect(frame.type).toBe("FRAME");
    expect(frame.name).toBe("X");
  });
});
