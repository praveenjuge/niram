import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// CI broke on Sep 24, 2026 when a local Bun 1.4 install rewrote bun.lock to
// lockfileVersion 2 while the workflow still pinned Bun 1.3.14, which cannot
// parse that format. These checks keep CI and local installs on one Bun.
const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf-8");

const bunVersion = (): [number, number, number] => {
  const pkg = JSON.parse(read("package.json")) as { packageManager?: string };
  const match = /^bun@(\d+)\.(\d+)\.(\d+)$/.exec(pkg.packageManager ?? "");
  expect(match, "root package.json must pin packageManager bun@x.y.z").not.toBeNull();
  return [Number(match?.[1]), Number(match?.[2]), Number(match?.[3])];
};

describe("Bun toolchain", () => {
  it("CI reads the Bun version from package.json instead of hardcoding it", () => {
    const workflow = read(".github/workflows/test.yml");
    expect(workflow).toMatch(/bun-version-file:\s*package\.json/);
    expect(workflow).not.toMatch(/^\s*bun-version:/m);
  });

  it("pins a Bun that can read the committed lockfile format", () => {
    const lock = /"lockfileVersion":\s*(\d+)/.exec(read("bun.lock"));
    expect(lock).not.toBeNull();
    const [major, minor] = bunVersion();
    // lockfileVersion 2 is written by Bun 1.4.0 and later.
    if (Number(lock?.[1]) >= 2) {
      expect(major > 1 || (major === 1 && minor >= 4)).toBe(true);
    }
  });
});
