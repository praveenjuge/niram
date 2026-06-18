import { describe, expect, it } from "vitest";
import {
  collectByTypeAndName,
  defineBooleanProperty,
  defineIconSwapProperty,
  defineInstanceSwapProperty,
  defineTextProperty,
} from "../../src/componentsPage/properties";
import { addButtonSection } from "../../src/componentsPage/sections/button";
import { addBadgeSection } from "../../src/componentsPage/sections/badge";
import { addLabelSection } from "../../src/componentsPage/sections/label";
import { addInputSection } from "../../src/componentsPage/sections/input";
import { addTextareaSection } from "../../src/componentsPage/sections/textarea";
import { addTooltipSection } from "../../src/componentsPage/sections/tooltip";
import { addCardSection } from "../../src/componentsPage/sections/card";
import { addAlertSection } from "../../src/componentsPage/sections/alert";
import { addDialogSection } from "../../src/componentsPage/sections/dialog";
import { addToggleSection } from "../../src/componentsPage/sections/toggle";
import type { ComponentsInputs } from "../../src/componentsPage";

function emptyInputs(extra?: Partial<ComponentsInputs>): ComponentsInputs {
  return {
    presetCode: "test",
    primitives: new Map(),
    tailwindColors: new Map(),
    theme: { light: new Map(), dark: new Map() },
    ...extra,
  };
}

type FakeNode = {
  type: string;
  name: string;
  children: FakeNode[];
  componentPropertyReferences?: Record<string, string>;
  __componentProperties?: Record<
    string,
    { type: string; defaultValue: unknown; preferredValues?: unknown }
  >;
};

function figmaMock() {
  return (globalThis as unknown as { figma: Record<string, () => FakeNode> })
    .figma;
}

function find(root: FakeNode, type: string, name: string): FakeNode[] {
  const out: FakeNode[] = [];
  const visit = (n: FakeNode) => {
    if (n.type === type && n.name === name) out.push(n);
    if (n.children) for (const c of n.children) visit(c);
  };
  visit(root);
  return out;
}

// Find the component property id a node references for a given field.
function refId(node: FakeNode, field: string): string | undefined {
  return node.componentPropertyReferences?.[field];
}

describe("property helpers", () => {
  it("defines a TEXT property and points text nodes at it", () => {
    const container = {
      addComponentProperty: (name: string) => `${name}#1:0`,
    };
    const node: FakeNode = { type: "TEXT", name: "x", children: [] };
    const id = defineTextProperty(container, "Label", "Button", [node]);
    expect(id).toBe("Label#1:0");
    expect(node.componentPropertyReferences?.characters).toBe("Label#1:0");
  });

  it("defines a BOOLEAN property bound to visibility", () => {
    const container = { addComponentProperty: (name: string) => `${name}#1:0` };
    const node: FakeNode = { type: "FRAME", name: "x", children: [] };
    defineBooleanProperty(container, "Show", true, [node]);
    expect(node.componentPropertyReferences?.visible).toBe("Show#1:0");
  });

  it("skips an instance-swap property without a default key", () => {
    const container = { addComponentProperty: () => "Icon#1:0" };
    const node: FakeNode = { type: "INSTANCE", name: "Icon", children: [] };
    const id = defineInstanceSwapProperty(container, "Icon", undefined, [node]);
    expect(id).toBeUndefined();
    expect(node.componentPropertyReferences).toBeUndefined();
  });

  it("no-ops gracefully when the API surface is missing", () => {
    const node: FakeNode = { type: "TEXT", name: "x", children: [] };
    expect(defineTextProperty({}, "Label", "Button", [node])).toBeUndefined();
  });

  it("collects matching nodes by type and name across a tree", () => {
    const root: FakeNode = {
      type: "COMPONENT_SET",
      name: "Set",
      children: [
        {
          type: "COMPONENT",
          name: "v1",
          children: [{ type: "TEXT", name: "Label", children: [] }],
        },
        {
          type: "COMPONENT",
          name: "v2",
          children: [{ type: "TEXT", name: "Label", children: [] }],
        },
      ],
    };
    expect(collectByTypeAndName(root, "TEXT", "Label")).toHaveLength(2);
  });

  it("returns undefined for empty node lists", () => {
    const container = { addComponentProperty: (n: string) => `${n}#1:0` };
    expect(defineTextProperty(container, "Label", "x", [])).toBeUndefined();
    expect(defineBooleanProperty(container, "Show", true, [])).toBeUndefined();
    expect(
      defineInstanceSwapProperty(container, "Icon", "key", []),
    ).toBeUndefined();
  });

  it("swallows a throwing addComponentProperty and skips the reference", () => {
    const container = {
      addComponentProperty: () => {
        throw new Error("duplicate property name");
      },
    };
    const node: FakeNode = { type: "TEXT", name: "x", children: [] };
    expect(defineTextProperty(container, "Label", "x", [node])).toBeUndefined();
    expect(node.componentPropertyReferences).toBeUndefined();
  });

  it("merges new references with any existing ones on a node", () => {
    const container = { addComponentProperty: (n: string) => `${n}#1:0` };
    const node: FakeNode = {
      type: "TEXT",
      name: "x",
      children: [],
      componentPropertyReferences: { visible: "Show#0:0" },
    };
    defineTextProperty(container, "Label", "x", [node]);
    expect(node.componentPropertyReferences?.visible).toBe("Show#0:0");
    expect(node.componentPropertyReferences?.characters).toBe("Label#1:0");
  });
});

