// Single source of truth for the sandbox (code.ts) esbuild settings. Both the
// production build (scripts/build.mjs) and the QuickJS test harness import this
// so they downlevel identically.
//
// HARD CONSTRAINT: the sandbox runs in Figma's QuickJS engine. Keep the target
// at ES2017 and keep these syntax features disabled — QuickJS lacks them and
// esbuild must transform them away. Do not loosen without verifying QuickJS.

export const SANDBOX_TARGET = "es2017";

export const SANDBOX_SUPPORTED = {
  "optional-chain": false,
  "nullish-coalescing": false,
  "logical-assignment": false,
};

// Build options for the sandbox entry. `outfile` is optional: the harness
// builds in-memory (write: false) and omits it.
export function makeCodeOptions({ entry, outfile }) {
  return {
    entryPoints: [entry],
    bundle: true,
    ...(outfile ? { outfile } : {}),
    platform: "browser",
    target: [SANDBOX_TARGET],
    format: "iife",
    logLevel: "info",
    supported: SANDBOX_SUPPORTED,
  };
}
