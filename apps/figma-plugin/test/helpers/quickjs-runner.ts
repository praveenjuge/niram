// Host-side driver for the QuickJS sandbox harness (Layer 2).
//
// It compiles the *real* sandbox entry (src/code.ts) with the production
// esbuild settings, then runs it inside a genuine QuickJS engine — the same
// family of engine Figma uses in the plugin sandbox. This catches syntax/engine
// gaps (e.g. a stray modern builtin) that the Vitest-transpiled unit tests,
// which run src/*.ts through Vite, would silently let through.
//
// Flow: eval bootstrap (installs figma mock + __niramDrive) → eval sandbox
// bundle (registers figma.ui.onmessage) → call __niramDrive(presetCode) →
// drain the VM job queue → read back the JSON result string.

import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  newQuickJSWASMModuleFromVariant,
  newVariant,
  RELEASE_SYNC,
} from "quickjs-emscripten";
import { makeCodeOptions } from "../../scripts/esbuild-config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

// The prebuilt QuickJS WASM variant ships with a fixed 16 MiB linear memory and
// no growth support (Emscripten was built without ALLOW_MEMORY_GROWTH, so it
// never calls memory.grow). A full 50-section generate retains the entire
// Figma-mock node tree (tens of thousands of JSObjects), which sits right at
// that 16 MiB ceiling — adding sections/variants tips it over and QuickJS OOMs,
// surfacing only as a `list_empty(&rt->gc_obj_list)` abort during
// JS_FreeRuntime teardown. Since the module can't grow, hand it a larger
// *initial* Memory up front so the harness scales with the component library
// instead of crashing on the next section. This is a test-only knob; the
// shipped sandbox runs under Figma's own engine.
const WASM_PAGE = 64 * 1024; // 64 KiB
const HIGH_MEMORY_VARIANT = newVariant(RELEASE_SYNC, {
  wasmMemory: new WebAssembly.Memory({
    initial: (256 * 1024 * 1024) / WASM_PAGE, // 256 MiB up front
    maximum: (2 * 1024 * 1024 * 1024) / WASM_PAGE, // 2 GiB WASM ceiling
  }),
});

let modulePromise: ReturnType<typeof newQuickJSWASMModuleFromVariant> | null =
  null;

// Memoize the module so we only compile the WASM once per process.
function getHighMemoryQuickJS() {
  if (!modulePromise) {
    modulePromise = newQuickJSWASMModuleFromVariant(HIGH_MEMORY_VARIANT);
  }
  return modulePromise;
}

export type PostedMessage = { type: string; [key: string]: unknown };
export type DriveResult = {
  posted: PostedMessage[];
  summary: { collections: { name: string; variableCount: number }[] };
};

async function bundle(entry: string, supported?: Record<string, boolean>) {
  const options = supported
    ? makeCodeOptions({ entry })
    : {
        entryPoints: [entry],
        bundle: true,
        platform: "browser" as const,
        target: ["es2017"],
        format: "iife" as const,
        logLevel: "silent" as const,
      };
  const result = await build({ ...options, write: false, logLevel: "silent" });
  const file = result.outputFiles?.[0];
  if (!file) throw new Error(`esbuild produced no output for ${entry}`);
  return file.text;
}

let cache: { sandbox: string; bootstrap: string } | null = null;

// Both bundles are deterministic per source tree, so build once per process.
async function buildBundles() {
  if (cache) return cache;
  const [sandbox, bootstrap] = await Promise.all([
    // Production downlevel flags — the whole point of the layer.
    bundle(resolve(root, "src/code.ts"), {}),
    bundle(resolve(here, "quickjs-bootstrap.ts")),
  ]);
  cache = { sandbox, bootstrap };
  return cache;
}

// Pump the VM microtask queue to completion. The mock's async methods all
// resolve synchronously (Promise.resolve), so a bounded loop fully settles the
// generate() chain without real async I/O.
function drainJobs(
  runtime: ReturnType<
    Awaited<ReturnType<typeof getHighMemoryQuickJS>>["newRuntime"]
  >,
) {
  for (let i = 0; i < 10_000; i++) {
    const pending = runtime.executePendingJobs();
    if (pending.error) {
      const message = pending.error.consume(
        (handle) => handle.toString?.() ?? "unknown job error",
      );
      throw new Error(`QuickJS job error: ${message}`);
    }
    if (pending.value === 0) return; // queue drained
  }
  throw new Error("QuickJS job queue did not drain (possible infinite loop)");
}

export async function runSandboxInQuickJS(
  presetCode: string,
): Promise<DriveResult> {
  const { sandbox, bootstrap } = await buildBundles();
  const QuickJS = await getHighMemoryQuickJS();
  const runtime = QuickJS.newRuntime();
  const context = runtime.newContext();

  try {
    // 1. Bootstrap: figma mock + __html__ + __niramDrive.
    const boot = context.evalCode(bootstrap);
    if (boot.error) {
      throw new Error(
        `bootstrap eval failed: ${boot.error.consume((h) => context.dump(h))}`,
      );
    }
    boot.value.dispose();

    // 2. The real, downleveled sandbox. This is the assertion that matters:
    //    if code.js uses anything QuickJS can't run, this throws.
    const code = context.evalCode(sandbox);
    if (code.error) {
      throw new Error(
        `sandbox eval failed: ${code.error.consume((h) => context.dump(h))}`,
      );
    }
    code.value.dispose();

    // 3. Kick off the async drive. Returns a VM promise handle.
    const driveCall = context.evalCode(
      `__niramDrive(${JSON.stringify(presetCode)})`,
    );
    if (driveCall.error) {
      throw new Error(
        `drive call failed: ${driveCall.error.consume((h) => context.dump(h))}`,
      );
    }

    const vmPromise = context.resolvePromise(driveCall.value);
    driveCall.value.dispose();

    // Let the VM settle the promise chain, then read the host-side result.
    drainJobs(runtime);
    const settled = await vmPromise;

    if (settled.error) {
      throw new Error(
        `drive rejected: ${settled.error.consume((h) => context.dump(h))}`,
      );
    }

    const json = settled.value.consume((h) => context.getString(h));
    return JSON.parse(json) as DriveResult;
  } finally {
    context.dispose();
    runtime.dispose();
  }
}