describe("defineIconSwapProperty", () => {
  const container = { addComponentProperty: (n: string) => `${n}#1:0` };

  it("no-ops when no source icon is supplied", () => {
    const node: FakeNode = { type: "INSTANCE", name: "Icon", children: [] };
    expect(
      defineIconSwapProperty(container, "Icon", undefined, [node]),
    ).toBeUndefined();
    expect(node.componentPropertyReferences).toBeUndefined();
  });

  it("wires the swap without preferred values when the parent isn't a set", () => {
    const node: FakeNode = { type: "INSTANCE", name: "Icon", children: [] };
    const source = { key: "icon-key", parent: { type: "FRAME" } };
    const id = defineIconSwapProperty(container, "Icon", source, [node]);
    expect(id).toBe("Icon#1:0");
    expect(node.componentPropertyReferences?.mainComponent).toBe("Icon#1:0");
  });

  it("offers the owning component set as a preferred swap value", () => {
    const store: Record<string, { preferredValues?: unknown }> = {};
    const recording = {
      addComponentProperty: (
        name: string,
        _type: string,
        _def: string | boolean,
        opts?: { preferredValues?: unknown },
      ) => {
        const id = `${name}#1:0`;
        store[id] = { preferredValues: opts?.preferredValues };
        return id;
      },
    };
    const node: FakeNode = { type: "INSTANCE", name: "Icon", children: [] };
    const source = {
      key: "icon-key",
      parent: { type: "COMPONENT_SET", key: "set-key" },
    };
    const id = defineIconSwapProperty(recording, "Icon", source, [node])!;
    expect(store[id]?.preferredValues).toEqual([
      { type: "COMPONENT_SET", key: "set-key" },
    ]);
  });
});

