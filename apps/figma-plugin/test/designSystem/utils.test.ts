import { describe, expect, it } from "vitest";
import {
  countDescendants,
  loadCommonFonts,
  shortTokenName,
  summarizePreset,
  weightStyleName,
} from "../../src/designSystem/utils";

describe("summarizePreset", () => {
  it("returns an empty string for undefined", () => {
    expect(summarizePreset(undefined)).toBe("");
  });

  it("joins the known keys in order, skipping blanks", () => {
    expect(
      summarizePreset({
        style: "new-york",
        baseColor: "zinc",
        theme: undefined,
        font: "Inter",
        radius: "0.5rem",
      }),
    ).toBe("style: new-york · baseColor: zinc · font: Inter · radius: 0.5rem");
  });

  it("includes the heading font when present, after the body font", () => {
    expect(
      summarizePreset({
        font: "geist",
        fontHeading: "lora",
      }),
    ).toBe("font: geist · fontHeading: lora");
  });

  it("ignores unknown keys", () => {
    expect(summarizePreset({ unknown: "x", style: "default" })).toBe(
      "style: default",
    );
  });

  it("returns an empty string when no known keys are present", () => {
    expect(summarizePreset({ unknown: "x" })).toBe("");
  });
});

describe("weightStyleName", () => {
  it("maps each Inter weight to its named style", () => {
    expect(weightStyleName(100)).toBe("Thin");
    expect(weightStyleName(200)).toBe("Extra Light");
    expect(weightStyleName(300)).toBe("Light");
    expect(weightStyleName(400)).toBe("Regular");
    expect(weightStyleName(500)).toBe("Medium");
    expect(weightStyleName(600)).toBe("Semi Bold");
    expect(weightStyleName(700)).toBe("Bold");
    expect(weightStyleName(800)).toBe("Extra Bold");
    expect(weightStyleName(900)).toBe("Black");
  });

  it("falls back to Regular for unknown weights", () => {
    expect(weightStyleName(450)).toBe("Regular");
    expect(weightStyleName(0)).toBe("Regular");
  });
});

describe("loadCommonFonts", () => {
  it("loads the required and optional Inter weights", async () => {
    await loadCommonFonts();
    const families = (
      figma.loadFontAsync as unknown as {
        mock: { calls: Array<[{ family: string; style: string }]> };
      }
    ).mock.calls.map((c) => c[0].style);
    // 4 required + 5 optional weights.
    expect(families).toContain("Regular");
    expect(families).toContain("Thin");
    expect(families).toContain("Black");
    expect(families.length).toBeGreaterThanOrEqual(9);
  });
});

describe("shortTokenName", () => {
  it("strips the group prefix from a slash-namespaced name", () => {
    expect(shortTokenName("Shadow/sm")).toBe("sm");
    expect(shortTokenName("Backdrop Blur/xl")).toBe("xl");
  });

  it("returns the name unchanged when there is no slash", () => {
    expect(shortTokenName("none")).toBe("none");
  });

  it("keeps only the segment after the last slash", () => {
    expect(shortTokenName("a/b/c")).toBe("c");
  });
});

describe("countDescendants", () => {
  it("counts a leaf node as one", () => {
    expect(countDescendants({ type: "TEXT" } as never)).toBe(1);
  });

  it("counts nested children recursively", () => {
    const tree = {
      type: "FRAME",
      children: [
        { type: "TEXT" },
        {
          type: "FRAME",
          children: [{ type: "TEXT" }, { type: "TEXT" }],
        },
      ],
    };
    // root + 2 direct children + 2 grandchildren = 5
    expect(countDescendants(tree as never)).toBe(5);
  });
});
