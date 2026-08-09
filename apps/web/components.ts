import { defineComponents } from "blume";

import BlockPreview from "./components/BlockPreview.astro";

export default defineComponents({
  mdx: {
    BlockPreview,
  },
});
