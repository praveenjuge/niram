// One-off: bundle shadcn's themes.ts into JSON so the plugin can ship
// offline, without hitting the network from a null-origin iframe.

import { build } from "esbuild";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const shadcnRoot = resolve(root, "shadcn-ui/apps/v4");

const tmp = mkdtempSync(`${tmpdir()}/niram-extract-`);
const out = resolve(tmp, "themes.mjs");

await build({
  entryPoints: [resolve(shadcnRoot, "registry/themes.ts")],
  outfile: out,
  bundle: true,
  format: "esm",
  platform: "node",
  target: ["node18"],
  logLevel: "silent",
  plugins: [
    {
      name: "stub-shadcn-schema",
      setup(b) {
        b.onResolve({ filter: /^shadcn\/schema$/ }, () => ({
          path: "shadcn-schema-stub",
          namespace: "stub",
        }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
          contents: "export {};",
          loader: "js",
        }));
      },
    },
  ],
});

const mod = await import(pathToFileURL(out).href);
const themes = mod.THEMES;
if (!Array.isArray(themes)) {
  throw new Error("THEMES not exported as expected");
}

const dataDir = resolve(root, "src/data");
mkdirSync(dataDir, { recursive: true });
writeFileSync(
  resolve(dataDir, "themes.json"),
  JSON.stringify(themes, null, 2) + "\n",
);

console.log(`extracted ${themes.length} themes → src/data/themes.json`);
