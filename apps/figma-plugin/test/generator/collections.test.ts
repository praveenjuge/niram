import { describe, expect, it } from "vitest";
import {
  ensureSingleMode,
  getOrCreateCollection,
  getOrCreateVariable,
} from "../../src/generator/collections";

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
    (collection as unknown as { __addModeForTest(n: string): string }).__addModeForTest(
      "Dark",
    );
    expect(collection.modes).toHaveLength(2);
    ensureSingleMode(collection, "Default");
    expect(collection.modes).toHaveLength(1);
    expect(collection.modes[0]!.name).toBe("Default");
  });
});
