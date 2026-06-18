// Layout helpers shared by the Components page sections.

import { solidPaint } from "./paints";
import { SECTION_WIDTH } from "./types";

// Standardised wrapper styling used by every component-set frame on the
// canvas (Button, Badge, Avatar, etc). Every set is pinned to the shared
// SECTION_WIDTH so the page reads as a tidy grid of equal-width cards;
// horizontal sets wrap their variants within that width.
export function styleComponentSet(componentSet: ComponentSetNode) {
  componentSet.strokes = [solidPaint(0.9)];
  componentSet.fills = [solidPaint(1)];
  componentSet.strokeWeight = 1;
  componentSet.paddingTop = 16;
  componentSet.paddingBottom = 16;
  componentSet.paddingLeft = 16;
  componentSet.paddingRight = 16;
  pinToSectionWidth(componentSet);
}

// Pin an auto-layout frame to the shared SECTION_WIDTH while letting it hug
// its content on the other axis. Horizontal frames wrap their children so the
// extra variants flow onto new rows instead of overflowing the fixed width.
function pinToSectionWidth(
  frame: ComponentSetNode | FrameNode,
  { wrap }: { wrap?: boolean } = {},
) {
  if (frame.layoutMode === "VERTICAL") {
    // Counter axis is the width here — fix it; let the height hug.
    frame.counterAxisSizingMode = "FIXED";
    frame.primaryAxisSizingMode = "AUTO";
    frame.resize(SECTION_WIDTH, frame.height || 1);
    // resize() pins both axes to FIXED; restore the hug on the height.
    frame.primaryAxisSizingMode = "AUTO";
    return;
  }

  // HORIZONTAL (or NONE): primary axis is the width — fix it; hug the height.
  if (wrap !== false) {
    frame.layoutWrap = "WRAP";
    frame.counterAxisSpacing = frame.itemSpacing;
  }
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "AUTO";
  frame.resize(SECTION_WIDTH, frame.height || 1);
  // resize() pins both axes to FIXED; restore the hug on the height.
  frame.counterAxisSizingMode = "AUTO";
}

// Wrap a single demo component (Card, Dialog, Table, …) in a SECTION_WIDTH
// card so the bare-component sections match the bordered, equal-width look of
// the component-set sections. The component sits inside at its natural size.
export function wrapInSectionCard(component: SceneNode): FrameNode {
  const card = figma.createFrame();
  card.name = component.name;
  card.layoutMode = "HORIZONTAL";
  card.itemSpacing = 16;
  card.strokes = [solidPaint(0.9)];
  card.fills = [solidPaint(1)];
  card.strokeWeight = 1;
  card.paddingTop = 16;
  card.paddingBottom = 16;
  card.paddingLeft = 16;
  card.paddingRight = 16;
  card.appendChild(component);
  pinToSectionWidth(card, { wrap: false });
  return card;
}
