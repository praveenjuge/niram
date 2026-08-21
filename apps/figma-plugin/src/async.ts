// Cooperative yielding + shared-host-call dedupe for the sandbox build flow.
//
// The page builders run a lot of synchronous work between awaits. Without a
// yield the QuickJS event loop never gets to flush a posted progress message
// to the UI, so the iframe looks frozen even while the plugin is busy. A bare
// `await Promise.resolve()` only yields *microtasks* inside the same host task
// — `figma.ui.postMessage` messages stay queued until the sandbox actually
// returns control to Figma's event loop. So the yield schedules a real
// macrotask via setTimeout (available in Figma's sandbox), falling back to a
// microtask on hosts without timers. This helper is also the single seam tests
// use to spy on chunk boundaries.

function scheduleMacrotask(callback: () => void): void {
  if (typeof setTimeout === "function") {
    setTimeout(callback, 0);
    return;
  }
  // No timer host (some test embeds) — a microtask is the best we can do.
  Promise.resolve().then(callback);
}

export function yieldToUi(): Promise<void> {
  return new Promise<void>((resolve) => {
    scheduleMacrotask(resolve);
  });
}

// `figma.loadAllPagesAsync` is required before pages beyond the current one can
// be resolved by name under `documentAccess: "dynamic-page"`, and it is slow on
// large files. The generate flow used to call it up to four times per run
// (availability probe, orchestrator, Design System builder, Components
// builder); memoizing the promise per run collapses that to one host round
// trip. `resetPageLoadCache()` runs at the start of each generate so a fresh
// run always re-syncs with the document.
let pagesLoad: Promise<void> | null = null;

export function loadAllPagesOnce(): Promise<void> {
  if (!pagesLoad) {
    pagesLoad = figma.loadAllPagesAsync().catch((error) => {
      // Allow a retry if the load failed mid-run.
      pagesLoad = null;
      throw error;
    });
  }
  return pagesLoad;
}

export function resetPageLoadCache(): void {
  pagesLoad = null;
}
