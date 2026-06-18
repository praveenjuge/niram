// Installs a fresh in-memory Figma mock before every test so suites stay
// isolated. The generator is idempotent and queries existing collections, so a
// leaked mock between tests would corrupt assertions.

import { afterEach, beforeEach } from "vitest";
import { createFigmaMock } from "./figma-mock";

beforeEach(() => {
  (globalThis as Record<string, unknown>).figma = createFigmaMock();
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).figma;
});
