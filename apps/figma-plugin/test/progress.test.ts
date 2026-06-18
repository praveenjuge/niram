import { describe, expect, it } from "vitest";
import {
  ProgressReporter,
  type ProgressRegion,
  type ProgressUpdate,
} from "../src/progress";

// A fake monotonic clock so elapsed times are deterministic.
function fakeClock(step = 5) {
  let t = 1000;
  return () => {
    const now = t;
    t += step;
    return now;
  };
}

function drive(emit: (u: ProgressUpdate) => void) {
  const reporter = new ProgressReporter({ emit, now: fakeClock() });
  reporter.phase("resolving");
  reporter.phase("variables");
  for (const region of [
    "design-system",
    "components",
    "blocks",
  ] as ProgressRegion[]) {
    const track = reporter.region(region);
    track({ phase: "clearing", current: 1, total: 1 });
    track({ phase: "building", current: 0, total: 4, label: "Header" });
    track({ phase: "building", current: 4, total: 4, label: "Done" });
    track({ phase: "text-styles", current: 4, total: 4 });
    track({ phase: "binding", current: 4, total: 4 });
    track({ phase: "layout", current: 1, total: 1 });
  }
  reporter.finish();
  return reporter;
}

describe("ProgressReporter", () => {
  it("emits phases in order and never rewinds the phase index", () => {
    const updates: ProgressUpdate[] = [];
    drive((u) => updates.push(u));

    // The first two updates are the global phases.
    expect(updates[0]!.phase).toBe("resolving");
    expect(updates[1]!.phase).toBe("variables");
    // The terminal update is `done`.
    expect(updates.at(-1)!.phase).toBe("done");

    // Region progression: design-system → components → blocks.
    const regionSeq = updates
      .map((u) => u.region)
      .filter((r): r is ProgressRegion => r !== undefined);
    const firstComponents = regionSeq.indexOf("components");
    const lastDesign = regionSeq.lastIndexOf("design-system");
    const firstBlocks = regionSeq.indexOf("blocks");
    expect(lastDesign).toBeLessThan(firstComponents);
    expect(firstComponents).toBeLessThan(firstBlocks);
  });

  it("produces a monotonically non-decreasing percent", () => {
    const updates: ProgressUpdate[] = [];
    drive((u) => updates.push(u));

    let prev = -1;
    for (const update of updates) {
      expect(update.percent).toBeGreaterThanOrEqual(prev);
      expect(update.percent).toBeGreaterThanOrEqual(0);
      expect(update.percent).toBeLessThanOrEqual(100);
      prev = update.percent;
    }
  });

  it("reserves 100% for the terminal done update", () => {
    const updates: ProgressUpdate[] = [];
    drive((u) => updates.push(u));

    // Only the final `done` update reaches 100%.
    const hundreds = updates.filter((u) => u.percent === 100);
    expect(hundreds).toHaveLength(1);
    expect(hundreds[0]!.phase).toBe("done");
    expect(updates.at(-1)!.percent).toBe(100);
  });

  it("includes a non-negative elapsed time on every update", () => {
    const updates: ProgressUpdate[] = [];
    drive((u) => updates.push(u));

    for (const update of updates) {
      expect(typeof update.elapsedMs).toBe("number");
      expect(update.elapsedMs).toBeGreaterThanOrEqual(0);
    }
    // Elapsed time advances with the fake clock.
    expect(updates.at(-1)!.elapsedMs).toBeGreaterThan(updates[0]!.elapsedMs);
  });

  it("ignores unknown phase/region combinations without throwing", () => {
    const updates: ProgressUpdate[] = [];
    const reporter = new ProgressReporter({
      emit: (u) => updates.push(u),
      now: fakeClock(),
    });
    // A region phase with no matching segment is a no-op.
    reporter.mark("building", undefined, 1, 1);
    expect(updates).toHaveLength(0);
  });

  it("clamps a later lower reading to the last percent (never rewinds)", () => {
    const updates: ProgressUpdate[] = [];
    const reporter = new ProgressReporter({
      emit: (u) => updates.push(u),
      now: fakeClock(),
    });
    const track = reporter.region("components");
    track({ phase: "building", current: 4, total: 4 });
    const high = updates.at(-1)!.percent;
    // A stray earlier reading within the same segment must not lower the bar.
    track({ phase: "building", current: 0, total: 4 });
    expect(updates.at(-1)!.percent).toBe(high);
  });

  it("does not rewind when a later event names an earlier phase", () => {
    const updates: ProgressUpdate[] = [];
    const reporter = new ProgressReporter({
      emit: (u) => updates.push(u),
      now: fakeClock(),
    });
    reporter.region("components")({ phase: "building", current: 4, total: 4 });
    const afterComponents = updates.at(-1)!.percent;
    // A late design-system event (an earlier segment) stays pinned forward.
    reporter.region("design-system")({
      phase: "clearing",
      current: 1,
      total: 1,
    });
    expect(updates.at(-1)!.percent).toBeGreaterThanOrEqual(afterComponents);
  });

  it("reports elapsed time since the run started", () => {
    let t = 1000;
    const reporter = new ProgressReporter({
      emit: () => {},
      now: () => {
        const now = t;
        t += 50;
        return now;
      },
    });
    // First now() call seeds startedAt (1000); elapsed() reads the next tick.
    expect(reporter.elapsed()).toBeGreaterThan(0);
  });

  it("describes the terminal done phase when marked through the normal path", () => {
    const updates: ProgressUpdate[] = [];
    const reporter = new ProgressReporter({
      emit: (u) => updates.push(u),
      now: fakeClock(),
    });
    reporter.phase("done");
    expect(updates.at(-1)!.phase).toBe("done");
    expect(updates.at(-1)!.detail).toBe("Done");
    expect(updates.at(-1)!.percent).toBe(100);
  });
});
