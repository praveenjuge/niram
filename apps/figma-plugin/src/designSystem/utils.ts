// Misc helpers shared by the Design System page.

import { loadPresetFonts, weightStyleName } from "../fonts";
import type { DesignSystemInputs } from "./types";

// Re-exported from fonts.ts (the shared source of truth) so existing imports
// from this module keep working.
export { weightStyleName };

export function summarizePreset(
  summary: Record<string, string | undefined> | undefined,
): string {
  if (!summary) return "";
  const parts: string[] = [];
  for (const key of [
    "style",
    "baseColor",
    "theme",
    "font",
    "fontHeading",
    "radius",
  ] as const) {
    const value = summary[key];
    if (value) parts.push(`${key}: ${value}`);
  }
  return parts.join(" · ");
}

// Load the preset fonts for the Design System page and activate them. Falls
// back to Inter when the inputs don't carry preset fonts (older callers/tests).
export async function loadDesignSystemFonts(
  inputs: DesignSystemInputs,
): Promise<void> {
  const body = inputs.fonts ? inputs.fonts.body : "Inter";
  const heading = inputs.fonts ? inputs.fonts.heading : "Inter";
  await loadPresetFonts({ body, heading, fontVars: inputs.fontVars });
}

// Loads the Inter weights the typography showcase relies on. Kept for hosts
// that want the fallback family available even when the preset uses another
// font; loadDesignSystemFonts already loads Inter as a fallback.
export async function loadCommonFonts(): Promise<void> {
  const fonts: FontName[] = [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Medium" },
    { family: "Inter", style: "Semi Bold" },
    { family: "Inter", style: "Bold" },
  ];
  // Inter weights used in the typography showcase. Failures are non-fatal —
  // the Figma host may substitute a fallback font with no visible impact.
  const optional: FontName[] = [
    { family: "Inter", style: "Thin" },
    { family: "Inter", style: "Extra Light" },
    { family: "Inter", style: "Light" },
    { family: "Inter", style: "Extra Bold" },
    { family: "Inter", style: "Black" },
  ];
  await Promise.all(fonts.map((font) => figma.loadFontAsync(font)));
  await Promise.allSettled(optional.map((font) => figma.loadFontAsync(font)));
}

export function countDescendants(node: SceneNode): number {
  let count = 1;
  if ("children" in node) {
    for (const child of node.children) count += countDescendants(child);
  }
  return count;
}

// Strip the group prefix from a slash-namespaced style/token name so tiles can
// show a compact label (e.g. "Shadow/sm" → "sm", "Backdrop Blur/xl" → "xl").
export function shortTokenName(name: string): string {
  const slash = name.lastIndexOf("/");
  return slash >= 0 ? name.slice(slash + 1) : name;
}
