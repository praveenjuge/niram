// Skeleton: loading placeholder shapes filled with the muted colour.
// Mirrors radix-nova's Skeleton: `bg-muted rounded-md`.
//
// We ship a few shapes that designers commonly need: an avatar circle,
// short and full-width text rows, and a card-sized block.

import { bindCornerRadii, bindFill } from "../bindings";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const SKELETON_SHAPES = [
  "circle",
  "line-sm",
  "line-lg",
  "block",
  "paragraph",
  "list",
  "card",
] as const;
type SkeletonShape = (typeof SKELETON_SHAPES)[number];

const SKELETON_DIMS: Record<SkeletonShape, { w: number; h: number }> = {
  circle: { w: 40, h: 40 },
  "line-sm": { w: 160, h: 16 },
  "line-lg": { w: 320, h: 16 },
  block: { w: 320, h: 96 },
  paragraph: { w: 320, h: 56 },
  list: { w: 320, h: 152 },
  card: { w: 320, h: 180 },
};

export async function addSkeletonSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const shape of SKELETON_SHAPES) {
    const comp = buildSkeletonComponent(inputs, shape);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Skeleton";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 12;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildSkeletonComponent(
  inputs: ComponentsInputs,
  shape: SkeletonShape,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const dims = SKELETON_DIMS[shape];

  // Composite shapes (paragraph, card) lay out several muted bars; the simple
  // shapes are a single muted rectangle/circle.
  if (shape === "paragraph") {
    return buildParagraphSkeleton(inputs, dims);
  }
  if (shape === "list") {
    return buildListSkeleton(inputs, dims);
  }
  if (shape === "card") {
    return buildCardSkeleton(inputs, dims);
  }

  const comp = figma.createComponent();
  comp.name = `Shape=${shape}`;
  comp.layoutMode = "NONE";
  comp.resize(dims.w, dims.h);

  if (shape === "circle") {
    comp.cornerRadius = 9999;
    bindCornerRadii(comp, p.get("radius/full"));
  } else {
    comp.cornerRadius = 6;
    bindCornerRadii(comp, p.get("radius/md"));
  }

  // radix-nova: `bg-muted rounded-md`.
  bindFill(comp, t.get("muted"));
  return comp;
}

// A muted bar used by the composite skeletons.
function muteBar(
  inputs: ComponentsInputs,
  w: number,
  h: number,
  radius: number,
): RectangleNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const bar = figma.createRectangle();
  bar.resize(w, h);
  bar.cornerRadius = radius;
  bindCornerRadii(bar as unknown as FrameNode, p.get("radius/md"));
  bindFill(bar, t.get("muted"));
  return bar;
}

// Paragraph: three stacked text rows, the last one short — the classic
// "loading copy" placeholder.
function buildParagraphSkeleton(
  inputs: ComponentsInputs,
  dims: { w: number; h: number },
): ComponentNode {
  const comp = figma.createComponent();
  comp.name = "Shape=paragraph";
  comp.layoutMode = "VERTICAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.resize(dims.w, dims.h);
  comp.itemSpacing = 8;
  comp.fills = [];

  const widths = [dims.w, dims.w, dims.w * 0.6];
  for (let i = 0; i < widths.length; i++) {
    const bar = muteBar(inputs, widths[i]!, 12, 6);
    bar.name = `Line ${i + 1}`;
    comp.appendChild(bar);
  }
  return comp;
}

// List: three stacked rows, each an avatar circle + two text lines — the
// classic table / list loading placeholder designers reach for.
function buildListSkeleton(
  inputs: ComponentsInputs,
  dims: { w: number; h: number },
): ComponentNode {
  const comp = figma.createComponent();
  comp.name = "Shape=list";
  comp.layoutMode = "VERTICAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.resize(dims.w, dims.h);
  comp.itemSpacing = 16;
  comp.fills = [];

  const t = inputs.theme.light;
  for (let r = 0; r < 3; r++) {
    const row = figma.createFrame();
    row.name = `Row ${r + 1}`;
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "FIXED";
    row.counterAxisSizingMode = "AUTO";
    row.counterAxisAlignItems = "CENTER";
    row.itemSpacing = 12;
    row.resize(dims.w, 36);
    row.fills = [];
    comp.appendChild(row);
    row.layoutSizingHorizontal = "FILL";

    const circle = figma.createEllipse();
    circle.name = "Avatar";
    circle.resize(36, 36);
    bindFill(circle, t.get("muted"));
    row.appendChild(circle);

    const lines = figma.createFrame();
    lines.name = "Lines";
    lines.layoutMode = "VERTICAL";
    lines.primaryAxisSizingMode = "AUTO";
    lines.counterAxisSizingMode = "AUTO";
    lines.itemSpacing = 8;
    lines.fills = [];
    row.appendChild(lines);
    lines.layoutGrow = 1;
    lines.layoutSizingHorizontal = "FILL";

    const title = muteBar(inputs, dims.w * 0.6, 12, 6);
    title.name = "Title";
    lines.appendChild(title);
    title.layoutSizingHorizontal = "FILL";
    const subtitle = muteBar(inputs, dims.w * 0.4, 10, 5);
    subtitle.name = "Subtitle";
    lines.appendChild(subtitle);
  }

  return comp;
}

// Card: a media block over an avatar circle + two title rows — mirrors the
// shadcn skeleton-card demo designers reach for first.
function buildCardSkeleton(
  inputs: ComponentsInputs,
  dims: { w: number; h: number },
): ComponentNode {
  const comp = figma.createComponent();
  comp.name = "Shape=card";
  comp.layoutMode = "VERTICAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.resize(dims.w, dims.h);
  comp.itemSpacing = 12;
  comp.fills = [];

  // Media block.
  const media = muteBar(inputs, dims.w, 110, 8);
  media.name = "Media";
  comp.appendChild(media);

  // Footer row: avatar circle + stacked title/subtitle.
  const row = figma.createFrame();
  row.name = "Footer";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.counterAxisAlignItems = "CENTER";
  row.itemSpacing = 12;
  row.resize(dims.w, 40);
  row.fills = [];
  comp.appendChild(row);
  row.layoutSizingHorizontal = "FILL";

  const t = inputs.theme.light;
  const p = inputs.primitives;
  const circle = figma.createEllipse();
  circle.name = "Avatar";
  circle.resize(40, 40);
  bindFill(circle, t.get("muted"));
  row.appendChild(circle);

  const lines = figma.createFrame();
  lines.name = "Lines";
  lines.layoutMode = "VERTICAL";
  lines.primaryAxisSizingMode = "AUTO";
  lines.counterAxisSizingMode = "AUTO";
  lines.itemSpacing = 8;
  lines.fills = [];
  row.appendChild(lines);
  lines.layoutGrow = 1;
  lines.layoutSizingHorizontal = "FILL";

  const title = muteBar(inputs, dims.w * 0.5, 12, 6);
  title.name = "Title";
  lines.appendChild(title);
  title.layoutSizingHorizontal = "FILL";
  const subtitle = muteBar(inputs, dims.w * 0.3, 10, 5);
  subtitle.name = "Subtitle";
  lines.appendChild(subtitle);

  // Silence the unused-binding warning for p in environments without tokens.
  void p;
  return comp;
}
