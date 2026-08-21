// Runs INSIDE the QuickJS VM. esbuild bundles this (+ the figma mock) to a
// single ES2017 IIFE which the harness evaluates before the real dist/code.js.
//
// Responsibilities:
//   1. Install a fresh figma mock + the `__html__` global the sandbox expects.
//   2. Expose `globalThis.__niramDrive(presetCode)` so the host can pump a
//      `generate` message through the handler dist/code.js registers, then read
//      back a JSON-serializable result (no live handles cross the VM bridge).

import { createFigmaMock } from "../figma-mock";

type Handler = (message: unknown) => unknown;
type SpyLike = { mock: { calls: unknown[][] } };
type CollectionLike = { name: string; variableIds: string[] };

const g = globalThis as Record<string, unknown>;

const figma = createFigmaMock();
g.figma = figma;
// code.ts passes the ambient `__html__` string to figma.showUI; the mock spy
// ignores it, but the reference must resolve under QuickJS.
g.__html__ = "<html></html>";

// The sandbox yields to the UI with `setTimeout(fn, 0)` (src/async.ts). Figma's
// sandbox provides a real timer; QuickJS does not, so bridge it onto the VM's
// microtask queue — one tick of deferment is enough for the harness, whose
// drainJobs loop pumps pending jobs until the drive promise settles.
g.setTimeout = function (fn: () => void): number {
  void Promise.resolve().then(fn);
  return 0;
};

g.__niramDrive = async function drive(presetCode: string): Promise<string> {
  const handler = (figma.ui as { onmessage: Handler | null }).onmessage;
  if (typeof handler !== "function") {
    throw new Error("dist/code.js did not register figma.ui.onmessage");
  }

  await handler({ type: "generate", presetCode });

  // Every plugin→UI message the run posted, in order. The harness asserts the
  // terminal `done` (or `error`) here.
  const posted = (figma.ui.postMessage as unknown as SpyLike).mock.calls.map(
    (call) => call[0],
  );

  // A coarse projection of the resulting variable store so the host can assert
  // structure without a second bridge round-trip.
  const collections =
    (await figma.variables.getLocalVariableCollectionsAsync()) as unknown as CollectionLike[];
  const summary = {
    collections: collections.map((coll) => ({
      name: coll.name,
      variableCount: coll.variableIds.length,
    })),
  };

  return JSON.stringify({ posted, summary });
};

g.__niramDriveReplacement = async function driveReplacement(
  presetCode: string,
  scope: Record<string, boolean>,
): Promise<string> {
  const handler = (figma.ui as { onmessage: Handler | null }).onmessage;
  if (typeof handler !== "function") {
    throw new Error("dist/code.js did not register figma.ui.onmessage");
  }

  await handler({ type: "generate", presetCode });
  const page = figma.root.children.find(
    (child) => child.type === "PAGE" && child.name === "Niram",
  );
  if (!page) throw new Error("first generate did not create Niram");
  const regionIds = () => {
    const ids: Record<string, string[]> = {};
    for (const child of page.children) {
      const region = child.getPluginData("niramRegion");
      if (region) (ids[region] ?? (ids[region] = [])).push(child.id);
    }
    return ids;
  };
  const before = regionIds();
  (figma.ui.postMessage as unknown as SpyLike).mock.calls.length = 0;

  await handler({ type: "generate", presetCode });
  await handler({
    type: "generate",
    presetCode,
    confirmReplace: true,
    replacementScope: scope,
  });

  const posted = (figma.ui.postMessage as unknown as SpyLike).mock.calls.map(
    (call) => call[0],
  );
  return JSON.stringify({ posted, before, after: regionIds() });
};
