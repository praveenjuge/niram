// Layout helpers shared by the Blocks page.
//
// Blocks reuse the Components page's variable-binding helpers (bindFill,
// bindStrokeColor, …) so every drawn surface stays wired to the active preset's
// theme variables, exactly like the component sections.

import {
  bindCornerRadii,
  bindFill,
  bindStrokeColor,
} from "../componentsPage/bindings";
import { applyFont } from "../fonts";
import { applyEffectStyle } from "../effectStyles";
import { solidPaint } from "../componentsPage/paints";
import { createNamedIcon, resolveIconLibrary } from "../icons";
import type { BlocksInputs } from "./types";

// The outer frame for a single block: a named, fixed-width canvas painted with
// the theme background so the block reads as a real screen. Children are laid
// out by the caller (centered for auth, a row for the dashboard).
export function createBlockCanvas(
  inputs: BlocksInputs,
  name: string,
  width: number,
  height: number,
): FrameNode {
  const t = inputs.theme.light;

  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";
  frame.resize(width, height);
  frame.clipsContent = true;
  bindFill(frame, t.get("background"));
  frame.strokes = [];
  return frame;
}

// A card surface (`bg-card text-card-foreground rounded-xl ring-1
// ring-foreground/10`) used as the container for auth forms and dashboard
// panels. Vertical auto-layout, hugging its content height. Pass `name` to
// label the layer and `shadow` (a Shadow/* style key) to lift it like
// radix-nova's `shadow-xs` cards.
export async function createSurface(
  inputs: BlocksInputs,
  width: number,
  opts: { padding?: number; gap?: number; name?: string; shadow?: string } = {},
): Promise<FrameNode> {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const surface = figma.createFrame();
  surface.name = opts.name ?? "Surface";
  surface.layoutMode = "VERTICAL";
  surface.resize(width, 10);
  surface.primaryAxisSizingMode = "AUTO";
  surface.counterAxisSizingMode = "FIXED";
  surface.itemSpacing = opts.gap ?? 24;
  const pad = opts.padding ?? 24;
  surface.paddingTop = pad;
  surface.paddingBottom = pad;
  surface.paddingLeft = pad;
  surface.paddingRight = pad;
  surface.cornerRadius = 12;
  bindCornerRadii(surface, p.get("radius/xl"));
  bindFill(surface, t.get("card"));
  bindStrokeColor(surface, t.get("border"));
  surface.strokeWeight = 1;
  surface.strokeAlign = "INSIDE";
  if (opts.shadow) {
    await applyEffectStyle(surface, inputs.effectStyles?.idFor(opts.shadow));
  }
  return surface;
}

// A plain vertical auto-layout group with no fill/stroke, for stacking rows.
export function createColumn(name: string, gap: number): FrameNode {
  const col = figma.createFrame();
  col.name = name;
  col.layoutMode = "VERTICAL";
  col.primaryAxisSizingMode = "AUTO";
  col.counterAxisSizingMode = "AUTO";
  col.itemSpacing = gap;
  col.fills = [];
  col.strokes = [];
  return col;
}

// A plain horizontal auto-layout group with no fill/stroke.
export function createRow(name: string, gap: number): FrameNode {
  const row = figma.createFrame();
  row.name = name;
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "AUTO";
  row.counterAxisAlignItems = "CENTER";
  row.itemSpacing = gap;
  row.fills = [];
  row.strokes = [];
  return row;
}

// A split card surface for the two-column auth *cards* (login-04 / signup-04:
// `<Card className="overflow-hidden p-0"><CardContent className="grid
// md:grid-cols-2 p-0">`). Unlike createSurface this is a horizontal, zero-
// padding card — the form pane carries its own padding and the cover panel
// fills the other half — but it keeps the same card fill, ring, radius, clip,
// and optional shadow so it reads as one card holding a form beside an image.
export async function createSplitCard(
  inputs: BlocksInputs,
  width: number,
  height: number,
  opts: { shadow?: string } = {},
): Promise<FrameNode> {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const card = figma.createFrame();
  card.name = "Card";
  card.layoutMode = "HORIZONTAL";
  card.primaryAxisSizingMode = "FIXED";
  card.counterAxisSizingMode = "FIXED";
  card.resize(width, height);
  card.itemSpacing = 0;
  card.clipsContent = true;
  card.cornerRadius = 12;
  bindCornerRadii(card, p.get("radius/xl"));
  bindFill(card, t.get("card"));
  bindStrokeColor(card, t.get("border"));
  card.strokeWeight = 1;
  card.strokeAlign = "INSIDE";
  if (opts.shadow) {
    await applyEffectStyle(card, inputs.effectStyles?.idFor(opts.shadow));
  }
  return card;
}

// A heading text node bound to a theme foreground colour.
export function createHeading(
  inputs: BlocksInputs,
  text: string,
  size: number,
  colorKey = "card-foreground",
): TextNode {
  const t = inputs.theme.light;
  const node = figma.createText();
  applyFont(node, "heading", "Semi Bold");
  node.characters = text;
  node.fontSize = size;
  bindFill(node, t.get(colorKey));
  return node;
}

// A body text node bound to a theme colour (defaults to muted-foreground for
// the supporting copy auth/dashboard screens lean on).
export function createBody(
  inputs: BlocksInputs,
  text: string,
  size: number,
  colorKey = "muted-foreground",
  weight: "Regular" | "Medium" = "Regular",
): TextNode {
  const t = inputs.theme.light;
  const node = figma.createText();
  applyFont(node, "body", weight);
  node.characters = text;
  node.fontSize = size;
  bindFill(node, t.get(colorKey));
  return node;
}

