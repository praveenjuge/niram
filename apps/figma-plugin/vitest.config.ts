import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts", "!shadcn-ui/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/code.ts", // plugin bootstrap, side-effectful
        "src/ui.ts", // iframe DOM glue
        "src/messages.ts", // type-only message contract
        "src/popularPresets.ts", // static UI data
        "src/**/types.ts", // type-only modules
        "src/data/**", // generated data snapshots
      ],
      thresholds: {
        lines: 90,
        functions: 95,
        branches: 80,
        statements: 90,
      },
    },
  },
});
