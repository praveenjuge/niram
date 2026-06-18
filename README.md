# Niram

shadcn/ui design system generator for Figma

Niram is a Figma plugin that turns a [shadcn/ui](https://ui.shadcn.com)
preset code into native Figma variables, styles, components, and app blocks.

[Install the Figma Community plugin](https://www.figma.com/community/plugin/1642487887236877076/niram-shadcn-design-system-generator).

Paste a preset code, generate once, and Niram builds the design-system
surface around it:

- `Tailwind / Colors` with the Tailwind v4 OKLCH palette.
- `Tailwind / Primitives` with radius, spacing, typography, opacity, border,
  shadow, and blur tokens.
- `shadcn / Theme` with light values plus `dark-*` twin variables for Figma
  free-tier compatibility.
- Tailwind typography text styles and shadow, inner shadow, blur, and backdrop
  blur effect styles.
- A single `Niram` page that hosts three regions: a Design System region for
  colors, type, spacing, radii, effects, opacity, border widths, and icons; a
  57-section Components region with forms, typography, data tables,
  icon-backed controls, and common overlays; and a Blocks region with all five
  shadcn login layouts, all five signup layouts, a shadcn-structured
  dashboard, a Chart component set, and the 16-variant Sidebar set — the auth
  and dashboard blocks assembled from generated component instances.

Re-running with a different preset updates the same variables, styles, and
page in place.

## Usage

1. Build a preset at <https://ui.shadcn.com/create> and copy its code, such as
   `b0` or `bAhk2P`.
2. Run **Generate from preset...** in Figma, or use **Shuffle a random preset**.
3. Paste the code and generate.

## Privacy

Niram runs offline. `apps/figma-plugin/manifest.json` declares
`networkAccess.allowedDomains: ["none"]`, so the plugin cannot make external
network requests. It does not use analytics, telemetry, CDNs, or third-party
services.

The plugin only writes to the file where you run it: the three variable
collections, generated text/effect styles, and the single `Niram` page
(Design System, Components, and Blocks regions).

## Development

This repo is a Bun workspace monorepo with two apps under `apps/`:

- `apps/figma-plugin` (`@niram/figma-plugin`) - the Figma plugin.
- `apps/web` (`@niram/web`) - the Niram website, a TanStack Start (React) app
  styled with Tailwind CSS v4 and shadcn/ui.

Dependencies install in isolated (pnpm-style) mode via `bunfig.toml`, so each
app keeps its own toolchain (the plugin pins Vite 5 through Vitest while the
website uses TanStack Start's Vite 8).

Work on the Figma plugin:

```bash
bun install
bun run typecheck
bun run test
bun run build
```

Work on the website:

```bash
bun run web:dev        # start the TanStack Start dev server
bun run web:build      # build client + SSR bundles to apps/web/dist
bun run web:typecheck  # tsc --noEmit
```

Other useful plugin scripts:

```bash
bun run watch
bun run test:coverage
bun run extract-themes
bun run gen-avatar-images
bun run gen-icons
```

Load the plugin locally with **Plugins -> Development -> Import plugin from
manifest...** and select `apps/figma-plugin/manifest.json`.

See [AGENTS.md](./AGENTS.md) for architecture, commands, and constraints.

## Support

Install the plugin from
<https://www.figma.com/community/plugin/1642487887236877076/niram-shadcn-design-system-generator>.

Open issues at <https://github.com/praveenjuge/niram/issues>.

## License

[MIT](./LICENSE)