// A brand lockup — an `Acme Inc.` logo mark + wordmark. shadcn's auth pages use
// a `GalleryVerticalEnd` glyph inside a small rounded square. `variant` picks
// the treatment: `inline` (a primary-filled square + wordmark in a row, as in
// the two-column login/signup pages) or `stacked` (a bare centered square, as
// in the email-only pages with the wordmark rendered separately by the caller).
export function createBrand(
  inputs: BlocksInputs,
  variant: "inline" | "stacked" = "inline",
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = createRow("Brand", 8);
  row.counterAxisAlignItems = "CENTER";

  const mark = figma.createFrame();
  mark.name = "Logo";
  mark.layoutMode = "HORIZONTAL";
  mark.primaryAxisSizingMode = "FIXED";
  mark.counterAxisSizingMode = "FIXED";
  mark.primaryAxisAlignItems = "CENTER";
  mark.counterAxisAlignItems = "CENTER";
  const markSize = variant === "inline" ? 24 : 32;
  mark.resize(markSize, markSize);
  mark.cornerRadius = 6;
  bindCornerRadii(mark, p.get("radius/md"));
  if (variant === "inline") {
    bindFill(mark, t.get("primary"));
  } else {
    mark.fills = [];
  }
  mark.strokes = [];

  const glyph = createNamedIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    // shadcn's auth pages use lucide's GalleryVerticalEnd inside the brand
    // square; fall back to "folder" for icon libraries that lack it.
    name: ["gallery-vertical-end", "folder"],
    size: variant === "inline" ? 16 : 24,
    color:
      variant === "inline" ? t.get("primary-foreground") : t.get("foreground"),
  });
  if (glyph) {
    glyph.name = "Glyph";
    mark.appendChild(glyph);
  }
  row.appendChild(mark);

  if (variant === "inline") {
    const wordmark = createBody(
      inputs,
      "Acme Inc.",
      14,
      "foreground",
      "Medium",
    );
    row.appendChild(wordmark);
  }

  return row;
}

// A labelled divider (`<FieldSeparator>Or continue with</FieldSeparator>`): a
// horizontal rule with centered copy laid over it. Renders as a row of
// rule / label / rule so it stretches with its parent.
export function createSeparatorLabel(
  inputs: BlocksInputs,
  text: string,
): FrameNode {
  const t = inputs.theme.light;

  const row = createRow("Separator", 12);
  row.counterAxisAlignItems = "CENTER";
  row.primaryAxisSizingMode = "FIXED";

  const left = figma.createRectangle();
  left.name = "Rule";
  left.resize(10, 1);
  bindFill(left, t.get("border"));
  row.appendChild(left);
  try {
    (left as unknown as { layoutGrow: number }).layoutGrow = 1;
  } catch {
    // Keep intrinsic width.
  }

  const label = createBody(inputs, text, 14, "muted-foreground");
  row.appendChild(label);

  const right = figma.createRectangle();
  right.name = "Rule";
  right.resize(10, 1);
  bindFill(right, t.get("border"));
  row.appendChild(right);
  try {
    (right as unknown as { layoutGrow: number }).layoutGrow = 1;
  } catch {
    // Keep intrinsic width.
  }

  return row;
}

// The muted cover panel the two-column auth pages show beside the form
// (`relative hidden bg-muted lg:block` with an `object-cover` image). We render
// it as a flat muted rectangle so the split layout reads correctly without a
// real asset (manifest blocks network access).
export function createCoverPanel(
  inputs: BlocksInputs,
  width: number,
  height: number,
): FrameNode {
  const t = inputs.theme.light;

  const panel = figma.createFrame();
  panel.name = "Cover";
  panel.layoutMode = "VERTICAL";
  panel.primaryAxisSizingMode = "FIXED";
  panel.counterAxisSizingMode = "FIXED";
  panel.resize(width, height);
  panel.clipsContent = true;
  bindFill(panel, t.get("muted"));
  panel.strokes = [];
  return panel;
}

// A neutral region-header card matching the Design System / Components headers,
// so the blocks region opens with the same intro treatment.
export function createPageHeader(
  inputs: BlocksInputs,
  width: number,
): FrameNode {
  const frame = figma.createFrame();
  frame.name = "Blocks";
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "FIXED";
  frame.itemSpacing = 16;
  frame.paddingTop = 16;
  frame.paddingBottom = 16;
  frame.paddingLeft = 16;
  frame.paddingRight = 16;
  frame.fills = [solidPaint(1)];
  frame.resize(width, 100);

  const title = figma.createText();
  applyFont(title, "heading", "Semi Bold");
  title.characters = "Blocks";
  title.fontSize = 28;
  title.fills = [solidPaint(0.1)];
  frame.appendChild(title);

  const subtitle = figma.createText();
  applyFont(subtitle, "body", "Regular");
  subtitle.characters = `Ready-made shadcn screens for ${inputs.presetCode}, assembled from live instances of the components on this page. Edit a Button or Input once and every block updates.`;
  subtitle.fontSize = 12;
  subtitle.fills = [solidPaint(0.4)];
  frame.appendChild(subtitle);

  return frame;
}
