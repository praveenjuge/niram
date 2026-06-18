// Carousel: a horizontal slide viewport with prev/next controls. Mirrors
// shadcn's Carousel (embla): CarouselItems are `basis-full` cards, and
// CarouselPrevious / CarouselNext render as `size-8 rounded-full` outline icon
// buttons flanking the viewport.
//
// We render three peeking slides (the active centred, neighbours clipped) with
// outline arrow buttons on each side and a row of position dots beneath.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { wrapInSectionCard } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const SLIDE_SIZE = 200;
const ARROW_SIZE = 32;
const ARROW_GAP = 12;

export async function addCarouselSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = buildCarouselComponent(inputs);
  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

function buildCarouselComponent(inputs: ComponentsInputs): ComponentNode {
  const comp = figma.createComponent();
  comp.name = "Carousel";
  comp.layoutMode = "VERTICAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  comp.primaryAxisAlignItems = "CENTER";
  comp.counterAxisAlignItems = "CENTER";
  comp.itemSpacing = 16;
  comp.fills = [];
  comp.strokes = [];

  // Control row: prev arrow, slide, next arrow.
  const row = figma.createFrame();
  row.name = "Viewport";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "AUTO";
  row.primaryAxisAlignItems = "CENTER";
  row.counterAxisAlignItems = "CENTER";
  row.itemSpacing = ARROW_GAP;
  row.fills = [];
  row.strokes = [];
  comp.appendChild(row);

  row.appendChild(buildArrow(inputs, "prev"));
  // Slides live in a slot (created on the component, nested in the viewport)
  // so instances can add/remove/reorder slides without detaching.
  const slides = createConfiguredSlot(
    comp,
    "Slides",
    [buildSlide(inputs, "1")],
    {
      description: "Carousel slides.",
      settings: { minChildren: 1 },
    },
  );
  row.appendChild(slides);
  slides.layoutMode = "HORIZONTAL";
  slides.primaryAxisSizingMode = "AUTO";
  slides.counterAxisSizingMode = "AUTO";
  slides.primaryAxisAlignItems = "CENTER";
  slides.counterAxisAlignItems = "CENTER";
  slides.itemSpacing = ARROW_GAP;
  slides.fills = [];
  slides.strokes = [];
  row.appendChild(buildArrow(inputs, "next"));

  // Dots row.
  comp.appendChild(buildDots(inputs, 5, 0));

  return comp;
}

function buildSlide(inputs: ComponentsInputs, label: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const slide = figma.createFrame();
  slide.name = "Slide";
  slide.layoutMode = "HORIZONTAL";
  slide.primaryAxisSizingMode = "FIXED";
  slide.counterAxisSizingMode = "FIXED";
  slide.primaryAxisAlignItems = "CENTER";
  slide.counterAxisAlignItems = "CENTER";
  slide.resize(SLIDE_SIZE, SLIDE_SIZE);
  slide.cornerRadius = 8;
  bindCornerRadii(slide, p.get("radius/lg"));
  // shadcn CarouselItem cards use a plain bordered surface with a large
  // centred number (`text-4xl font-semibold`).
  bindFill(slide, t.get("card"));
  bindStrokeColor(slide, t.get("border"));
  slide.strokeWeight = 1;
  slide.strokeAlign = "INSIDE";

  const text = figma.createText();
  applyFont(text, "heading", "Semi Bold");
  text.characters = label;
  text.fontSize = 36;
  bindFontSize(text, p.get("font/size/4xl"));
  bindFill(text, t.get("card-foreground"));
  slide.appendChild(text);

  return slide;
}

// An outline icon button holding a chevron (`size-8 rounded-full`).
function buildArrow(
  inputs: ComponentsInputs,
  direction: "prev" | "next",
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = direction === "prev" ? "Previous" : "Next";
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "FIXED";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.resize(ARROW_SIZE, ARROW_SIZE);
  btn.cornerRadius = 9999;
  bindCornerRadii(btn, p.get("radius/full"));
  bindFill(btn, t.get("background"));
  bindStrokeColor(btn, t.get("border"));
  btn.strokeWeight = 1;
  btn.strokeAlign = "INSIDE";

  const chevron = figma.createVector();
  chevron.name = "Chevron";
  chevron.resize(16, 16);
  chevron.vectorPaths = [
    {
      windingRule: "NONZERO",
      data:
        direction === "prev" ? "M 10 4 L 6 8 L 10 12" : "M 6 4 L 10 8 L 6 12",
    },
  ];
  chevron.strokeWeight = 1.5;
  chevron.strokeCap = "ROUND";
  chevron.strokeJoin = "ROUND";
  chevron.fills = [];
  bindStrokeColor(chevron, t.get("foreground"));
  btn.appendChild(chevron);

  return btn;
}

// A row of position dots; the active one is primary, the rest muted.
function buildDots(
  inputs: ComponentsInputs,
  count: number,
  active: number,
): FrameNode {
  const t = inputs.theme.light;

  const dots = figma.createFrame();
  dots.name = "Dots";
  dots.layoutMode = "HORIZONTAL";
  dots.primaryAxisSizingMode = "AUTO";
  dots.counterAxisSizingMode = "AUTO";
  dots.counterAxisAlignItems = "CENTER";
  dots.itemSpacing = 6;
  dots.fills = [];
  dots.strokes = [];

  for (let i = 0; i < count; i++) {
    const dot = figma.createEllipse();
    dot.name = i === active ? "Dot (active)" : "Dot";
    const size = i === active ? 8 : 6;
    dot.resize(size, size);
    bindFill(dot, i === active ? t.get("primary") : t.get("muted"));
    dots.appendChild(dot);
  }

  return dots;
}
