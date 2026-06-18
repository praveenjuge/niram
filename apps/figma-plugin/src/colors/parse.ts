// OKLCH → sRGB conversion plus hex parsing, both producing Figma RGBA.
// Reference: https://bottosson.github.io/posts/oklab/

import type { Rgba } from "./types";

function oklchToOklab(
  L: number,
  C: number,
  hDeg: number,
): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  return [L, Math.cos(h) * C, Math.sin(h) * C];
}

function oklabToLinearSrgb(
  L: number,
  a: number,
  b: number,
): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function linearToSrgbChannel(c: number): number {
  if (c <= 0.0031308) return 12.92 * c;
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

// Parse "oklch(L C H[ / A])" into Figma RGBA. Returns null on failure.
export function parseOklch(value: string): Rgba | null {
  const match = value
    .trim()
    .toLowerCase()
    .match(/^oklch\(\s*([^)]+)\s*\)$/);
  if (!match) return null;
  const body = match[1]!;
  const [colorPart, alphaPart] = body.split(/\s*\/\s*/);
  const parts = colorPart!.trim().split(/\s+/);
  if (parts.length < 3) return null;

  const L = parseChannel(parts[0]!, true);
  const C = parseChannel(parts[1]!, false);
  const H = parseChannel(parts[2]!, false);
  if (L === null || C === null || H === null) return null;

  let alpha = 1;
  if (alphaPart) {
    const parsed = parseChannel(alphaPart, true);
    if (parsed === null) return null;
    alpha = clamp01(parsed);
  }

  const [la, aa, ba] = oklchToOklab(L, C, H);
  const [lr, lg, lb] = oklabToLinearSrgb(la, aa, ba);
  return {
    r: clamp01(linearToSrgbChannel(lr)),
    g: clamp01(linearToSrgbChannel(lg)),
    b: clamp01(linearToSrgbChannel(lb)),
    a: alpha,
  };
}

function parseChannel(input: string, percentToUnit: boolean): number | null {
  const trimmed = input.trim();
  let n: number;
  if (trimmed.endsWith("%")) {
    n = parseFloat(trimmed);
    if (Number.isNaN(n)) return null;
    return percentToUnit ? n / 100 : n / 100;
  }
  n = parseFloat(trimmed);
  return Number.isNaN(n) ? null : n;
}

// Parse "#RRGGBB" or "#RRGGBBAA" into Figma RGBA.
export function parseHex(hex: string): Rgba | null {
  const value = hex.trim().replace(/^#/, "");
  if (!/^([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) return null;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const a = value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

// Best-effort parser: hex, oklch, or null.
export function parseColor(value: string): Rgba | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith("#")) return parseHex(trimmed);
  if (trimmed.startsWith("oklch(")) return parseOklch(trimmed);
  return null;
}
