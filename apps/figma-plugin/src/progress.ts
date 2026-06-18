// Progress orchestration for the full-file generate flow.
//
// `Generate` runs one canonical path: variables, Design System, Components, and
// Blocks all build in a single click. Raw section counts make a poor progress
// signal — the heavy post-build sweeps (text styles, token binding, layout)
// happen after the last section is counted, so a count-based bar stalls at
// "100%" while the plugin is still clearly working.
//
// Instead the orchestrator assigns a deterministic *weight* to every phase of
// every region and reports a weighted percent. Phases advance monotonically and
// the bar only reaches 100% on the terminal `done`. The reporter is pure data +
// a single emit callback so it runs identically under Node (tests) and Figma's
// QuickJS sandbox.

import type { PluginToUi } from "./messages";

// A single named phase of the generate flow. Region builders report the
// post-processing phases (`clearing` … `layout`); `resolving`, `variables`, and
// `done` are reported by the top-level orchestrator in code.ts.
export type ProgressPhase =
  | "resolving"
  | "variables"
  | "clearing"
  | "building"
  | "text-styles"
  | "binding"
  | "layout"
  | "done";

// The region a phase belongs to. `undefined` for the global phases that don't
// belong to a single region (resolving the preset, generating variables, done).
export type ProgressRegion = "design-system" | "components" | "blocks";

// The structured event a region builder hands back to the orchestrator. It
// describes which post-processing phase is running and how far through it is so
// the weighted bar can interpolate within the phase's slice.
export type RegionProgressEvent = {
  phase: Exclude<ProgressPhase, "resolving" | "variables" | "done">;
  current: number;
  total: number;
  label?: string;
};

// The callback shape every region builder accepts. code.ts binds one per region
// so the builder stays agnostic of weights and message plumbing.
export type RegionProgress = (event: RegionProgressEvent) => void;

type Segment = {
  phase: ProgressPhase;
  region?: ProgressRegion;
  weight: number;
};

// Deterministic phase weights. Components is the heaviest region (57+ sections),
// Blocks is mid, Design System is light; the post-build sweeps get real weight
// so the bar keeps moving through them instead of parking at the last section.
const PLAN: Segment[] = [
  { phase: "resolving", weight: 1 },
  { phase: "variables", weight: 10 },

  { phase: "clearing", region: "design-system", weight: 1 },
  { phase: "building", region: "design-system", weight: 8 },
  { phase: "text-styles", region: "design-system", weight: 3 },
  { phase: "binding", region: "design-system", weight: 2 },
  { phase: "layout", region: "design-system", weight: 1 },

  { phase: "clearing", region: "components", weight: 1 },
  { phase: "building", region: "components", weight: 30 },
  { phase: "text-styles", region: "components", weight: 10 },
  { phase: "binding", region: "components", weight: 8 },
  { phase: "layout", region: "components", weight: 1 },

  { phase: "clearing", region: "blocks", weight: 1 },
  { phase: "building", region: "blocks", weight: 14 },
  { phase: "text-styles", region: "blocks", weight: 5 },
  { phase: "binding", region: "blocks", weight: 4 },
  { phase: "layout", region: "blocks", weight: 1 },

  { phase: "done", weight: 0 },
];

const REGION_LABEL: Record<ProgressRegion, string> = {
  "design-system": "Design System",
  components: "Components",
  blocks: "Blocks",
};

function segmentKey(phase: ProgressPhase, region?: ProgressRegion): string {
  return (region ? region + ":" : "") + phase;
}

// Human-readable detail line for a phase, used when the caller doesn't supply
// its own label (and to prefix section labels with their region).
function describe(
  phase: ProgressPhase,
  region: ProgressRegion | undefined,
  label: string | undefined,
): string {
  const regionName = region ? REGION_LABEL[region] : "";
  switch (phase) {
    case "resolving":
      return "Resolving preset…";
    case "variables":
      return "Generating variables, styles & fonts…";
    case "clearing":
      return `Clearing ${regionName}…`;
    case "building":
      return label && label !== "Done"
        ? `Building ${regionName}: ${label}…`
        : `Building ${regionName}…`;
    case "text-styles":
      return `Applying text styles · ${regionName}…`;
    case "binding":
      return `Binding tokens · ${regionName}…`;
    case "layout":
      return `Laying out ${regionName}…`;
    case "done":
      return "Done";
  }
}

