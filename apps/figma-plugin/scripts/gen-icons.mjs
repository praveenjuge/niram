// One-shot helper: bundles the shadcn-curated icon set for all five supported
// icon libraries into a base64-free TypeScript module at src/data/icons.ts.
//
// shadcn's `create` flow lets you pick one of five icon libraries (lucide,
// hugeicons, tabler, phosphor, remixicon). Its registry only wires up a
// curated ~150-icon subset per library — see
// shadcn-ui/apps/v4/registry/icons/__<library>__.ts. We mirror exactly that
// subset so the Design System page's icon component set matches what shadcn
// would scaffold.
//
// The plugin sandbox has no network access (manifest networkAccess
// .allowedDomains = ["none"]) and only learns the selected library at runtime,
// so every library's markup is bundled. At runtime the section wraps each
// icon's inner markup in a tiny <svg> and feeds it to figma.createNodeFromSvg.
//
// Re-run when bumping the curated lists or the source icon packages:
//   bun scripts/gen-icons.mjs
//
// Source packages are installed into a temp dir (not added to package.json)
// the same way scripts/extract-themes.mjs builds shadcn's themes.ts offline.

import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const shadcnIcons = resolve(root, "shadcn-ui/apps/v4/registry/icons");
const outPath = resolve(root, "src/data/icons.ts");

// Pinned to match shadcn's lockfile where it matters. lucide-static tracks
// lucide-react's icon set but versions independently; the latest is a superset
// that keeps the deprecated aliases shadcn's list still references, so we take
// latest there and pin the rest to shadcn's versions.
const PACKAGES = {
  lucide: "lucide-static@latest",
  tabler: "@tabler/icons@3.34.1",
  phosphor: "@phosphor-icons/core@2.1.1",
  remixicon: "remixicon@4.7.0",
  hugeicons: "@hugeicons/core-free-icons@1.2.1",
};

// PascalCase / camelCase -> kebab-case, with acronym and digit boundaries so
// e.g. XCircle -> x-circle, ArrowDownSLine -> arrow-down-s-line, Building2 ->
// building-2.
function kebab(s) {
  return s
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])(\d)/g, "$1-$2")
    .replace(/(\d)([A-Za-z])/g, "$1-$2")
    .toLowerCase();
}

