import { describe, expect, it } from "vitest";
import {
  loadAllPagesOnce,
  resetPageLoadCache,
  yieldToUi,
} from "../src/async";
import type { FigmaMock } from "./figma-mock";

function liveFigma(): FigmaMock {
  return (globalThis as unknown as { figma: FigmaMock }).figma;
}

describe("yieldToUi", () => {
  it("resolves so builders can await chunk boundaries", async () => {
    await expect(yieldToUi()).resolves.toBeUndefined();
  });

  it("defers continuation to a macrotask so posted messages can flush", async () => {
    let resolved = false;
    const done = yieldToUi().then(() => {
      resolved = true;
    });
    // A microtask-only yield would have resumed by now under Node's promise
    // scheduling; the timer-based yield must not.
    await Promise.resolve();
    await Promise.resolve();
    // The exact scheduling depends on the host's timer availability, but on
    // any host with setTimeout (Node, Bun, Figma) this is still pending here.
    if (typeof setTimeout === "function") {
      expect(resolved).toBe(false);
    }
    await done;
    expect(resolved).toBe(true);
  });
});

describe("loadAllPagesOnce", () => {
  it("issues a single host load across consecutive callers", async () => {
    const figma = liveFigma();
    await Promise.all([
      loadAllPagesOnce(),
      loadAllPagesOnce(),
      loadAllPagesOnce(),
    ]);
    await loadAllPagesOnce();
    expect(figma.loadAllPagesAsync.mock.calls).toHaveLength(1);
  });

  it("re-loads after the per-run cache reset", async () => {
    const figma = liveFigma();
    await loadAllPagesOnce();
    resetPageLoadCache();
    await loadAllPagesOnce();
    expect(figma.loadAllPagesAsync.mock.calls).toHaveLength(2);
  });

  it("allows a retry when the host load rejects", async () => {
    const figma = liveFigma();
    const original = figma.loadAllPagesAsync;
    let attempts = 0;
    (figma as unknown as { loadAllPagesAsync: unknown }).loadAllPagesAsync =
      () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new Error("busy"))
          : Promise.resolve();
      };
    await expect(loadAllPagesOnce()).rejects.toThrow("busy");
    await expect(loadAllPagesOnce()).resolves.toBeUndefined();
    expect(attempts).toBe(2);
    (figma as unknown as { loadAllPagesAsync: unknown }).loadAllPagesAsync =
      original;
  });
});
