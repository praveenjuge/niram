// Shared font handling for the page builders.
//
// shadcn presets carry two fonts — a body font (`--font-sans`) and a heading
// font (`--font-heading`, which falls back to the body font when left as
// "inherit"). The generator writes both as STRING variables in the
// `shadcn / Theme` collection (see generator/theme.ts). This module loads those
// families in Figma and applies them to text nodes, binding each node's
// `fontFamily` to the matching variable so the page stays linked to the preset.
//
// Sandbox-safe: only touches `figma.*` (no DOM, no network) and stays within
// the ES2017 target. State is a single module-level "active" context set at the
// start of each page build, so section builders don't have to thread it around.

import type { ThemeFontVars } from "./generator";

export type FontRole = "body" | "heading";

// Weights we try to load for every family so weight-aware text (the typography
// showcase) renders real glyphs instead of synthetic faux-bolding. Loads are
// best-effort: a family that lacks a weight just isn't recorded, and pickFont
// falls back.
const FONT_STYLES = [
  "Thin",
  "Extra Light",
  "Light",
  "Regular",
  "Medium",
  "Semi Bold",
  "Bold",
  "Extra Bold",
  "Black",
] as const;

// Inter ships with Figma, so it is always a safe fallback.
export const FALLBACK_FAMILY = "Inter";

// Figma's per-glyph substitution chain. When a text node carries a character
// the bound family can't render (e.g. a "✕", "⌘", or even a stray "•" in a
// preset font with sparse coverage), Figma silently renders that glyph from one
// of these Noto fallbacks. The node's `fontName` still reads as the preset
// family, but a re-run's `setValueForMode` on the bound `font-sans` variable
// re-validates *every* face the node actually uses — and throws if a
// substituted Noto face was never loaded. Component/block builders already
// prefer vectors/icons over symbol glyphs, but presets vary, so we also load
// these best-effort as a safety net before writing the font variable. Missing
// families simply don't load (loadFontFamilies swallows the rejection).
export const FALLBACK_GLYPH_FAMILIES = [
  "Noto Sans",
  "Noto Sans Symbols",
  "Noto Sans Symbols2",
] as const;

function styleKey(family: string, style: string): string {
  return family + "\u0000" + style;
}

// Session-level memo of faces a previous load already confirmed. The generate
// flow used to run five separate font passes per run (theme validation, text
// styles, then one per region builder), each re-attempting every family ×
// weight through the host. Faces don't unload mid-session, so a confirmed pair
// is skipped on every later pass and simply folded into the returned set.
const loadedFaces = new Set<string>();

// Memoized `listAvailableFontsAsync`. The host-wide enumeration is one of the
// slower plugin calls and its result doesn't change while the plugin is open,
// so one promise serves every pass in the session.
let availableFonts: Promise<Array<{ fontName: FontName }>> | null = null;

function listAvailableFontsOnce(): Promise<Array<{ fontName: FontName }>> {
  if (!availableFonts) {
    const lister = (
      figma as unknown as {
        listAvailableFontsAsync?: () => Promise<Array<{ fontName: FontName }>>;
      }
    ).listAvailableFontsAsync;
    if (typeof lister !== "function") {
      // Host can't enumerate (older hosts / the test mock) — cache an empty
      // list so callers fall back to the fixed weight list without retrying.
      availableFonts = Promise.resolve([]);
      return availableFonts;
    }
    availableFonts = lister.call(figma).catch(() => []);
  }
  return availableFonts;
}

// Test/session hook: forget every cached face and the font enumeration so a
// fresh mock (or a freshly reloaded plugin) starts clean.
export function resetLoadedFontsCache(): void {
  loadedFaces.clear();
  availableFonts = null;
}

// Maps a numeric font weight (100–900) to the Figma/Inter named style. Lives
// here (alongside the rest of the font handling) so both the page builders and
// the text-style generator can share one source of truth. `designSystem/utils`
// re-exports it for the existing call sites.
export function weightStyleName(weight: number): string {
  // Inter ships these named styles; mirror them where possible.
  switch (weight) {
    case 100:
      return "Thin";
    case 200:
      return "Extra Light";
    case 300:
      return "Light";
    case 400:
      return "Regular";
    case 500:
      return "Medium";
    case 600:
      return "Semi Bold";
    case 700:
      return "Bold";
    case 800:
      return "Extra Bold";
    case 900:
      return "Black";
    default:
      return "Regular";
  }
}

export type FontContext = {
  body: string;
  heading: string;
  bodyVar: Variable | undefined;
  headingVar: Variable | undefined;
  // Set of "family\u0000style" pairs that actually loaded on this host.
  loaded: Set<string>;
};

let active: FontContext | null = null;

export function setActiveFonts(context: FontContext): void {
  active = context;
}

// Test/Figma-host hook: clear the active context (used so unit tests don't leak
// a context between page builds).
export function resetActiveFonts(): void {
  active = null;
}

export type LoadFontsOptions = {
  body: string;
  heading: string;
  fontVars?: ThemeFontVars;
};

