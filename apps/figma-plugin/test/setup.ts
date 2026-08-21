// Installs a fresh in-memory Figma mock before every test so suites stay
// isolated. The generator is idempotent and queries existing collections, so a
// leaked mock between tests would corrupt assertions.

import { afterEach, beforeEach } from "vitest";
import { createFigmaMock } from "./figma-mock";
import { resetLoadedFontsCache } from "../src/fonts";
import { resetPageLoadCache } from "../src/async";

beforeEach(() => {
  (globalThis as Record<string, unknown>).figma = createFigmaMock();
  // Session-level caches must not leak a previous test's mock state.
  resetLoadedFontsCache();
  resetPageLoadCache();
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).figma;
});
