import { describe, expect, it } from "vitest";
import {
  collectIconComponents,
  instantiateIcon,
  resolveIconName,
  type IconComponentMap,
} from "../../src/icons";

type FigmaLike = {
  createComponent(): {
    type: string;
    name: string;
    children: unknown[];
    appendChild(c: unknown): void;
  };
  createFrame(): {
    type: string;
    name: string;
    children: unknown[];
    appendChild(c: unknown): void;
  };
};

function fig(): FigmaLike {
  return (globalThis as unknown as { figma: FigmaLike }).figma;
}

describe("resolveIconName", () => {
  it("maps a semantic icon to the library-specific name", () => {
    // lucide exposes bold/italic/underline bare.
    expect(resolveIconName("lucide", "bold")).toBe("bold");
    expect(resolveIconName("lucide", "underline")).toBe("underline");
    // hugeicons / phosphor prefix with `text-`.
    expect(resolveIconName("hugeicons", "bold")).toBe("text-bold");
    expect(resolveIconName("phosphor", "bold")).toBe("text-b");
  });

  it("returns the first candidate name and is stable across libraries", () => {
    // Every curated semantic icon resolves in every library, so the result is
    // always a defined name (the undefined branch is purely defensive).
    expect(resolveIconName("tabler", "italic")).toBe("italic");
    expect(resolveIconName("remixicon", "underline")).toBe("underline");
  });
});

describe("collectIconComponents", () => {
  it("collects only `Icon=`-named components, keyed by name", () => {
    const figma = fig();
    const root = figma.createFrame();
    root.name = "root";

    const iconBold = figma.createComponent();
    iconBold.name = "Icon=bold";
    const iconItalic = figma.createComponent();
    iconItalic.name = "Icon=italic";
    const notAnIcon = figma.createComponent();
    notAnIcon.name = "Variant=default";

    root.appendChild(iconBold);
    root.appendChild(iconItalic);
    root.appendChild(notAnIcon);

    const map = collectIconComponents(root as unknown as SceneNode);
    expect(map.has("bold")).toBe(true);
    expect(map.has("italic")).toBe(true);
    expect(map.has("Variant=default")).toBe(false);
    expect(map.size).toBe(2);
  });
});

describe("instantiateIcon", () => {
  it("creates an instance of the matching icon component", () => {
    const figma = fig();
    const comp = figma.createComponent();
    comp.name = "Icon=bold";
    const icons: IconComponentMap = new Map([
      ["bold", comp as unknown as ComponentNode],
    ]);

    const instance = instantiateIcon({
      icons,
      library: "lucide",
      name: "bold",
      size: 16,
    });
    expect(instance).toBeDefined();
    expect((instance as unknown as { type: string }).type).toBe("INSTANCE");
    expect((instance as unknown as { name: string }).name).toBe("Icon");
  });

  it("returns undefined when the map lacks the resolved component", () => {
    // `bold` resolves for lucide, but the (empty) map has no such component.
    const icons: IconComponentMap = new Map();
    expect(
      instantiateIcon({ icons, library: "lucide", name: "bold", size: 16 }),
    ).toBeUndefined();
  });

  it("returns undefined when the resolved component can't be instantiated", () => {
    // A component-like object without createInstance (older host / stub).
    const stub = { type: "COMPONENT", name: "Icon=bold" };
    const icons: IconComponentMap = new Map([
      ["bold", stub as unknown as ComponentNode],
    ]);
    expect(
      instantiateIcon({ icons, library: "lucide", name: "bold", size: 16 }),
    ).toBeUndefined();
  });
});
