# @niram/web

The Niram website and block catalogue, built with
[Blume](https://useblume.dev/docs). Blume owns the Astro/Vite runtime,
Markdown-first content, navigation, search, theme, SEO, structured data, and
AI-readable outputs. The catalogue previews are a static Astro MDX component,
so they ship without a second client-side application.

Part of the Niram Bun workspace monorepo. See the
[root README](../../README.md) for an overview of both apps.

## Commands

Run these from the repo root (preferred, so the workspace resolves):

```bash
bun run web:dev        # start the TanStack Start dev server (vite, port 3000)
bun run web:build      # build the static site to apps/web/dist
bun run web:preview    # preview the production build
bun run web:typecheck  # run Blume's Astro typecheck
```

Or run them inside this directory with `bun run dev`, `bun run build`, etc.

## Content

Routes and navigation are derived from Markdown and MDX under `docs/`:

- `docs/index.mdx` - product overview.
- `docs/getting-started.mdx` - plugin installation and generation flow.
- `docs/design-system.mdx` and `docs/components.mdx` - generated surfaces.
- `docs/blocks/` - the browsable block catalogue.

Site metadata and behavior live in `blume.config.ts`. Shared MDX components
are registered in `components.ts`; `components/BlockPreview.astro` is the
canonical catalogue preview renderer. Theme overrides belong in `theme.css`.

## Validation

Run the full website checks from the repository root:

```bash
bun run web:typecheck
bun --filter @niram/web validate
bun run web:build
```
