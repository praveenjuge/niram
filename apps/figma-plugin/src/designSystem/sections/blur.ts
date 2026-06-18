// Blur scale: layer blur + backdrop blur, each token published as a Figma
// effect style (Blur/* and Backdrop Blur/* — see src/effectStyles.ts). Tiles
// reference the matching style so editing the style (or the `blur/*` primitive
// the style's radius binds to) reflows every blurred node.

import { BLUR_BG_BASE64 } from "../../data/blurBackground";
import {
  BACKDROP_BLUR_STYLE_SPECS,
  BLUR_STYLE_SPECS,
  type BlurStyleSpec,
} from "../../effects";
import { applyEffectStyle } from "../../effectStyles";
import { applyFont } from "../../fonts";
import { bindEffectRadius, bindFill } from "../bindings";
import {
  createDesignSystemContext,
  type DesignSystemContext,
} from "../context";
import {
  createSectionFrame,
  createSubSection,
  createWrappingRow,
  sectionContentWidth,
} from "../layout";
import { solidPaintRgba } from "../paints";
import type { DesignSystemInputs } from "../types";
import { countDescendants, shortTokenName } from "../utils";

const TILE = 64; // compact stage size

export async function addBlurAndBackdrop(
  page: PageNode,
  inputs: DesignSystemInputs,
): Promise<number> {
  const ctx = createDesignSystemContext(inputs);
  const section = createSectionFrame("Blur & backdrop", undefined, ctx);

  // Decode the bundled background once and reuse the same image hash for
  // every tile. Figma deduplicates by hash, so this is safe across runs.
  const bgImage = figma.createImage(figma.base64Decode(BLUR_BG_BASE64));
  const bgPaint: ImagePaint = {
    type: "IMAGE",
    scaleMode: "FILL",
    imageHash: bgImage.hash,
  };

  await addLayerBlurGroup(section, inputs, ctx, bgPaint);
  await addBackdropBlurGroup(section, inputs, ctx, bgPaint);

  page.appendChild(section);
  return countDescendants(section);
}

// A left-to-right wrapping row sized to the section content width, so the
// tiles flow horizontally and wrap like the opacity scale.
function blurRow(group: FrameNode): FrameNode {
  const row = createWrappingRow(group, 12);
  row.resize(sectionContentWidth(), 1);
  return row;
}

// Layer blur blurs the node's own pixels. We render the bundled photo in each
// tile and apply the matching Blur/* style.
async function addLayerBlurGroup(
  section: FrameNode,
  inputs: DesignSystemInputs,
  ctx: DesignSystemContext,
  bgPaint: ImagePaint,
): Promise<void> {
  const row = blurRow(createSubSection(section, "Layer blur", ctx));

  for (const spec of BLUR_STYLE_SPECS) {
    const cell = blurCell();

    const tile = figma.createRectangle();
    tile.resize(TILE, TILE);
    tile.cornerRadius = 8;
    tile.fills = [bgPaint];
    tile.effects = [
      {
        type: "LAYER_BLUR",
        blurType: "NORMAL",
        radius: spec.radius,
        visible: true,
      },
    ];
    bindEffectRadius(tile, 0, inputs.primitives.get(`blur/${spec.tokenName}`));
    await applyEffectStyle(tile, inputs.effectStyles?.idFor(spec.name));

    cell.appendChild(tile);
    cell.appendChild(blurLabel(spec, ctx));
    row.appendChild(cell);
  }
}

// Backdrop blur dissolves whatever sits behind a translucent overlay. We stack
// a frosted overlay over the bundled photo and apply the Backdrop Blur/* style.
async function addBackdropBlurGroup(
  section: FrameNode,
  inputs: DesignSystemInputs,
  ctx: DesignSystemContext,
  bgPaint: ImagePaint,
): Promise<void> {
  const row = blurRow(createSubSection(section, "Backdrop blur", ctx));

  for (const spec of BACKDROP_BLUR_STYLE_SPECS) {
    const cell = blurCell();

    const stage = figma.createFrame();
    stage.resize(TILE, TILE);
    stage.cornerRadius = 8;
    stage.clipsContent = true; // blur should stay within the tile
    stage.fills = [bgPaint];

    const overlay = figma.createRectangle();
    overlay.resize(TILE - 16, TILE - 28);
    overlay.x = 8;
    overlay.y = 14;
    overlay.cornerRadius = 6;
    overlay.fills = [solidPaintRgba({ r: 1, g: 1, b: 1, a: 0.4 })];
    overlay.strokes = [solidPaintRgba({ r: 1, g: 1, b: 1, a: 0.5 })];
    overlay.strokeWeight = 1;
    overlay.effects = [
      {
        type: "BACKGROUND_BLUR",
        blurType: "NORMAL",
        radius: spec.radius,
        visible: true,
      },
    ];
    bindEffectRadius(
      overlay,
      0,
      inputs.primitives.get(`blur/${spec.tokenName}`),
    );
    await applyEffectStyle(overlay, inputs.effectStyles?.idFor(spec.name));
    stage.appendChild(overlay);

    cell.appendChild(stage);
    cell.appendChild(blurLabel(spec, ctx));
    row.appendChild(cell);
  }
}

function blurCell(): FrameNode {
  const cell = figma.createFrame();
  cell.layoutMode = "VERTICAL";
  cell.itemSpacing = 6;
  cell.counterAxisAlignItems = "CENTER";
  cell.fills = [];
  cell.primaryAxisSizingMode = "AUTO";
  cell.counterAxisSizingMode = "AUTO";
  return cell;
}

function blurLabel(spec: BlurStyleSpec, ctx: DesignSystemContext): TextNode {
  const label = figma.createText();
  label.characters = `${shortTokenName(spec.name)} · ${spec.radius}`;
  label.fontSize = 10;
  applyFont(label, "body", "Medium");
  bindFill(label, ctx.mutedForeground, 0.4);
  return label;
}
