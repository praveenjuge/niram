import { beforeEach, describe, expect, it } from "vitest";
import {
  addLabel,
  createSectionFrame,
  createSubSection,
  createTableRow,
  createVertical,
  createWrappingRow,
  sectionContentWidth,
} from "../../src/designSystem/layout";
import { SECTION_WIDTH } from "../../src/designSystem/types";

// Load Inter weights the helpers rely on before touching text nodes.
beforeEach(async () => {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
});

describe("sectionContentWidth", () => {
  it("subtracts the horizontal padding from the section width", () => {
    expect(sectionContentWidth()).toBe(SECTION_WIDTH - 48);
  });
});

describe("createSectionFrame", () => {
  it("uses the name as the heading by default", () => {
    const frame = createSectionFrame("Colors");
    expect(frame.name).toBe("Colors");
    // Heading only, no subtitle.
    expect((frame as unknown as { children: unknown[] }).children).toHaveLength(
      1,
    );
  });

  it("honors title overrides and appends a subtitle", () => {
    const frame = createSectionFrame("Colors", {
      title: "Theme colors",
      titleSize: 20,
      subtitle: "Light and dark",
    });
    const children = (
      frame as unknown as { children: { characters: string }[] }
    ).children;
    expect(children).toHaveLength(2);
    expect(children[0]!.characters).toBe("Theme colors");
    expect(children[1]!.characters).toBe("Light and dark");
  });
});

describe("createSubSection", () => {
  it("appends a titled sub-frame to the parent", () => {
    const parent = createSectionFrame("Parent");
    const before = (parent as unknown as { children: unknown[] }).children
      .length;
    const sub = createSubSection(parent, "Sub");
    expect(
      (parent as unknown as { children: unknown[] }).children,
    ).toHaveLength(before + 1);
    expect(
      (sub as unknown as { children: { characters: string }[] }).children[0]!
        .characters,
    ).toBe("Sub");
  });
});

describe("createWrappingRow", () => {
  it("derives width from the parent content area", () => {
    const parent = createSectionFrame("Parent");
    (parent as unknown as { width: number }).width = 500;
    (parent as unknown as { paddingLeft: number }).paddingLeft = 16;
    (parent as unknown as { paddingRight: number }).paddingRight = 16;
    const row = createWrappingRow(parent, 8);
    expect((row as unknown as { width: number }).width).toBe(500 - 32);
  });

  it("falls back to the section width and a 100px floor", () => {
    const parent = createSectionFrame("Parent");
    (parent as unknown as { width: number }).width = 0;
    (parent as unknown as { paddingLeft?: number }).paddingLeft = undefined;
    (parent as unknown as { paddingRight?: number }).paddingRight = undefined;
    const row = createWrappingRow(parent, 8);
    expect((row as unknown as { width: number }).width).toBe(SECTION_WIDTH);
  });
});

describe("createVertical / createTableRow", () => {
  it("appends frames to the parent", () => {
    const parent = createSectionFrame("Parent");
    const v = createVertical(parent, 8);
    const r = createTableRow(parent, 80);
    expect((v as unknown as { parent: unknown }).parent).toBe(parent);
    expect((r as unknown as { parent: unknown }).parent).toBe(parent);
  });
});

describe("addLabel", () => {
  it("creates a sized text label parented to the frame", () => {
    const parent = createSectionFrame("Parent");
    const label = addLabel(parent, "px", undefined, 40);
    expect((label as unknown as { characters: string }).characters).toBe("px");
    expect((label as unknown as { width: number }).width).toBe(40);
    expect((label as unknown as { parent: unknown }).parent).toBe(parent);
  });
});
