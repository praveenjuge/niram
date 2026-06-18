# @niram/web

The Niram website. An Astro + React app styled with Tailwind CSS v4 and
[shadcn/ui](https://ui.shadcn.com), scaffolded from the `b0` shadcn preset so
it shares the same design language as the Figma plugin.

It lives in the Niram Bun workspace monorepo alongside
[`@niram/figma-plugin`](../figma-plugin).

## Commands

Run these from the repo root (preferred, so the workspace resolves):

```bash
bun run web:dev        # start the Astro dev server
bun run web:build      # build the static site to apps/web/dist
bun run web:preview    # preview the production build
bun run web:typecheck  # astro check
```

Or run them inside this directory with `bun run dev`, `bun run build`, etc.

## Adding components

Add shadcn/ui components from inside `apps/web`:

```bash
bunx --bun shadcn@latest add button
```

Components land in `src/components/ui`. Import them in `.astro` or `.tsx`
files via the `@/components/ui/*` alias.
