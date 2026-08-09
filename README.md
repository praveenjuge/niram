# Niram

shadcn/ui design system tooling.

Niram turns [shadcn/ui](https://ui.shadcn.com) into ready-to-use design
resources. This repo is a Bun workspace monorepo with two apps:

- **Figma plugin** (`apps/figma-plugin`) - paste a shadcn preset code and
  generate native Figma variables, styles, components, and blocks.
- **Website** (`apps/web`) - Blume-powered product documentation and a
  browsable catalogue of evergreen shadcn blocks.

## Figma plugin

[Install from the Figma Community](https://www.figma.com/community/plugin/1642487887236877076/niram-shadcn-design-system-generator).

Paste a preset code, generate once, and Niram builds a full design-system
surface on a single `Niram` page:

- Tailwind v4 OKLCH colors, primitive tokens (radius, spacing, typography,
  opacity, border, shadow, blur), and a light/dark `shadcn` theme.
- Tailwind typography text styles and shadow, inner shadow, and blur effect
  styles.
- Three regions on the page: a Design System region, a Components region, and
  a Blocks region (login, signup, dashboard, charts, and sidebar layouts built
  from real component instances).

Re-running with a different preset updates the same variables, styles, and
page in place.

**Usage**

1. Build a preset at <https://ui.shadcn.com/create> and copy its code.
2. Run **Generate from preset...** in Figma, or **Shuffle a random preset**.
3. Paste the code and generate.

The plugin runs fully offline. It uses no network, analytics, or third-party
services, and only writes to the file where you run it.

## Website

Blume-powered product documentation and a catalogue of shadcn blocks you can
browse by category. Content lives under `apps/web/docs`; Blume provides the
site shell, navigation, search, SEO, and AI-readable outputs.

## Development

Dependencies install in isolated (pnpm-style) mode via `bunfig.toml`, so each
app keeps its own toolchain.

```bash
bun install
```

Figma plugin (default `bun run` scripts):

```bash
bun run build      # build to apps/figma-plugin/dist
bun run watch      # rebuild on changes
bun run typecheck
bun run test
```

Website:

```bash
bun run web:dev        # dev server on port 3000
bun run web:build      # build to apps/web/dist
bun run web:typecheck
```

Load the plugin locally with **Plugins -> Development -> Import plugin from
manifest...** and select `apps/figma-plugin/manifest.json`.

See [AGENTS.md](./AGENTS.md) for architecture, commands, and constraints.

## Support

Open issues at <https://github.com/praveenjuge/niram/issues>.

## License

[MIT](./LICENSE)
