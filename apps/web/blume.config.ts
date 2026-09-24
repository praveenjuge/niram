import { defineConfig } from "blume";

export default defineConfig({
  title: "Niram",
  description:
    "Generate native Figma variables, styles, components, and blocks from any shadcn/ui preset.",
  deployment: {
    site: "https://niram.praveenjuge.com",
  },
  github: {
    owner: "praveenjuge",
    repo: "niram",
    dir: "apps/web",
  },
  markdown: {
    externalLinks: true,
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
    mode: "system",
    radius: "md",
  },
});
