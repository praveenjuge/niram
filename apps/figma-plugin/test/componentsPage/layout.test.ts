import { describe, expect, it } from "vitest";
import {
  styleComponentSet,
  wrapInSectionCard,
} from "../../src/componentsPage/layout";
import { SECTION_WIDTH } from "../../src/componentsPage/types";

const fig = () => (globalThis as { figma: typeof figma }).figma;

type FakeNode = {
  type: string;
  name: string;
  layoutMode?: string;
  layoutWrap?: string;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  width: number;
  height: number;
  appendChild(child: FakeNode): void;
  [key: string]: unknown;
};

function set(layoutMode: string, height = 0): FakeNode {
  const node = fig().createFrame() as unknown as FakeNode;
  node.type = "COMPONENT_SET" as never;
  node.layoutMode = layoutMode;
  node.height = height;
  return node;
}

describe("styleComponentSet", () => {
  it("pins a VERTICAL set to SECTION_WIDTH and hugs its height", () => {
    const node = set("VERTICAL", 240);
    styleComponentSet(node as unknown as ComponentSetNode);

    expect(node.width).toBe(SECTION_WIDTH);
    // Counter axis (width) is fixed, primary axis (height) hugs content.
    expect(node.counterAxisSizingMode).toBe("FIXED");
    expect(node.primaryAxisSizingMode).toBe("AUTO");
    // Standard card chrome applied.
    expect(node.strokeWeight).toBe(1);
    expect(node.paddingTop).toBe(16);
  });

  it("pins a HORIZONTAL set to SECTION_WIDTH and wraps its variants", () => {
    const node = set("HORIZONTAL", 80);
    node.itemSpacing = 12;
    styleComponentSet(node as unknown as ComponentSetNode);

    expect(node.width).toBe(SECTION_WIDTH);
    expect(node.layoutWrap).toBe("WRAP");
    // Wrapping rows reuse the item spacing as the counter-axis gap.
    expect(node.counterAxisSpacing).toBe(12);
    expect(node.primaryAxisSizingMode).toBe("FIXED");
    expect(node.counterAxisSizingMode).toBe("AUTO");
  });

  it("falls back to height 1 when the set reports no height yet", () => {
    const node = set("VERTICAL", 0);
    styleComponentSet(node as unknown as ComponentSetNode);
    expect(node.height).toBe(1);
  });
});

describe("wrapInSectionCard", () => {
  it("wraps a bare component in a fixed-width horizontal card without wrapping", () => {
    const component = fig().createFrame() as unknown as FakeNode;
    component.name = "Dialog";
    component.height = 320;

    const card = wrapInSectionCard(
      component as unknown as SceneNode,
    ) as unknown as FakeNode;

    expect(card.name).toBe("Dialog");
    expect(card.width).toBe(SECTION_WIDTH);
    expect(card.layoutMode).toBe("HORIZONTAL");
    // wrap:false means no WRAP is applied to single-demo cards.
    expect(card.layoutWrap).toBeUndefined();
    expect(card.children).toContain(component);
  });
});
