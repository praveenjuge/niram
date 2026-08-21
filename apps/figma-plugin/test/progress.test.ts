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

describe("ProgressReporter measurements", () => {
  it("records per-segment durations across transitions and at finish", () => {
    // Scripted clock. Each transition mark consumes two readings (the close/
    // reopen timestamp and the emitted elapsed time); finish consumes two
    // more (final close + terminal emit).
    const reporter = new ProgressReporter({
      emit: () => {},
      now: scriptedClock([0, 100, 100, 250, 250, 400, 400]),
    });
    reporter.phase("resolving"); // open at 100
    reporter.phase("variables"); // resolving closed: 250-100 = 150
    reporter.finish(); // variables closed: 400-250 = 150

    const measured = reporter.measurements();
    expect(measured["resolving"]).toBe(150);
    expect(measured["variables"]).toBe(150);
  });

  it("returns a copy, so callers can't mutate the internal record", () => {
    const reporter = new ProgressReporter({
      emit: () => {},
      now: scriptedClock([0, 10, 10, 50, 50]),
    });
    reporter.phase("resolving");
    reporter.finish();
    const measured = reporter.measurements();
    delete measured["resolving"];
    expect(reporter.measurements()["resolving"]).toBeDefined();
  });

  it("accumulates fragmented marks within one segment", () => {
    const reporter = new ProgressReporter({
      emit: () => {},
      now: fakeClock(25),
    });
    const track = reporter.region("components");
    // Several marks inside the building segment; their durations must sum.
    track({ phase: "building", current: 1, total: 4, label: "A" });
    track({ phase: "building", current: 2, total: 4, label: "B" });
    track({ phase: "building", current: 3, total: 4, label: "C" });
    reporter.finish();

    expect(reporter.measurements()["components:building"]).toBeGreaterThan(0);
  });
});

describe("ProgressReporter calibration", () => {
  function driveWith(
    calibration?: Record<string, number>,
  ): { updates: ProgressUpdate[]; percentAfterDsBuild: number } {
    const updates: ProgressUpdate[] = [];
    const reporter = new ProgressReporter({
      emit: (u) => updates.push(u),
      now: fakeClock(),
      calibration,
    });
    reporter.phase("resolving");
    reporter.phase("variables");
    const track = reporter.region("design-system");
    track({ phase: "clearing", current: 1, total: 1 });
    track({ phase: "building", current: 4, total: 4 });
    return { updates, percentAfterDsBuild: updates.at(-1)!.percent };
  }

  it("keeps static weights when no calibration data exists", () => {
    // Entering resolving sits at 0%; entering variables lands just past
    // resolving's 1-weight slice (≈1% of the static plan).
    expect(driveWith().percentAfterDsBuild).toBeLessThanOrEqual(21);
    // An empty record takes the same static path.
    expect(driveWith({}).percentAfterDsBuild).toBe(
      driveWith().percentAfterDsBuild,
    );
  });

  it("reweights segments toward the measured durations", () => {
    // Static plan: design-system's build (weight 8) finishing lands ~20%.
    // Measuring it equal to Components' build (static 8 vs 30) must pull the
    // same boundary well past that.
    const staticRun = driveWith();
    const calibratedRun = driveWith({
      "design-system:building": 500,
      "components:building": 500,
    });
    expect(staticRun.percentAfterDsBuild).toBeLessThanOrEqual(21);
    expect(calibratedRun.percentAfterDsBuild).toBeGreaterThan(25);
    expect(calibratedRun.percentAfterDsBuild).toBeGreaterThan(
      staticRun.percentAfterDsBuild,
    );
  });

  it("stays monotonic and reserves 100% under calibration", () => {
    const updates: ProgressUpdate[] = [];
    const reporter = new ProgressReporter({
      emit: (u) => updates.push(u),
      now: fakeClock(),
      calibration: {
        "components:building": 600,
        "components:binding": 200,
        "blocks:building": 300,
      },
    });
    // Reuse the standard drive shape with the calibrated reporter.
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

    let prev = -1;
    for (const update of updates) {
      expect(update.percent).toBeGreaterThanOrEqual(prev);
      expect(update.percent).toBeLessThanOrEqual(100);
      prev = update.percent;
    }
    expect(updates.filter((u) => u.percent === 100)).toHaveLength(1);
  });
});

// A clock that hands out scripted readings, repeating the last one once
// exhausted (so extra elapsed reads never crash a test).
function scriptedClock(readings: number[]): () => number {
  let i = 0;
  return () => {
    const reading = readings[Math.min(i, readings.length - 1)]!;
    i += 1;
    return reading;
  };
}
