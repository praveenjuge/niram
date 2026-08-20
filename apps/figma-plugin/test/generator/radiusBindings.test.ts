import { describe, expect, it } from "vitest";
import { buildBlocksRegion } from "../../src/blocksPage";
import { buildComponentsPage } from "../../src/componentsPage";
import {
  generateFromRegistry,
  withShadcnRadius,
} from "../../src/generator";
import { encodePreset } from "../../src/preset";
import { resolvePreset } from "../../src/registry";

type NodeLike = {
  type: string;
  name: string;
  children?: NodeLike[];
  cornerRadius?: unknown;
  topLeftRadius?: unknown;
  topRightRadius?: unknown;
  bottomLeftRadius?: unknown;
  bottomRightRadius?: unknown;
  boundVariables?: Record<string, { id: string }>;
};

const CORNER_FIELDS = [
  "topLeftRadius",
  "topRightRadius",
  "bottomLeftRadius",
  "bottomRightRadius",
] as const;

describe("generated radius bindings", () => {
  it("uses preset-driven shadcn variables throughout Components and Blocks", async () => {
    const code = encodePreset({ radius: "large" });
    const resolved = resolvePreset(code);
    if (!resolved.ok) throw new Error(resolved.error);
    const generated = await generateFromRegistry(resolved.data, {
      presetCode: code,
      presetSummary: { radius: "large" },
    });
    const primitives = withShadcnRadius(
      generated.variables.primitives,
      generated.variables.radiusScale,
    );
    const inputs = {
      presetCode: code,
      primitives,
      tailwindColors: generated.variables.tailwindColors,
      theme: generated.variables.theme,
      fonts: generated.fonts,
      fontVars: generated.variables.fonts,
      effectStyles: generated.effectStyles,
      textStyles: generated.textStyles,
    };

    await buildComponentsPage(inputs);
    const page = (
      globalThis as unknown as {
        figma: { root: { children: NodeLike[] } };
      }
    ).figma.root.children.find(
      (node) => node.type === "PAGE" && node.name === "Niram",
    );
    if (!page) throw new Error("Niram page was not generated");
    await buildBlocksRegion({
      ...inputs,
      targetPage: page as unknown as PageNode,
    });

    const semanticIds = new Set(
      [...generated.variables.radiusScale.values()].map(
        (variable) => variable.id,
      ),
    );
    const fixedSemanticIds = new Set(
      ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl"].map(
        (step) => generated.variables.primitives.get(`radius/${step}`)!.id,
      ),
    );
    const semanticLiteralValues = new Set([4, 6, 8, 12, 16, 24, 32]);
    const wrongBindings: string[] = [];
    const unboundTokenCorners: string[] = [];
    let semanticBindingCount = 0;

    const walk = (node: NodeLike, path: string) => {
      // Instances inherit the main component's bound geometry. Their mock
      // clones are not an independent source of design-token bindings.
      if (node.type === "INSTANCE") return;
      let hasCornerBinding = false;
      for (const field of CORNER_FIELDS) {
        const id = node.boundVariables?.[field]?.id;
        if (id) {
          hasCornerBinding = true;
          if (semanticIds.has(id)) semanticBindingCount += 1;
          if (fixedSemanticIds.has(id)) {
            wrongBindings.push(`${path}/${node.name}.${field}`);
          }
        }
        const value = node[field];
        if (
          !id &&
          typeof value === "number" &&
          semanticLiteralValues.has(value)
        ) {
          unboundTokenCorners.push(`${path}/${node.name}.${field}=${value}`);
        }
      }
      if (
        !hasCornerBinding &&
        typeof node.cornerRadius === "number" &&
        semanticLiteralValues.has(node.cornerRadius)
      ) {
        unboundTokenCorners.push(
          `${path}/${node.name}.cornerRadius=${node.cornerRadius}`,
        );
      }
      for (const child of node.children ?? []) {
        walk(child, `${path}/${node.name}`);
      }
    };
    walk(page, "");

    expect(semanticBindingCount).toBeGreaterThan(100);
    expect(wrongBindings).toEqual([]);
    expect(unboundTokenCorners).toEqual([]);
  });
});