export type ProgressUpdate = {
  phase: ProgressPhase;
  region?: ProgressRegion;
  detail: string;
  percent: number;
  elapsedMs: number;
};

export type ProgressReporterOptions = {
  // Sink for each progress update. code.ts forwards these to the UI.
  emit: (update: ProgressUpdate) => void;
  // Injectable clock so tests get a deterministic elapsed time.
  now?: () => number;
};

// Tracks weighted progress across the whole generate flow and emits monotonic,
// determinate updates. One instance per generate run.
export class ProgressReporter {
  private readonly emit: (update: ProgressUpdate) => void;
  private readonly now: () => number;
  private readonly startedAt: number;
  private readonly indexByKey = new Map<string, number>();
  private readonly prefix: number[] = [];
  private readonly total: number;

  private index = -1;
  private lastPercent = 0;

  constructor(options: ProgressReporterOptions) {
    this.emit = options.emit;
    this.now = options.now ?? (() => Date.now());
    this.startedAt = this.now();

    let running = 0;
    for (let i = 0; i < PLAN.length; i++) {
      const segment = PLAN[i]!;
      this.indexByKey.set(segmentKey(segment.phase, segment.region), i);
      this.prefix[i] = running;
      running += segment.weight;
    }
    // Avoid divide-by-zero; the plan always carries weight in practice.
    this.total = running > 0 ? running : 1;
  }

  // Advance to (or stay within) a phase and emit an update. `current`/`total`
  // interpolate within the phase's weight slice; pass 0/0 to mark a phase entry.
  mark(
    phase: ProgressPhase,
    region: ProgressRegion | undefined,
    current: number,
    total: number,
    label?: string,
  ): void {
    const idx = this.indexByKey.get(segmentKey(phase, region));
    if (idx === undefined) return;
    // Never walk backwards: a late event from an earlier phase can't lower the
    // bar or rewind the active segment.
    if (idx >= this.index) this.index = idx;
    const activeIdx = this.index;
    const segment = PLAN[activeIdx]!;
    const fraction = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
    const weightSoFar = this.prefix[activeIdx]! + fraction * segment.weight;

    let percent = Math.round((weightSoFar / this.total) * 100);
    // Reserve 100% for the terminal `done` so the bar never reads complete
    // while a sweep is still running.
    if (segment.phase !== "done" && percent > 99) percent = 99;
    if (percent < this.lastPercent) percent = this.lastPercent;
    this.lastPercent = percent;

    this.emit({
      phase: segment.phase,
      region: segment.region,
      detail: describe(segment.phase, segment.region, label),
      percent,
      elapsedMs: this.now() - this.startedAt,
    });
  }

  // Mark a global (region-less) phase as entered. Used for resolving/variables.
  phase(phase: ProgressPhase, label?: string): void {
    this.mark(phase, undefined, 0, 0, label);
  }

  // Bind a per-region callback for a builder's `onProgress`, translating its
  // post-processing events into weighted updates.
  region(region: ProgressRegion): RegionProgress {
    return (event: RegionProgressEvent) => {
      this.mark(event.phase, region, event.current, event.total, event.label);
    };
  }

  // Terminal update: forces the bar to 100%.
  finish(): void {
    this.index = PLAN.length - 1;
    this.lastPercent = 100;
    this.emit({
      phase: "done",
      detail: "Done",
      percent: 100,
      elapsedMs: this.now() - this.startedAt,
    });
  }

  // Elapsed time since the run started, for the final summary.
  elapsed(): number {
    return this.now() - this.startedAt;
  }
}
