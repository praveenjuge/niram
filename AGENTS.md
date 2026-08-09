# AGENTS.md

Niram is a Figma plugin that turns a [shadcn/ui](https://ui.shadcn.com)
preset code into native Figma variables, styles, components, and app blocks.
It generates Tailwind colors, primitive tokens, a single-mode light/dark
shadcn theme, Tailwind typography text styles, shadow/blur effect styles, and a
single `Niram` page that hosts three regions: a Design System region, a
Components region, and a Blocks region. Everything lives on one page to stay
within Figma Starter/free page limits.

This repo is a Bun workspace monorepo with two apps under `apps/`:

- `apps/figma-plugin` (`@niram/figma-plugin`) - the Figma plugin. Everything
  below describes this app unless stated otherwise.
- `apps/web` (`@niram/web`) - the Niram website and block catalogue, built with
  Blume. Markdown/MDX under `docs/` owns the content and navigation; Blume owns
  the Astro/Vite runtime, site chrome, search, SEO, and AI-readable outputs.

Dependencies install in isolated (pnpm-style) mode via the root `bunfig.toml`
(`[install] linker = "isolated"`) so each app keeps its own toolchain. This is
required: the plugin pins Vite 5 through Vitest, while Blume owns the website's
current Astro/Vite toolchain. Don't switch the workspace back to hoisted
installs.

## Agent startup

Start with these files before changing behavior:

1. `apps/figma-plugin/src/code.ts` - top-level generate flow and UI progress messages.
2. `apps/figma-plugin/src/generator/index.ts` - variable collections, text styles, effect
   styles, and font loading.
3. `apps/figma-plugin/src/designSystem/index.ts` - Design System region sections and layout. This
   builder owns the shared `Niram` page: it creates the page and, on a re-run,
   clears only the section frames it previously tagged.
4. `apps/figma-plugin/src/componentsPage/index.ts` - component section registry, deferred
   sections, and column layout. Appends the Components region beneath the
   Design System region on the same page.
5. `apps/figma-plugin/src/blocksPage/index.ts` - login, signup, sidebar, and dashboard Blocks
   region appended to the right of the Components grid on the same page.

Recent product surface to preserve:

- Everything renders onto one page named `Niram`. The three builders each own
  a region of that page, tagged via the `niramRegion` plugin-data key
  (`design-system`, `components`, `blocks`) so each builder clears and rebuilds
  only its own region. Do not split these back into separate pages — Figma's
  Starter/free tier caps a file at 3 pages.
- The Components region has 56 shadcn-style sections, including form,
  typography, data table, icon-backed controls, and overlays. The Tooltip
  section also ships a `Chart Tooltip` component set (the
  ChartTooltipContent callout styles from ui.shadcn.com/charts), since those
  are tooltip chrome, not chart shapes.
- The Chart is a Blocks region component set: one Figma component named
  "Chart" holding a curated subset of the shadcn/ui chart catalogue
  (https://ui.shadcn.com/charts) as variants keyed by `Family` (Area, Bar,
  Line, Pie, Radar, Radial) and `Variant` (the per-family pattern). It keeps
  ~4 visually-distinct patterns per family and ships a single resize-friendly
  size (no `Size` variant). It lives in `apps/figma-plugin/src/blocksPage/blocks/chart/` (data +
  sizes + renderers engine; the engine understands a superset of flags so
  trimmed variants can be re-added in data.ts). The dashboard block instances
  the Chart, so the Chart block builds before the dashboard.
- The Sidebar is a Blocks region component set: one Figma component named
  "Sidebar" with all 16 shadcn sidebar block layouts
  (https://ui.shadcn.com/blocks/sidebar) as variants (Variant=sidebar-01 …
  sidebar-16), each a fixed 982px tall. It lives in `apps/figma-plugin/src/blocksPage/blocks/
sidebar/` (primitives + 16 variant builders), not as a Components section.
- Blocks are not a separate page. They live as a region on the shared `Niram`
  page (to the right of the component grid) to stay within Figma Starter/free
  page limits and reuse live component instances.
- The dashboard block should stay structurally close to shadcn's dashboard
  block patterns; avoid simplifying it into a static showcase.
- `apps/figma-plugin/manifest.json` already has the published numeric plugin id. Do not restore
  pre-submission publishing docs or placeholder-id instructions.

## Commands

The default `bun run <script>` commands target the Figma plugin
(`@niram/figma-plugin`):

```bash
bun install
bun run build      # one-shot esbuild -> apps/figma-plugin/dist/code.js + apps/figma-plugin/dist/ui.html
bun run watch      # rebuild on changes
bun run typecheck  # tsc --noEmit in apps/figma-plugin
bun run test       # vitest run in apps/figma-plugin
bun run test:coverage  # vitest run --coverage (enforces thresholds)
bun run extract-themes  # regenerate apps/figma-plugin/src/data/themes.json from shadcn-ui/
bun run gen-avatar-images  # regenerate apps/figma-plugin/src/data/avatars.ts (avatar photos)
bun run gen-icons  # regenerate apps/figma-plugin/src/data/icons.ts (shadcn icon-library subsets)
```

Website (`@niram/web`) scripts, run from the repo root:

```bash
bun run web:dev        # Blume dev server (port 3000)
bun run web:build      # build the static Blume site -> apps/web/dist
bun run web:preview    # preview the production build
bun run web:typecheck  # Blume/Astro typecheck
```

After changes, run `bun run typecheck`, `bun run test`, and `bun run build`. Tests
live in `apps/figma-plugin/test/` (Vitest), mirroring `apps/figma-plugin/src/`; the Figma plugin API is faked by
`apps/figma-plugin/test/figma-mock.ts` so the generator and page builders run under Bun. There
is no linter. Load the plugin in Figma desktop via **Plugins → Development →
Import plugin from manifest…** and pick `apps/figma-plugin/manifest.json`.

### Test layers

- **Logic (most tests).** Import `apps/figma-plugin/src/*.ts` directly and assert against the
  in-memory `apps/figma-plugin/test/figma-mock.ts`. `apps/figma-plugin/test/generator/idempotency.test.ts` adds
  re-run / golden-tree coverage via `apps/figma-plugin/test/helpers/snapshot.ts`, which strips
  non-deterministic IDs so snapshots stay stable.
- **QuickJS sandbox (`apps/figma-plugin/test/quickjs/`).** Compiles `apps/figma-plugin/src/code.ts` with the
  production esbuild downlevel flags and runs the bundle inside a real QuickJS
  engine (`quickjs-emscripten`), driving a `generate` message end to end. This
  guards the ES2017 / QuickJS hard constraint — modern syntax or builtins that
  slip past the downlevel step fail here, not in Figma. The sandbox esbuild
  settings are shared via `apps/figma-plugin/scripts/esbuild-config.mjs` so the harness and the
  production build can't drift. `apps/figma-plugin/test/figma-mock.ts` must stay free of any
  `vitest` import (it is bundled into the VM); use its local `createSpy`.

## Layout

```
apps/figma-plugin/src/
  code.ts            # plugin sandbox entry (figma.* APIs, QuickJS)
  ui.ts / ui.html    # iframe UI
  messages.ts        # sandbox ↔ UI message contract
  preset.ts          # shadcn preset codec mirror (validate + decode)
  registry.ts        # local resolver, mirrors shadcn buildRegistryTheme
  fonts.ts           # loads preset body/heading fonts, applies + binds them
  colors/            # Tailwind table, OKLCH→sRGB, alias matcher
  primitives.ts      # radius/spacing/typography token tables
  effects.ts         # Tailwind shadow + blur effect token tables
  effectStyles.ts    # idempotent Figma effect styles (shadows, blur, backdrop)
  textStyles.ts      # idempotent Tailwind typography text styles
  tokenBindings.ts   # binds literal dimensions/effects/etc. back to variables
  generator/         # builds Figma collections, modes, variables
  designSystem/      # owns the shared "Niram" page; builds the Design System region
  componentsPage/    # appends the Components region (component registry) to the page
  blocksPage/        # appends the Blocks region (reuses component instances) to the page
  data/themes.json   # snapshot of shadcn's apps/v4/registry/themes.ts
  data/avatars.ts    # base64 avatar photos (build-time fetch) for Avatar styles
  data/icons.ts      # shadcn icon-library subsets (build-time) for the Icons section
apps/figma-plugin/scripts/
  build.mjs          # esbuild runner
  extract-themes.mjs # regenerates src/data/themes.json from shadcn-ui/
  gen-avatar-images.mjs # regenerates src/data/avatars.ts from pravatar.cc
  gen-icons.mjs      # regenerates src/data/icons.ts from the icon-library packages
apps/figma-plugin/manifest.json        # Figma plugin manifest
apps/web/            # @niram/web - Blume website and block catalogue
  docs/              # Markdown/MDX content and file-derived navigation
  components/        # static Astro MDX components, including BlockPreview
  blume.config.ts    # site metadata and Blume configuration
  components.ts      # MDX component registration
  theme.css          # project-level Blume theme extensions
bunfig.toml          # Bun config: isolated (pnpm-style) workspace installs
shadcn-ui/           # local clone, git-ignored, reference only
```

## Hard constraints

- **Sandbox target is ES2017.** `apps/figma-plugin/src/code.ts` runs in Figma's QuickJS sandbox.
  `apps/figma-plugin/scripts/build.mjs` already disables optional chaining, nullish coalescing,
  and logical assignment via esbuild `supported`. Do not raise the target and
  do not assume modern syntax in sandbox code.
- **No network.** `apps/figma-plugin/manifest.json` sets `networkAccess.allowedDomains: ["none"]`
  and the iframe origin is `null`. Everything must work offline; do not add
  `fetch`, CDNs, or analytics.
- **Idempotent generation.** Re-running with a different preset must reuse
  existing collections/variables and update values in place. Don't create
  duplicate collections or rename existing variables.
- **Single-mode collections.** `shadcn / Theme` uses one mode with `dark-*`
  twin variables (Figma free tier is 1-mode only). Don't switch to multi-mode.
- **Alias-first colors.** Theme colors that match a Tailwind OKLCH shade must
  be written as variable aliases, not literal colors. Use the matcher in
  `apps/figma-plugin/src/colors/` rather than re-implementing the lookup.
- **Mirror shadcn behavior.** `preset.ts` and `registry.ts` mirror shadcn's
  `decodePreset` / `buildRegistryTheme` (chart-color overrides, menu-accent
  transform, radius override). Keep them in sync with `shadcn-ui/` when
  regenerating themes.
- **One page, three regions.** Everything renders onto a single page named
  `Niram`. `buildDesignSystem` creates the page; each builder tags the
  top-level frames it owns with the `niramRegion` plugin-data key
  (`design-system`, `components`, `blocks`) and, on a re-run, clears and
  rebuilds only its own region. Keep region generation idempotent and
  deterministic so snapshots stay stable, and don't clear the whole page or
  split a region onto its own page (Figma Starter/free caps a file at 3 pages).
- **Region order on the page.** The Design System region sits at the top, the
  Components grid is appended below it, and the Blocks region sits to the right
  of the grid. `code.ts` runs the builders in that order so the offsets resolve.
- **Blocks depend on Components.** Build or update reusable component sections
  before blocks that instance them. Blocks should bind text styles and token
  variables just like Design System and Components nodes.

## Conventions

- TypeScript strict mode with `noUncheckedIndexedAccess`. Handle `undefined`
  from index access explicitly.
- Keep sandbox (`code.ts` and its imports) free of DOM APIs; keep UI (`ui.ts`)
  free of `figma.*` APIs. They communicate only through `messages.ts`.
- Prefer editing the canonical builder for a surface instead of adding parallel
  paths. Component work usually belongs in `apps/figma-plugin/src/componentsPage/sections/*`;
  block work belongs in `apps/figma-plugin/src/blocksPage/blocks/*` plus shared helpers only
  when there is real reuse.
- When adding a component section, register it in `apps/figma-plugin/src/componentsPage/index.ts`
  and extend focused tests under `apps/figma-plugin/test/componentsPage/`.
- When adding a block, keep it in `apps/figma-plugin/src/blocksPage/blocks/`, reuse generated
  component instances where possible, and extend `apps/figma-plugin/test/blocksPage/`.
- If a change touches sandbox compatibility, run or update
  `apps/figma-plugin/test/quickjs/sandbox.test.ts`.
- `apps/figma-plugin/dist/` is build output, do not hand-edit.
- Conventional Commits for messages.
