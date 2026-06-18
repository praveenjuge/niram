// Layer 2 — run the SHIPPED sandbox bundle inside a real QuickJS engine.
//
// Unlike the rest of the suite (which imports src/*.ts through Vite), this
// compiles src/code.ts with the production esbuild downlevel flags and executes
// the result in QuickJS — the same engine family Figma's plugin sandbox uses.
// It defends the "sandbox target is ES2017 / QuickJS" hard constraint: any
// modern syntax or builtin that slips past the downlevel step fails here.
//
// These tests build esbuild bundles and boot a WASM engine, so they're heavier
// than the unit tests; they live in their own folder and get a longer timeout.

import { describe, expect, it } from "vitest";
import { runSandboxInQuickJS } from "../helpers/quickjs-runner";

describe("sandbox under QuickJS", () => {
  it("loads dist code and drives a full generate to a done message", async () => {
    const { posted, summary } = await runSandboxInQuickJS("b2fA");

    // The sandbox always greets the UI with `ready` on load.
    expect(posted[0]).toEqual({ type: "ready" });

    // No error message should appear anywhere in the stream.
    expect(posted.find((m) => m.type === "error")).toBeUndefined();

    // A full generate streams determinate progress before completing.
    const progress = posted.filter((m) => m.type === "progress");
    expect(progress.length).toBeGreaterThan(0);
    // Progress carries the phase-weighted fields and a monotonic percent.
    const percents = progress
      .map((m) => m.percent)
      .filter((p): p is number => typeof p === "number");
    expect(percents.length).toBeGreaterThan(0);
    for (let i = 1; i < percents.length; i++) {
      expect(percents[i]!).toBeGreaterThanOrEqual(percents[i - 1]!);
    }
    // Phases were reported (not just bare messages).
    expect(progress.some((m) => typeof m.phase === "string")).toBe(true);
    expect(progress.every((m) => typeof m.elapsedMs === "number")).toBe(true);

    // The run must terminate in a single `done` carrying the summary + warnings.
    const done = posted.filter((m) => m.type === "done");
    expect(done).toHaveLength(1);
    expect(done[0]).toMatchObject({
      type: "done",
      presetCode: "b2fA",
      summary: {
        collections: expect.any(Array),
      },
      warnings: expect.any(Array),
    });
    expect(typeof done[0]!.elapsedMs).toBe("number");

    // The three known collections were materialized inside the VM.
    const names = summary.collections.map((c) => c.name).sort();
    expect(names).toEqual(
      ["Tailwind / Colors", "Tailwind / Primitives", "shadcn / Theme"].sort(),
    );
    for (const collection of summary.collections) {
      expect(collection.variableCount).toBeGreaterThan(0);
    }
  }, 30_000);

  it("reports an error message for an invalid preset instead of throwing", async () => {
    const { posted } = await runSandboxInQuickJS("not-a-real-preset");
    const error = posted.find((m) => m.type === "error");
    expect(error).toBeDefined();
    expect(typeof error!.message).toBe("string");
    // A rejected preset must not also emit a done.
    expect(posted.find((m) => m.type === "done")).toBeUndefined();
  }, 30_000);
});
