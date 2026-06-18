// Lightweight paint and effect primitives used across the Design System page.

import type { Rgba } from "../colors";

export function solidPaint(tone: number): SolidPaint {
  const v = Math.max(0, Math.min(1, tone));
  return { type: "SOLID", color: { r: v, g: v, b: v }, opacity: 1 };
}

export function solidPaintRgba(rgba: Rgba): SolidPaint {
  return {
    type: "SOLID",
    color: { r: rgba.r, g: rgba.g, b: rgba.b },
    opacity: rgba.a,
  };
}

export function dropShadow(
  x: number,
  y: number,
  radius: number,
  color: RGBA,
): DropShadowEffect {
  return {
    type: "DROP_SHADOW",
    color,
    offset: { x, y },
    radius,
    spread: 0,
    visible: true,
    blendMode: "NORMAL",
    showShadowBehindNode: true,
  };
}

export function innerShadow(
  x: number,
  y: number,
  radius: number,
  color: RGBA,
): InnerShadowEffect {
  return {
    type: "INNER_SHADOW",
    color,
    offset: { x, y },
    radius,
    spread: 0,
    visible: true,
    blendMode: "NORMAL",
  };
}
