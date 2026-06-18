// Cooperative yielding for the sandbox build flow.
//
// The page builders run a lot of synchronous work between awaits. Without a
// yield the QuickJS event loop never gets to flush a posted progress message
// to the UI, so the iframe looks frozen even while the plugin is busy. A bare
// `await Promise.resolve()` did this implicitly; this named helper makes the
// intent explicit, gives tests a single seam to spy on chunk boundaries, and
// centralizes any future tuning (e.g. swapping in a macrotask yield).
export function yieldToUi(): Promise<void> {
  return Promise.resolve();
}
