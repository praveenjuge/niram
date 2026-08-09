import { defineConfig } from "blume";

export default defineConfig({
  title: "Niram",
  description:
    "Generate native Figma variables, styles, components, and blocks from any shadcn/ui preset.",
  deployment: {
    output: "static",
    site: "https://niram.praveenjuge.com",
  },
  github: {
    owner: "praveenjuge",
    repo: "niram",
    dir: "apps/web",
  },
  navigation: {
    repo: true,
  },
  seo: {
    x: {
      creator: "@praveenjuge",
      handle: "@praveenjuge",
    },
  },
  theme: {
    accent: {
      light: "violet",
      dark: "violet",
    },
    layout: "sidebar",
    mode: "system",
    radius: "md",
  },
});
