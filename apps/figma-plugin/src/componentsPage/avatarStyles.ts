// Figma paint styles holding the bundled avatar photos.
//
// Figma has no "image variable" type — variables are only COLOR / FLOAT /
// STRING / BOOLEAN — so reusable image fills live as *paint styles* instead.
// We create one style per bundled photo ("Avatar/01" … "Avatar/NN"); the
// Avatar component then references them via setFillStyleIdAsync so a designer
// can swap any avatar to a different face from the styles picker.
//
// Idempotent: the Components page is rebuilt on every run, but paint styles are
// document-level. We reuse a style by name and refresh its paint in place
// rather than creating duplicates.

import { AVATAR_IMAGES } from "../data/avatars";

const STYLE_PREFIX = "Avatar/";

function styleName(index: number): string {
  // 1-based, zero-padded to two digits: Avatar/01 … Avatar/20.
  const n = index + 1;
  return STYLE_PREFIX + (n < 10 ? "0" + n : String(n));
}

// Decode each base64 photo to an image hash once per run. Figma deduplicates
// images by hash, so re-running is cheap and stable.
function imagePaintFor(base64: string): ImagePaint {
  const image = figma.createImage(figma.base64Decode(base64));
  return { type: "IMAGE", scaleMode: "FILL", imageHash: image.hash };
}

export type AvatarStyleMap = {
  // Style id for a given avatar slot, by 0-based index.
  idAt(index: number): string | undefined;
  // Total number of avatar styles available.
  readonly count: number;
};

// Ensures a paint style exists for every bundled avatar and returns a lookup
// from slot index to style id. Call once per Components page build.
export async function ensureAvatarStyles(): Promise<AvatarStyleMap> {
  const existing = await figma.getLocalPaintStylesAsync();
  const byName = new Map<string, PaintStyle>();
  for (const style of existing) {
    if (style.name.indexOf(STYLE_PREFIX) === 0) byName.set(style.name, style);
  }

  const ids: string[] = [];
  for (let i = 0; i < AVATAR_IMAGES.length; i++) {
    const base64 = AVATAR_IMAGES[i];
    if (!base64) continue;
    const name = styleName(i);

    let style = byName.get(name);
    if (!style) {
      style = figma.createPaintStyle();
      style.name = name;
    }
    style.paints = [imagePaintFor(base64)];
    ids.push(style.id);
  }

  return {
    idAt: (index: number) => ids[index],
    count: ids.length,
  };
}
