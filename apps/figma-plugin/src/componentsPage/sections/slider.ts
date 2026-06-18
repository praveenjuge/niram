// Slider: track + range fill + thumb. Two orientations × three values.
//
// Mirrors radix-nova's Slider (radix-ui primitive): a rounded-full `bg-muted`
// track (`h-1` horizontal / `w-1` vertical), a `bg-primary` range, and a
// `size-3` (12px) circular thumb with `border-ring bg-white`. The vertical
// orientation (`data-vertical`) runs bottom-to-top with `min-h-40`.

import { bindFill, bindStrokeColor } from "../bindings";
import { applyEffectStyle } from "../../effectStyles";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const SLIDER_ORIENTATIONS = ["horizontal", "vertical"] as const;
type SliderOrientation = (typeof SLIDER_ORIENTATIONS)[number];

const SLIDER_VALUES = [25, 50, 75] as const;
type SliderValue = (typeof SLIDER_VALUES)[number];

// Disabled twin. radix-nova slider uses `disabled:opacity-50`.
const SLIDER_DISABLED = ["False", "True"] as const;
type SliderDisabled = (typeof SLIDER_DISABLED)[number];

const TRACK_LENGTH = 280;
// radix-nova vertical track has `min-h-40` (160px).
const VERTICAL_LENGTH = 160;
const TRACK_THICKNESS = 4;
const THUMB_SIZE = 12;

export async function addSliderSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const orientation of SLIDER_ORIENTATIONS) {
    for (const value of SLIDER_VALUES) {
      for (const disabled of SLIDER_DISABLED) {
        const comp = await buildSliderComponent(
          inputs,
          orientation,
          value,
          disabled,
        );
        page.appendChild(comp);
        components.push(comp);
      }
    }
  }

  // Horizontal auto layout so styleComponentSet wraps the variants onto new
  // rows within SECTION_WIDTH. A VERTICAL set stacked all 12 variants in one
  // column, and the 160px-tall vertical sliders made the section enormously
  // tall; wrapping lets the slim vertical variants sit side by side on a row.
  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Slider";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 24;
  componentSet.counterAxisAlignItems = "CENTER";
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildSliderComponent(
  inputs: ComponentsInputs,
  orientation: SliderOrientation,
  value: SliderValue,
  disabled: SliderDisabled,
): Promise<ComponentNode> {
  const t = inputs.theme.light;
  const tw = inputs.tailwindColors;
  const horizontal = orientation === "horizontal";
  const length = horizontal ? TRACK_LENGTH : VERTICAL_LENGTH;

  const comp = figma.createComponent();
  comp.name = `Orientation=${orientation}, Value=${value}, Disabled=${disabled}`;
  // Absolute layout so the track, range, and thumb stack precisely.
  comp.layoutMode = "NONE";
  if (horizontal) {
    comp.resize(length, THUMB_SIZE);
  } else {
    comp.resize(THUMB_SIZE, length);
  }
  comp.fills = [];
  comp.clipsContent = false;

  const cross = THUMB_SIZE; // thumb dominates the cross axis
  const trackOffset = (cross - TRACK_THICKNESS) / 2;
  const filled = Math.max(0, (length * value) / 100);

  // Track — muted, full length, centred on the cross axis.
  const track = figma.createRectangle();
  track.name = "Track";
  if (horizontal) {
    track.resize(length, TRACK_THICKNESS);
    track.x = 0;
    track.y = trackOffset;
  } else {
    track.resize(TRACK_THICKNESS, length);
    track.x = trackOffset;
    track.y = 0;
  }
  track.cornerRadius = TRACK_THICKNESS / 2;
  bindFill(track, t.get("muted"));
  comp.appendChild(track);

  // Range — primary fill, from the start edge to value%. Vertical sliders
  // fill from the bottom up (radix-nova runs bottom-to-top).
  const range = figma.createRectangle();
  range.name = "Range";
  if (horizontal) {
    range.resize(filled, TRACK_THICKNESS);
    range.x = 0;
    range.y = trackOffset;
  } else {
    range.resize(TRACK_THICKNESS, filled);
    range.x = trackOffset;
    range.y = length - filled;
  }
  range.cornerRadius = TRACK_THICKNESS / 2;
  bindFill(range, t.get("primary"));
  comp.appendChild(range);

  // Thumb — circle, ring border on white fill (radix-nova: `border border-ring
  // bg-white`), centred on the range end.
  const thumb = figma.createEllipse();
  thumb.name = "Thumb";
  thumb.resize(THUMB_SIZE, THUMB_SIZE);
  if (horizontal) {
    thumb.x = Math.max(0, filled - THUMB_SIZE / 2);
    thumb.y = (cross - THUMB_SIZE) / 2;
  } else {
    thumb.x = (cross - THUMB_SIZE) / 2;
    thumb.y = Math.max(0, length - filled - THUMB_SIZE / 2);
  }
  bindFill(thumb, tw.get("white"));
  bindStrokeColor(thumb, t.get("ring"));
  thumb.strokeWeight = 1;
  thumb.effects = [
    {
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.1 },
      offset: { x: 0, y: 1 },
      radius: 2,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
      showShadowBehindNode: true,
    },
  ];
  comp.appendChild(thumb);

  if (disabled === "True") {
    comp.opacity = 0.5;
  }

  return applyEffectStyle(thumb, inputs.effectStyles?.idFor("Shadow/sm")).then(
    () => comp,
  );
}