// Parse `export { SomeIcon } from "pkg"` lines into the exported identifiers.
function parseExports(file) {
  const text = readFileSync(join(shadcnIcons, file), "utf8");
  const names = [];
  for (const m of text.matchAll(/export\s*\{\s*([A-Za-z0-9_]+)\s*\}/g)) {
    names.push(m[1]);
  }
  return names;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// Pull the children of the <svg> wrapper and collapse whitespace. We supply
// our own wrapper at runtime, so per-icon markup only needs the geometry.
function innerOf(svg) {
  const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  let inner = (m ? m[1] : svg).replace(/\s+/g, " ").trim();
  // Drop fully transparent bounding-box rects (Tabler ships one per icon:
  // `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>`). They'd otherwise
  // become an invisible vector in the resulting Figma node.
  inner = inner.replace(
    /<path\b(?=[^>]*\bstroke="none")(?=[^>]*\bfill="none")[^>]*\/>/g,
    "",
  );
  return inner.trim();
}

// Serialize a hugeicons IconSvgElement (array of [tag, props]) into SVG
// markup. Props are React-style camelCase; convert to SVG attributes.
function hugeiconToInner(data) {
  const parts = [];
  for (const [tag, props] of data) {
    const attrs = [];
    for (const [key, value] of Object.entries(props || {})) {
      if (key === "key") continue;
      const name = key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
      attrs.push(`${name}="${value}"`);
    }
    parts.push(`<${tag} ${attrs.join(" ")}/>`);
  }
  return parts.join("");
}

function installPackages(specs) {
  const dir = mkdtempSync(join(tmpdir(), "niram-icons-"));
  writeFileSync(join(dir, "package.json"), '{"private":true}');
  execFileSync(
    "npm",
    ["install", "--no-save", "--no-audit", "--no-fund", ...specs],
    { cwd: dir, stdio: "inherit" },
  );
  return join(dir, "node_modules");
}

const nm = installPackages(Object.values(PACKAGES));

// Per-library: the <svg> open tag used to wrap each icon's inner markup, and
// a resolver from a shadcn export name to inner markup. Stroke-based libraries
// (lucide, tabler) put stroke attrs on the wrapper; fill-based libraries
// (phosphor, remixicon) set fill on the wrapper; hugeicons elements carry
// their own stroke attrs so the wrapper just disables fill.
const STROKE_OPEN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';

const libraries = {};

// --- lucide ---
{
  const dir = join(nm, "lucide-static/icons");
  const icons = {};
  for (const name of parseExports("__lucide__.ts")) {
    const file = kebab(name.replace(/Icon$/, "")) + ".svg";
    icons[kebab(name.replace(/Icon$/, ""))] = innerOf(
      readFileSync(join(dir, file), "utf8"),
    );
  }
  libraries.lucide = { svgOpen: STROKE_OPEN, icons };
}

// --- tabler (outline, plus a few *Filled exports from the filled set) ---
{
  const outline = join(nm, "@tabler/icons/icons/outline");
  const filled = join(nm, "@tabler/icons/icons/filled");
  const icons = {};
  for (const name of parseExports("__tabler__.ts")) {
    let base = name.replace(/^Icon/, "");
    let dir = outline;
    if (base.endsWith("Filled")) {
      base = base.replace(/Filled$/, "");
      dir = filled;
    }
    const key = kebab(name.replace(/^Icon/, ""));
    icons[key] = innerOf(readFileSync(join(dir, kebab(base) + ".svg"), "utf8"));
  }
  libraries.tabler = { svgOpen: STROKE_OPEN, icons };
}

// --- phosphor (regular weight) ---
{
  const dir = join(nm, "@phosphor-icons/core/assets/regular");
  // A handful of shadcn export names are phosphor aliases whose canonical file
  // differs from the kebab of the export name.
  const aliases = { ActivityIcon: "pulse" };
  const open =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" fill="currentColor">';
  const icons = {};
  for (const name of parseExports("__phosphor__.ts")) {
    const file = aliases[name] ?? kebab(name.replace(/Icon$/, ""));
    icons[kebab(name.replace(/Icon$/, ""))] = innerOf(
      readFileSync(join(dir, file + ".svg"), "utf8"),
    );
  }
  libraries.phosphor = { svgOpen: open, icons };
}

// --- remixicon (category subfolders; match by file basename) ---
{
  const dir = join(nm, "remixicon/icons");
  const index = new Map();
  for (const f of walk(dir).filter((f) => f.endsWith(".svg"))) {
    index.set(f.slice(f.lastIndexOf("/") + 1).replace(/\.svg$/, ""), f);
  }
  const open =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">';
  const icons = {};
  for (const name of parseExports("__remixicon__.ts")) {
    const key = kebab(name.replace(/^Ri/, ""));
    icons[key] = innerOf(readFileSync(index.get(key), "utf8"));
  }
  libraries.remixicon = { svgOpen: open, icons };
}

// --- hugeicons (IconSvgElement data arrays via the package index) ---
{
  const mod = await import(
    pathToFileURL(join(nm, "@hugeicons/core-free-icons/dist/esm/index.js")).href
  );
  const icons = {};
  for (const name of parseExports("__hugeicons__.ts")) {
    const data = mod[name];
    if (!Array.isArray(data)) continue;
    icons[kebab(name.replace(/Icon$/, ""))] = hugeiconToInner(data);
  }
  libraries.hugeicons = { svgOpen: STROKE_OPEN, icons };
}

// Emit. Sort icon keys for stable, scannable output and deterministic diffs.
const libLiteral = (lib) => {
  const data = libraries[lib];
  const keys = Object.keys(data.icons).sort();
  const entries = keys
    .map((k) => `      ${JSON.stringify(k)}: ${JSON.stringify(data.icons[k])},`)
    .join("\n");
  return (
    `  ${lib}: {\n` +
    `    svgOpen: ${JSON.stringify(data.svgOpen)},\n` +
    `    icons: {\n${entries}\n    },\n` +
    `  },`
  );
};

const order = ["lucide", "hugeicons", "tabler", "phosphor", "remixicon"];
const counts = order
  .map((l) => `//   ${l}: ${Object.keys(libraries[l].icons).length}`)
  .join("\n");

const ts = `// Auto-generated by scripts/gen-icons.mjs. Do not edit by hand.
//
// shadcn's curated icon subset for each of the five selectable icon libraries
// (mirrors shadcn-ui/apps/v4/registry/icons/__<library>__.ts). Each entry is
// the inner SVG markup for one icon; the Design System page wraps it in the
// per-library \`svgOpen\` tag and feeds it to figma.createNodeFromSvg. The
// plugin sandbox has no network access, so every library is bundled and the
// selected one is rendered at runtime.
//
// Icon counts:
${counts}

export type IconLibraryName =
  | "lucide"
  | "hugeicons"
  | "tabler"
  | "phosphor"
  | "remixicon";

export type IconLibraryData = {
  // Opening <svg ...> tag (with viewBox + default paint attributes) used to
  // wrap each icon's inner markup before createNodeFromSvg.
  svgOpen: string;
  // Map of kebab-case icon name -> inner SVG markup.
  icons: Record<string, string>;
};

export const ICON_LIBRARIES: Record<IconLibraryName, IconLibraryData> = {
${order.map(libLiteral).join("\n")}
};
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, ts);

const total = order.reduce(
  (acc, l) => acc + Object.keys(libraries[l].icons).length,
  0,
);
process.stderr.write(
  `wrote ${outPath} (${order.length} libraries, ${total} icons, ${(ts.length / 1024).toFixed(1)} KB)\n`,
);
