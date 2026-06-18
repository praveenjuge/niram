import { describe, expect, it } from "vitest";
import {
  createBrand,
  createCoverPanel,
  createPageHeader,
  createSeparatorLabel,
  createSplitCard,
  createSurface,
} from "../../src/blocksPage/layout";
import type { BlocksInputs } from "../../src/blocksPage";
import { generateFromRegistry } from "../../src/generator";
import { resolvePreset } from "../../src/registry";

const fig = () => (globalThis as unknown as { figma: any }).figma;

// Real theme + primitive variables so the binding helpers resolve, plus a stub
// effect-style map so the optional `shadow` branches run.
async function makeInputs(
  extra: Partial<BlocksInputs> = {},
  code = "b2fA",
): Promise<BlocksInputs> {
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
    effectStyles: { idFor: () => "effect-style-1" } as never,
    ...extra,
  } as BlocksInputs;
}

type FakeNode = {
  type: string;
  name: string;
  itemSpacing?: number;
  paddingTop?: number;
  effectStyleId?: string;
  children: FakeNode[];
  [key: string]: unknown;
};

describe("createSurface", () => {
  it("applies custom gap/padding and an optional shadow style", async () => {
    const inputs = await makeInputs();
    const surface = (await createSurface(inputs, 400, {
      gap: 8,
      padding: 12,
      name: "Form",
      shadow: "Shadow/xs",
    })) as unknown as FakeNode;

    expect(surface.name).toBe("Form");
    expect(surface.itemSpacing).toBe(8);
    expect(surface.paddingTop).toBe(12);
    // The shadow branch resolved a style id onto the node.
    expect(surface.effectStyleId).toBe("effect-style-1");
  });

  it("uses the default gap/padding and no shadow when omitted", async () => {
    const inputs = await makeInputs();
    const surface = (await createSurface(inputs, 400)) as unknown as FakeNode;
    expect(surface.name).toBe("Surface");
    expect(surface.itemSpacing).toBe(24);
    expect(surface.paddingTop).toBe(24);
    expect(surface.effectStyleId).toBeUndefined();
  });
});

describe("createSplitCard", () => {
  it("builds a horizontal card and applies an optional shadow", async () => {
    const inputs = await makeInputs();
    const card = (await createSplitCard(inputs, 800, 500, {
      shadow: "Shadow/xs",
    })) as unknown as FakeNode;
    expect(card.name).toBe("Card");
    expect(card.layoutMode).toBe("HORIZONTAL");
    expect(card.effectStyleId).toBe("effect-style-1");
  });
});

describe("createBrand", () => {
  it("renders the inline variant with a wordmark", async () => {
    const inputs = await makeInputs();
    const brand = createBrand(inputs, "inline") as unknown as FakeNode;
    const texts = brand.children.filter((c) => c.type === "TEXT");
    expect(texts.length).toBe(1);
  });

  it("renders the stacked variant as a bare mark (no wordmark)", async () => {
    const inputs = await makeInputs();
    const brand = createBrand(inputs, "stacked") as unknown as FakeNode;
    const texts = brand.children.filter((c) => c.type === "TEXT");
    expect(texts.length).toBe(0);
  });
});

describe("createCoverPanel / createPageHeader", () => {
  it("creates a muted cover panel at the requested size", async () => {
    const inputs = await makeInputs();
    const panel = createCoverPanel(inputs, 300, 600) as unknown as FakeNode;
    expect(panel.name).toBe("Cover");
    expect(panel.width).toBe(300);
    expect(panel.height).toBe(600);
  });

  it("creates a region header that names the preset", async () => {
    const inputs = await makeInputs();
    const header = createPageHeader(inputs, 900) as unknown as FakeNode;
    expect(header.name).toBe("Blocks");
    const copy = header.children
      .filter((c) => c.type === "TEXT")
      .map((c) => c.characters)
      .join(" ");
    expect(copy).toContain("b2fA");
  });
});

describe("createSeparatorLabel", () => {
  it("lays out rule / label / rule", async () => {
    const inputs = await makeInputs();
    const sep = createSeparatorLabel(
      inputs,
      "Or continue with",
    ) as unknown as FakeNode;
    expect(sep.name).toBe("Separator");
    const rules = sep.children.filter((c) => c.name === "Rule");
    expect(rules.length).toBe(2);
  });

  it("keeps intrinsic widths when the host rejects layoutGrow", async () => {
    const inputs = await makeInputs();
    const figma = fig();
    const origRect = figma.createRectangle.bind(figma);
    // Make every rectangle reject layoutGrow so both catch arms run.
    figma.createRectangle = () => {
      const rect = origRect();
      Object.defineProperty(rect, "layoutGrow", {
        set() {
          throw new Error("cannot grow");
        },
      });
      return rect;
    };
    try {
      expect(() =>
        createSeparatorLabel(inputs, "Or continue with"),
      ).not.toThrow();
    } finally {
      figma.createRectangle = origRect;
    }
  });
});