// Load every weight of the given families, returning the set of
// "family\u0000style" pairs that actually loaded on this host. Loads are
// best-effort: a missing family/weight is simply absent from the result.
//
// Each family loads both its *actual* installed style names (via
// `listAvailableFontsAsync`) and the standard weight names Niram assigns to
// text. A font's real style names vary — Geist exposes "SemiBold" where our
// standard list says "Semi Bold" — but Figma's enumeration can also omit a
// face already used by an existing variable-bound node. Loading the union means
// exact faces such as Playfair Display Medium are attempted and awaited before
// a later `setValueForMode` re-validates the old document. Missing guesses are
// best-effort and reject harmlessly.
export async function loadFontFamilies(
  families: string[],
): Promise<Set<string>> {
  const loaded = new Set<string>();

  const unique: string[] = [];
  for (const family of families) {
    if (family && unique.indexOf(family) === -1) unique.push(family);
  }

  const available = await listAvailableFontsOnce();
  const wanted = new Set(unique);
  const stylesByFamily = new Map<string, string[]>();
  for (const entry of available) {
    const family = entry.fontName.family;
    if (!wanted.has(family)) continue;
    const list = stylesByFamily.get(family);
    if (list) {
      if (list.indexOf(entry.fontName.style) === -1) {
        list.push(entry.fontName.style);
      }
    } else {
      stylesByFamily.set(family, [entry.fontName.style]);
    }
  }

  const attempts: Promise<void>[] = [];
  for (const family of unique) {
    const actual = stylesByFamily.get(family);
    const styleList: string[] = actual ? [...actual] : [];
    for (const style of FONT_STYLES) {
      if (styleList.indexOf(style) === -1) styleList.push(style);
    }
    for (const style of styleList) {
      const key = styleKey(family, style);
      // A face confirmed in an earlier pass is already loaded in the host —
      // skip the round trip and carry it into this call's result.
      if (loadedFaces.has(key)) {
        loaded.add(key);
        continue;
      }
      attempts.push(
        figma.loadFontAsync({ family, style }).then(
          function () {
            loadedFaces.add(key);
            loaded.add(key);
          },
          function () {
            // Family/weight unavailable on this host — skip; pickFont falls back.
          },
        ),
      );
    }
  }
  await Promise.all(attempts);
  return loaded;
}

// Load the preset fonts (plus the Inter fallback) across all weights and make
// the resulting context active. Returns the context so callers can hold onto it
// if they want to pass it explicitly.
export async function loadPresetFonts(
  options: LoadFontsOptions,
): Promise<FontContext> {
  const loaded = await loadFontFamilies([
    options.body,
    options.heading,
    FALLBACK_FAMILY,
  ]);

  const context: FontContext = {
    body: options.body,
    heading: options.heading,
    bodyVar: options.fontVars ? options.fontVars.body : undefined,
    headingVar: options.fontVars ? options.fontVars.heading : undefined,
    loaded,
  };
  active = context;
  return context;
}

export type PickedFont = { fontName: FontName; bindable: boolean };

// Choose the closest loaded font for a requested family/style. `bindable` is
// true only when the chosen family is the requested preset family, so callers
// know it is safe to bind the node's fontFamily to the preset variable (binding
// to an unloaded family would break setting characters).
export function pickFont(
  context: FontContext,
  family: string,
  style: string,
): PickedFont {
  if (context.loaded.has(styleKey(family, style))) {
    return { fontName: { family, style }, bindable: true };
  }
  // Family is present but not in this weight — keep the family, drop to Regular.
  if (context.loaded.has(styleKey(family, "Regular"))) {
    return { fontName: { family, style: "Regular" }, bindable: true };
  }
  // Family unavailable — fall back to Inter, preserving the weight if we can.
  const fallbackStyle = context.loaded.has(styleKey(FALLBACK_FAMILY, style))
    ? style
    : "Regular";
  return {
    fontName: { family: FALLBACK_FAMILY, style: fallbackStyle },
    bindable: family === FALLBACK_FAMILY,
  };
}

// Apply the preset's body or heading font to a text node and bind its
// fontFamily to the matching theme variable. Must run before the node's
// `characters` are set (Figma requires the active font to be loaded).
export function applyFont(
  node: TextNode,
  role: FontRole,
  style: string = "Regular",
  context: FontContext | null = active,
): void {
  if (!context) {
    // No active context (e.g. a unit test exercising a builder in isolation).
    // Best-effort: use Inter and skip binding.
    node.fontName = { family: FALLBACK_FAMILY, style };
    return;
  }

  const family = role === "heading" ? context.heading : context.body;
  const picked = pickFont(context, family, style);
  node.fontName = picked.fontName;

  const variable = role === "heading" ? context.headingVar : context.bodyVar;
  if (picked.bindable && variable) {
    try {
      node.setBoundVariable("fontFamily", variable);
    } catch {
      // Some hosts/types reject the binding — leave the literal font in place.
    }
  }
}

// Return the currently active font context (set by loadPresetFonts). The
// text-style generator reads it so its styles use the preset's body font and
// bind to the matching theme variable, exactly like applyFont does for nodes.
export function getActiveFonts(): FontContext | null {
  return active;
}

// Resolve the body font for a requested weight against the active (or given)
// context, returning the chosen FontName plus the theme variable it is safe to
// bind. Mirrors applyFont's resolution so text styles and text nodes stay in
// sync. Falls back to Inter when no context is active.
export function resolveBodyFont(
  style: string,
  context: FontContext | null = active,
): { fontName: FontName; familyVar: Variable | undefined } {
  if (!context) {
    return {
      fontName: { family: FALLBACK_FAMILY, style },
      familyVar: undefined,
    };
  }
  const picked = pickFont(context, context.body, style);
  return {
    fontName: picked.fontName,
    familyVar: picked.bindable ? context.bodyVar : undefined,
  };
}
