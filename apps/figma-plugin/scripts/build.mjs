import { build, context } from "esbuild";
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeCodeOptions } from "./esbuild-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist");
mkdirSync(distDir, { recursive: true });

const watch = process.argv.includes("--watch");

// The plugin sandbox runs in QuickJS, which doesn't support optional chaining
// or other ES2020 syntax. Settings live in esbuild-config.mjs so the QuickJS
// test harness can downlevel code.ts the exact same way.
const codeOptions = makeCodeOptions({
  entry: resolve(root, "src/code.ts"),
  outfile: resolve(distDir, "code.js"),
});

const uiOptions = {
  entryPoints: [resolve(root, "src/ui.ts")],
  bundle: true,
  outfile: resolve(distDir, "ui.js"),
  platform: "browser",
  target: ["es2020"],
  format: "iife",
  logLevel: "info",
};

function buildHtml() {
  const template = readFileSync(resolve(root, "src/ui.html"), "utf8");
  const js = readFileSync(resolve(distDir, "ui.js"), "utf8");
  const html = template.replace(
    "<!-- INJECT_UI_SCRIPT -->",
    `<script>${js}</script>`,
  );
  writeFileSync(resolve(distDir, "ui.html"), html);
}

if (watch) {
  const codeCtx = await context(codeOptions);
  const uiCtx = await context({
    ...uiOptions,
    plugins: [
      {
        name: "html-rebuild",
        setup(build) {
          build.onEnd(() => buildHtml());
        },
      },
    ],
  });
  await Promise.all([codeCtx.watch(), uiCtx.watch()]);
  console.log("[niram] watching for changes…");
} else {
  await build(codeOptions);
  await build(uiOptions);
  buildHtml();
  console.log("[niram] build complete.");
}
