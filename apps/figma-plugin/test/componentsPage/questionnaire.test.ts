// Coverage for the August 2026 shadcn Questionnaire component. Built in
// isolation against the in-memory figma-mock and asserted on its variant set,
// theme-bound fills, indicator states, and the editable text content it ships.

import { describe, expect, it } from "vitest";
import { addQuestionnaireSection } from "../../src/componentsPage/sections/questionnaire";
import type { ComponentsInputs } from "../../src/componentsPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

type FakeNode = {
  type: string;
  name: string;
  children: FakeNode[];
  characters?: string;
  opacity?: number;
  fills?: { boundVariables?: { color?: { id: string } } }[];
  strokes?: { boundVariables?: { color?: { id: string } } }[];
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

function byName(root: FakeNode, name: string): FakeNode[] {
  return descendants(root).filter((n) => n.name === name);
}

function hasBoundFill(root: FakeNode): boolean {
  return descendants(root).some(
    (node) => Boolean(node.fills?.[0]?.boundVariables?.color?.id),
  );
}

function hasBoundStroke(root: FakeNode): boolean {
  return descendants(root).some(
    (node) => Boolean(node.strokes?.[0]?.boundVariables?.color?.id),
  );
}

describe("Questionnaire section", () => {
  it("ships radio and checkbox types across three states", async () => {
    const inputs = await makeInputs();
    const p = page();
    const count = await addQuestionnaireSection(
      p as unknown as PageNode,
      inputs,
    );
    expect(count).toBeGreaterThan(0);

    const set = findSet(p, "Questionnaire");
    expect(set).toBeDefined();
    const variants = set!.children.map((c) => c.name);
    expect(set!.children).toHaveLength(6);
    for (const type of ["radio", "checkbox"]) {
      for (const state of ["default", "selected", "disabled"]) {
        expect(variants).toContain(`Type=${type}, State=${state}`);
      }
    }
    expect(hasBoundFill(set!)).toBe(true);
    expect(hasBoundStroke(set!)).toBe(true);
  });

  it("marks the selected row and dims the disabled row", async () => {
    const inputs = await makeInputs();
    const p = page();
    await addQuestionnaireSection(p as unknown as PageNode, inputs);
    const set = findSet(p, "Questionnaire")!;

    const selected = set.children.find(
      (c) => c.name === "Type=radio, State=selected",
    )!;
    const selectedRows = byName(selected, "Choice (selected)");
    expect(selectedRows).toHaveLength(1);
    // The selected row's border binds to a theme variable.
    expect(
      selectedRows[0]!.strokes?.[0]?.boundVariables?.color?.id,
    ).toBeDefined();

    const disabled = set.children.find(
      (c) => c.name === "Type=radio, State=disabled",
    )!;
    const disabledRows = byName(disabled, "Choice (disabled)");
    expect(disabledRows).toHaveLength(1);
    expect(disabledRows[0]!.opacity).toBe(0.5);
  });

  it("draws a dot for radio and a check for checkbox indicators", async () => {
    const inputs = await makeInputs();
    const p = page();
    await addQuestionnaireSection(p as unknown as PageNode, inputs);
    const set = findSet(p, "Questionnaire")!;

    const radioSelected = set.children.find(
      (c) => c.name === "Type=radio, State=selected",
    )!;
    expect(byName(radioSelected, "Dot").length).toBeGreaterThan(0);

    const checkboxSelected = set.children.find(
      (c) => c.name === "Type=checkbox, State=selected",
    )!;
    expect(byName(checkboxSelected, "Check").length).toBeGreaterThan(0);
  });

  it("exposes editable progress, title, and description copy", async () => {
    const inputs = await makeInputs();
    const p = page();
    await addQuestionnaireSection(p as unknown as PageNode, inputs);
    const set = findSet(p, "Questionnaire")!;

    const texts = descendants(set)
      .filter((n) => n.type === "TEXT")
      .map((n) => n.characters ?? "");
    expect(texts).toContain("Question 2 of 3");
    expect(texts).toContain("What brings you here today?");
    expect(texts).toContain("Pick the option that fits best.");

    // Every variant carries the heading + description + progress trio.
    expect(byName(set, "Title")).toHaveLength(6);
    expect(byName(set, "Description")).toHaveLength(6);
    expect(byName(set, "Progress")).toHaveLength(6);
  });
});
