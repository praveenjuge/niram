import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// CI broke on Sep 24, 2026 when a local Bun 1.4 install rewrote bun.lock to
// lockfileVersion 2 while the workflow still pinned Bun 1.3.14, which cannot
// parse that format. These checks keep CI and local installs on one Bun.
const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../../../${path}`, import.meta.url)), "utf-8");

// Oldest Bun that reads each text lockfile format. An unknown format fails
// the test so the table is updated alongside the Bun bump that introduced it.
const MIN_BUN_FOR_LOCKFILE: Record<number, [number, number]> = {
  1: [1, 2],
  2: [1, 4],
};

const pinnedBun = (): [number, number] => {
  const pkg = JSON.parse(read("package.json")) as { packageManager?: string };
  const match = /^bun@(\d+)\.(\d+)\.\d+$/.exec(pkg.packageManager ?? "");
  expect(match, "root package.json must pin packageManager bun@x.y.z").not.toBeNull();
  return [Number(match?.[1]), Number(match?.[2])];
};

describe("Bun toolchain", () => {
  it("CI reads the Bun version from package.json instead of hardcoding it", () => {
    const workflow = read(".github/workflows/test.yml");
    expect(workflow).toMatch(/bun-version-file:\s*package\.json/);
    expect(workflow).not.toMatch(/^\s*bun-version:/m);
  });

  it("pins a Bun that can read the committed lockfile format", () => {
    const lock = /"lockfileVersion":\s*(\d+)/.exec(read("bun.lock"));
    expect(lock, "bun.lock must declare lockfileVersion").not.toBeNull();
    const min = MIN_BUN_FOR_LOCKFILE[Number(lock?.[1])];
    expect(min, `no known Bun minimum for lockfileVersion ${lock?.[1]}`).toBeDefined();
    const [major, minor] = pinnedBun();
    const [minMajor, minMinor] = min ?? [Number.POSITIVE_INFINITY, 0];
    expect(major > minMajor || (major === minMajor && minor >= minMinor)).toBe(true);
  });
});
