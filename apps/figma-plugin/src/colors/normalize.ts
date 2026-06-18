// Normalize OKLCH color values into a canonical string suitable for lookups.

// Normalize an OKLCH string the same way shadcn does: collapse whitespace,
// drop trailing zeros, percent → 0..1. The result is a key suitable for
// lookups against the Tailwind OKLCH map.
export function normalizeColorValue(value: string | undefined): string {
  if (!value) return "";
  const lower = value.trim().replace(/\s+/g, " ").toLowerCase();
  if (!lower.startsWith("oklch(") || !lower.endsWith(")")) {
    return lower;
  }
  const inner = lower.slice(6, -1).trim();
  const [color, alphaPart] = inner.split(/\s*\/\s*/);
  if (!color) return lower;
  const parts = color.split(/\s+/);
  if (parts.length < 3) return lower;
  const l = normalizeNumber(parts[0]!, true);
  const c = normalizeNumber(parts[1]!, false);
  const h = normalizeNumber(parts[2]!, false);
  if (alphaPart) {
    const a = normalizeNumber(alphaPart, true);
    return `oklch(${l} ${c} ${h} / ${a})`;
  }
  return `oklch(${l} ${c} ${h})`;
}

function normalizeNumber(input: string, percent: boolean): string {
  const trimmed = input.trim();
  let n: number;
  if (percent && trimmed.endsWith("%")) {
    n = parseFloat(trimmed) / 100;
  } else if (trimmed.endsWith("%")) {
    n = parseFloat(trimmed) / 100;
  } else {
    n = parseFloat(trimmed);
  }
  if (Number.isNaN(n)) return "";
  return Number(n.toFixed(12)).toString();
}
