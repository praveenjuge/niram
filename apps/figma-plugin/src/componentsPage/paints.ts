// Lightweight paint primitives used across the Components page.

export function solidPaint(tone: number): SolidPaint {
  const v = Math.max(0, Math.min(1, tone));
  return { type: "SOLID", color: { r: v, g: v, b: v }, opacity: 1 };
}
