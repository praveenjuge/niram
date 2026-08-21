import { describe, expect, it } from "vitest";
import {
  ensureSingleMode,
  ensureThemeModes,
  getOrCreateCollection,
  getOrCreateVariable,
  probeMultiModeSupport,
} from "../../src/generator/collections";
import type { FigmaMock } from "../figma-mock";

function liveFigma(): FigmaMock {
  return (globalThis as unknown as { figma: FigmaMock }).figma;
}

describe("getOrCreateCollection", () => {
  it("creates a collection and reuses it by name", async () => {
    const first = await getOrCreateCollection("My Collection");
    const second = await getOrCreateCollection("My Collection");
    expect(second.id).toBe(first.id);
  });
});

describe("getOrCreateVariable", () => {
  it("creates then reuses a variable of the same type", async () => {
    const collection = await getOrCreateCollection("C");
    const a = await getOrCreateVariable(collection, "radius/md", "FLOAT");
    const b = await getOrCreateVariable(collection, "radius/md", "FLOAT");
    expect(b.id).toBe(a.id);
    expect(collection.variableIds.length).toBe(1);
  });

  it("recreates the variable when the type changes", async () => {
    const collection = await getOrCreateCollection("C");
    const asFloat = await getOrCreateVariable(collection, "token", "FLOAT");
    const asColor = await getOrCreateVariable(collection, "token", "COLOR");
    expect(asColor.id).not.toBe(asFloat.id);
    expect(asColor.resolvedType).toBe("COLOR");
    // Old variable was removed, not left dangling.
    expect(collection.variableIds).toEqual([asColor.id]);
  });
});

describe("ensureSingleMode", () => {
  it("renames the sole mode", async () => {
    const collection = await getOrCreateCollection("C");
    ensureSingleMode(collection, "Default");
    expect(collection.modes).toHaveLength(1);
    expect(collection.modes[0]!.name).toBe("Default");
  });

  it("trims extra modes down to one", async () => {
    const collection = await getOrCreateCollection("C");
    // Seed a second mode the way a paid-tier run might have.
    liveFigma().__setModeLimit(4);
    collection.addMode("Dark");
    expect(collection.modes).toHaveLength(2);
    ensureSingleMode(collection, "Default");
    expect(collection.modes).toHaveLength(1);
    expect(collection.modes[0]!.name).toBe("Default");
  });
});

describe("ensureThemeModes", () => {
  it("creates Light and Dark modes from a fresh collection", async () => {
    liveFigma().__setModeLimit(4);
    const collection = await getOrCreateCollection("C");
    const ids = ensureThemeModes(collection);
    expect(collection.modes.map((m) => m.name)).toEqual(["Light", "Dark"]);
    expect(ids.lightModeId).toBe(collection.modes[0]!.modeId);
    expect(ids.darkModeId).toBe(collection.modes[1]!.modeId);
  });

  it("reuses existing mode ids on a re-run", async () => {
    liveFigma().__setModeLimit(4);
    const collection = await getOrCreateCollection("C");
    const first = ensureThemeModes(collection);
    const second = ensureThemeModes(collection);
    expect(second.lightModeId).toBe(first.lightModeId);
    expect(second.darkModeId).toBe(first.darkModeId);
    expect(collection.modes).toHaveLength(2);
  });

  it("trims modes beyond Light/Dark", async () => {
    liveFigma().__setModeLimit(40);
    const collection = await getOrCreateCollection("C");
    collection.addMode("Dark");
    collection.addMode("Compact");
    ensureThemeModes(collection);
    expect(collection.modes.map((m) => m.name)).toEqual(["Light", "Dark"]);
  });

  it("propagates the tier error when the limit is one mode", async () => {
    const collection = await getOrCreateCollection("C");
    expect(() => ensureThemeModes(collection)).toThrow(
      "in addMode: Limited to 1 modes only",
    );
  });
});

describe("probeMultiModeSupport", () => {
  it("reports false on the free tier and cleans up the probe", async () => {
    expect(await probeMultiModeSupport()).toBe(false);
    const collections = await liveFigma().variables.getLocalVariableCollectionsAsync();
    expect(collections.find((c) => c.name === "__niramModeProbe")).toBeUndefined();
  });

  it("reports true when the tier allows multiple modes", async () => {
    liveFigma().__setModeLimit(4);
    expect(await probeMultiModeSupport()).toBe(true);
    const collections = await liveFigma().variables.getLocalVariableCollectionsAsync();
    expect(collections.find((c) => c.name === "__niramModeProbe")).toBeUndefined();
  });
});