describe("text properties on built sections", () => {
  it("Button exposes an editable Label across non-icon variants", async () => {
    const page = figmaMock().createPage() as FakeNode;
    await addButtonSection(page as never, emptyInputs());
    const set = page.children[0]!;

    const labels = find(set, "TEXT", "Label");
    expect(labels.length).toBeGreaterThan(0);
    const id = refId(labels[0]!, "characters");
    expect(id).toBeDefined();
    // The property id is registered on the set with a TEXT type + default.
    expect(set.__componentProperties?.[id!]?.type).toBe("TEXT");
    expect(set.__componentProperties?.[id!]?.defaultValue).toBe("Button");
    // Every collected label references the same property.
    for (const label of labels) {
      expect(refId(label, "characters")).toBe(id);
    }
  });

  it("Badge keeps the count variant out of the Label property", async () => {
    const page = figmaMock().createPage() as FakeNode;
    await addBadgeSection(page as never, emptyInputs());
    const set = page.children[0]!;
    // No "8" count label is named "Label", so it is never wired.
    const labels = find(set, "TEXT", "Label");
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect((label as unknown as { characters: string }).characters).toBe(
        "Badge",
      );
    }
  });

  it("Label, Input, and Textarea expose their text/placeholder", async () => {
    const labelPage = figmaMock().createPage() as FakeNode;
    await addLabelSection(labelPage as never, emptyInputs());
    const labelText = find(labelPage, "TEXT", "Text");
    expect(refId(labelText[0]!, "characters")).toBeDefined();

    const inputPage = figmaMock().createPage() as FakeNode;
    await addInputSection(inputPage as never, emptyInputs());
    const inputValue = find(inputPage.children[0]!, "TEXT", "Value");
    expect(refId(inputValue[0]!, "characters")).toBeDefined();

    const textareaPage = figmaMock().createPage() as FakeNode;
    await addTextareaSection(textareaPage as never, emptyInputs());
    const taValue = find(textareaPage.children[0]!, "TEXT", "Value");
    expect(refId(taValue[0]!, "characters")).toBeDefined();
  });

  it("Tooltip, Card, and Alert expose their copy", async () => {
    const tooltipPage = figmaMock().createPage() as FakeNode;
    await addTooltipSection(tooltipPage as never, emptyInputs());
    const tooltipSet = tooltipPage.children.find((c) => c.name === "Tooltip")!;
    expect(
      refId(find(tooltipSet, "TEXT", "Text")[0]!, "characters"),
    ).toBeDefined();

    const cardPage = figmaMock().createPage() as FakeNode;
    await addCardSection(cardPage as never, emptyInputs());
    const cardSet = cardPage.children[0]!;
    expect(find(cardSet, "TEXT", "Title").length).toBeGreaterThan(0);
    expect(
      refId(find(cardSet, "TEXT", "Title")[0]!, "characters"),
    ).toBeDefined();
    expect(
      refId(find(cardSet, "TEXT", "Description")[0]!, "characters"),
    ).toBeDefined();

    const alertPage = figmaMock().createPage() as FakeNode;
    await addAlertSection(alertPage as never, emptyInputs());
    const alertSet = alertPage.children[0]!;
    expect(
      refId(find(alertSet, "TEXT", "Title")[0]!, "characters"),
    ).toBeDefined();
  });
});

describe("boolean + instance-swap on built sections", () => {
  it("Dialog exposes a Show Description boolean alongside the text props", async () => {
    const page = figmaMock().createPage() as FakeNode;
    await addDialogSection(page as never, emptyInputs());
    const dialog = find(page, "COMPONENT", "Dialog")[0]!;
    const desc = find(dialog, "TEXT", "Description")[0]!;
    expect(refId(desc, "characters")).toBeDefined();
    const visId = refId(desc, "visible");
    expect(visId).toBeDefined();
    expect(dialog.__componentProperties?.[visId!]?.type).toBe("BOOLEAN");
  });

  it("Toggle exposes an Icon instance-swap when the icon set is available", async () => {
    const figma = figmaMock() as unknown as {
      createPage: () => FakeNode;
      createComponent: () => FakeNode;
      combineAsVariants: (c: FakeNode[], p: FakeNode) => FakeNode;
    };
    // Build a minimal published icon set with a `bold` variant so Toggle
    // embeds a real instance and can wire the swap.
    const iconComp = figma.createComponent();
    iconComp.name = "Icon=bold";
    const iconSet = figma.combineAsVariants([iconComp], figma.createPage());
    iconSet.name = "Icons";
    const iconComponents = new Map([["bold", iconComp]]) as never;

    const page = figma.createPage();
    await addToggleSection(page as never, emptyInputs({ iconComponents }));
    const set = page.children[0]!;
    const icons = find(set, "INSTANCE", "Icon");
    expect(icons.length).toBeGreaterThan(0);
    const id = refId(icons[0]!, "mainComponent");
    expect(id).toBeDefined();
    expect(set.__componentProperties?.[id!]?.type).toBe("INSTANCE_SWAP");
    // The icon set is offered as a preferred swap choice.
    expect(set.__componentProperties?.[id!]?.preferredValues).toBeDefined();
  });
});
