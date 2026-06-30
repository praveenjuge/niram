// Attachment: a file or image attachment chip (shadcn's Attachment +
// AttachmentMedia / Content / Title / Description / Actions, new in the
// June 2026 chat components). Used for files and images in chat composers,
// message threads, and upload lists.
//
// Mirrors apps/v4/registry/new-york-v4/ui/attachment.tsx: a `rounded-xl border
// bg-card` row with a square media tile, a title + metadata description, and a
// trailing dismiss action. Two axes: `Media` (icon vs. image tile) crossed with
// the upload `State` (done / uploading / error), which recolours the border and
// media tile and swaps the metadata line.

import {
  addTintedSurface,
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";
import { collectByTypeAndName, defineTextProperty } from "../properties";

const ATTACHMENT_WIDTH = 260;

const ATTACHMENT_MEDIA = ["icon", "image"] as const;
type AttachmentMedia = (typeof ATTACHMENT_MEDIA)[number];

const ATTACHMENT_STATES = ["done", "uploading", "error"] as const;
type AttachmentState = (typeof ATTACHMENT_STATES)[number];

// Filename per media kind (editable via the `Title` text property).
const MEDIA_TITLE: Record<AttachmentMedia, string> = {
  icon: "document.pdf",
  image: "photo.jpg",
};

// Metadata line per state.
const STATE_DESCRIPTION: Record<AttachmentState, string> = {
  done: "240 KB",
  uploading: "Uploading...",
  error: "Upload failed",
};

export async function addAttachmentSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const media of ATTACHMENT_MEDIA) {
    for (const state of ATTACHMENT_STATES) {
      const comp = buildAttachmentComponent(inputs, media, state);
      page.appendChild(comp);
      components.push(comp);
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Attachment";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.layoutWrap = "WRAP";
  componentSet.counterAxisAlignItems = "MIN";
  componentSet.itemSpacing = 24;
  componentSet.counterAxisSpacing = 24;
  styleComponentSet(componentSet);

  defineTextProperty(
    componentSet,
    "Title",
    MEDIA_TITLE.icon,
    collectByTypeAndName(componentSet, "TEXT", "Title"),
  );

  return countDescendants(componentSet);
}

function buildAttachmentComponent(
  inputs: ComponentsInputs,
  media: AttachmentMedia,
  state: AttachmentState,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const isError = state === "error";

  const comp = figma.createComponent();
  comp.name = `Media=${media}, State=${state}`;
  comp.layoutMode = "HORIZONTAL";
  comp.counterAxisAlignItems = "CENTER";
  comp.resize(ATTACHMENT_WIDTH, 1);
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "AUTO";
  // `has-data-[slot=attachment-media]:p-2 gap-2`.
  comp.itemSpacing = 8;
  comp.paddingLeft = 8;
  comp.paddingRight = 8;
  comp.paddingTop = 8;
  comp.paddingBottom = 8;
  comp.cornerRadius = 12;
  bindCornerRadii(comp, p.get("radius/xl"));
  bindFill(comp, t.get("card"));
  // `border` → `data-[state=error]:border-destructive/30`. (Figma can't fade a
  // variable-bound stroke, so the error border uses the solid destructive
  // colour, which still reads clearly as an error.)
  bindStrokeColor(comp, isError ? t.get("destructive") : t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  comp.appendChild(buildMedia(inputs, media, state));

  // Content (title + metadata). Grows to fill the row (`flex-1`).
  const content = figma.createFrame();
  content.name = "Content";
  content.layoutMode = "VERTICAL";
  content.primaryAxisSizingMode = "AUTO";
  content.counterAxisSizingMode = "AUTO";
  content.itemSpacing = 2;
  content.fills = [];
  content.strokes = [];

  const title = figma.createText();
  applyFont(title, "body", "Medium");
  title.name = "Title";
  title.characters = MEDIA_TITLE[media];
  title.fontSize = 14;
  bindFontSize(title, p.get("font/size/sm"));
  bindFill(title, t.get("card-foreground"));
  content.appendChild(title);

  const description = figma.createText();
  applyFont(description, "body", "Regular");
  description.name = "Description";
  description.characters = STATE_DESCRIPTION[state];
  description.fontSize = 12;
  bindFontSize(description, p.get("font/size/xs"));
  bindFill(
    description,
    isError ? t.get("destructive") : t.get("muted-foreground"),
  );
  content.appendChild(description);

  comp.appendChild(content);
  try {
    (content as unknown as { layoutGrow: number }).layoutGrow = 1;
  } catch {
    // Keep intrinsic width when the host rejects grow.
  }

  // Trailing dismiss action (a ghost `x`).
  const action = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "close",
    size: 16,
    color: t.get("muted-foreground"),
  });
  if (action) {
    action.name = "Action";
    comp.appendChild(action);
  }

  return comp;
}

// The square media tile (`aspect-square w-10 rounded-lg bg-muted`). The icon
// kind shows a file glyph; the image kind is a blank thumbnail. The error state
// tints the tile with the destructive colour.
function buildMedia(
  inputs: ComponentsInputs,
  media: AttachmentMedia,
  state: AttachmentState,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const isError = state === "error";

  const tile = figma.createFrame();
  tile.name = "Media";
  tile.layoutMode = "HORIZONTAL";
  tile.primaryAxisSizingMode = "FIXED";
  tile.counterAxisSizingMode = "FIXED";
  tile.primaryAxisAlignItems = "CENTER";
  tile.counterAxisAlignItems = "CENTER";
  tile.resize(40, 40);
  tile.cornerRadius = 8;
  bindCornerRadii(tile, p.get("radius/lg"));
  if (isError) {
    // A 10% destructive wash drawn as a faded layer (Figma ignores paint
    // opacity on a variable-bound fill).
    tile.fills = [];
    addTintedSurface(tile, t.get("destructive"), 0.1, p.get("radius/lg"));
  } else {
    bindFill(tile, t.get("muted"));
  }
  tile.strokes = [];
  tile.clipsContent = true;

  // The icon kind carries a file glyph; the image kind stays a blank tile (a
  // photo thumbnail stand-in, since the manifest forbids network images).
  if (media === "icon") {
    const glyph = createIcon({
      library: resolveIconLibrary(inputs.presetSummary),
      name: "folder",
      size: 16,
      color: isError ? t.get("destructive") : t.get("foreground"),
    });
    if (glyph) {
      glyph.name = "Glyph";
      tile.appendChild(glyph);
    }
  }

  return tile;
}
