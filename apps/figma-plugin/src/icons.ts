// Shared icon rendering used by both the Design System icon showcase and the
// components that embed icons (Button, Alert). It resolves the preset's
// selected icon library, turns curated SVG markup (bundled in src/data/icons.ts)
// into Figma geometry via figma.createNodeFromSvg, and recolors that geometry to
// a theme colour variable so icons follow the active theme.
//
// Sandbox-safe: no DOM, no network. Lives next to code.ts's other imports.
//
// Icon names differ between the five libraries (lucide / hugeicons / tabler /
// phosphor / remixicon), so components ask for a *semantic* icon (e.g. "info",
// "warning") and we pick the first candidate name that exists in the active
// library. The candidate lists below are verified to resolve in every library.

import { ICON_LIBRARIES, type IconLibraryName } from "./data/icons";

// createNodeFromSvg returns a wrapper FRAME holding the geometry as vector/shape
// leaves and resolves `currentColor` to a literal black paint. Container nodes
// (the wrapper frame, nested <g> groups) carry a background fill that would
// paint a solid square over the icon, so we clear it; shape leaves carry the
// real icon paint (stroke for stroke-based libraries, fill for fill-based ones)
// which we rebind to the target colour variable.
const CONTAINER_TYPES: Record<string, true> = {
  FRAME: true,
  GROUP: true,
  COMPONENT: true,
  INSTANCE: true,
  SECTION: true,
};

// Semantic icon name -> ordered candidate names. The first candidate present in
// the active library wins. Verified to resolve across all five libraries.
const SEMANTIC_ICONS = {
  info: ["info", "information-circle", "info-circle", "information-line"],
  warning: [
    "circle-alert",
    "alert-circle",
    "warning-circle",
    "error-warning-line",
    "alert-02",
  ],
  success: [
    "circle-check",
    "check-circle",
    "checkmark-circle-02",
    "checkbox-circle-line",
  ],
  check: ["check", "check-line", "checkmark-circle-02"],
  "arrow-right": ["arrow-right", "arrow-right-line", "arrow-right-01"],
  "chevron-right": [
    "chevron-right",
    "caret-right",
    "arrow-right-s-line",
    "arrow-right-01",
  ],
  "chevron-down": [
    "chevron-down",
    "caret-down",
    "arrow-down-s-line",
    "arrow-down-01",
  ],
  plus: ["plus", "plus-sign", "add-line", "add-circle-line"],
  search: [
    "search",
    "search-01",
    "search-line",
    "magnifying-glass",
    "magnifier",
  ],
  folder: ["folder", "folder-line", "folder-01"],
  star: ["star", "star-line"],
  bell: ["bell", "bell-line", "notification-02"],
  close: ["x", "close-line", "cancel-01", "multiplication-sign"],
  command: ["command", "command-line"],
  // Text-formatting glyphs used by the Toggle / Toggle Group components.
  // Verified to resolve across all five libraries (lucide/tabler/remixicon
  // expose them bare; hugeicons/phosphor prefix them with `text-`).
  bold: ["bold", "text-bold", "text-b"],
  italic: ["italic", "text-italic"],
  underline: ["underline", "text-underline"],
} as const;

export type SemanticIconName = keyof typeof SEMANTIC_ICONS;

// A lookup of the Design System icon component set's variants, keyed by the
// library-specific icon name (the part after the `Icon=` variant property).
// Components reuse this so a toggle/alert/button icon is a real instance of the
// published icon component — swappable from Figma's instance menu and kept in
// sync with the icon set — instead of a one-off baked vector.
export type IconComponentMap = Map<string, ComponentNode>;

// The native size of the bundled markup; createNodeFromSvg yields a 24×24 frame.
const NATIVE_ICON_SIZE = 24;

function bindPaintColor(variable: Variable): SolidPaint {
  const base: SolidPaint = {
    type: "SOLID",
    color: { r: 0.5, g: 0.5, b: 0.5 },
    opacity: 1,
  };
  return figma.variables.setBoundVariableForPaint(
    base,
    "color",
    variable,
  ) as SolidPaint;
}

// Recolor every shape leaf in an icon node to `variable` and clear container
// background fills. Shared with the Design System icon showcase so both stay in
// sync. When `variable` is undefined the node is left at its rendered colour
// (black) — callers should always pass a theme variable.
export function recolorIcon(
  node: SceneNode,
  variable: Variable | undefined,
): void {
  if (CONTAINER_TYPES[node.type]) {
    const withFills = node as SceneNode & { fills?: unknown };
    if ("fills" in node && withFills.fills !== figma.mixed) {
      (node as unknown as { fills: Paint[] }).fills = [];
    }
  } else if (variable) {
    const withFills = node as SceneNode & {
      fills?: ReadonlyArray<Paint> | typeof figma.mixed;
    };
    if (Array.isArray(withFills.fills) && withFills.fills.length > 0) {
      (node as unknown as { fills: Paint[] }).fills = [
        bindPaintColor(variable),
      ];
    }

    const withStrokes = node as SceneNode & { strokes?: ReadonlyArray<Paint> };
    if (Array.isArray(withStrokes.strokes) && withStrokes.strokes.length > 0) {
      (node as unknown as { strokes: Paint[] }).strokes = [
        bindPaintColor(variable),
      ];
    }
  }

  if ("children" in node) {
    for (const child of (node as ChildrenMixin).children as SceneNode[]) {
      recolorIcon(child, variable);
    }
  }
}

export function resolveIconLibrary(
  presetSummary: Record<string, string | undefined> | undefined,
): IconLibraryName {
  const value = presetSummary ? presetSummary["iconLibrary"] : undefined;
  if (value !== undefined && value in ICON_LIBRARIES) {
    return value as IconLibraryName;
  }
  // shadcn defaults to lucide.
  return "lucide";
}

// Walk a built page (or any node tree) and collect every icon component the
// Design System icon showcase published, keyed by its library-specific name
// (the `Icon=<name>` variant property). The Components page reuses this map so
// component icons are instances of the published set. Decoupled from the
// builder so it stays robust to layout changes — it just looks for the
// `Icon=`-named components wherever they live.
export function collectIconComponents(root: SceneNode): IconComponentMap {
  const ICON_PREFIX = "Icon=";
  const map: IconComponentMap = new Map();

  function visit(node: SceneNode): void {
    if (node.type === "COMPONENT" && node.name.indexOf(ICON_PREFIX) === 0) {
      map.set(node.name.slice(ICON_PREFIX.length), node as ComponentNode);
    }
    if ("children" in node) {
      for (const child of (node as ChildrenMixin).children as SceneNode[]) {
        visit(child);
      }
    }
  }

  visit(root);
  return map;
}

function findIconInner(
  library: IconLibraryName,
  name: SemanticIconName,
): string | undefined {
  const icons = ICON_LIBRARIES[library].icons;
  for (const candidate of SEMANTIC_ICONS[name]) {
    const inner = icons[candidate];
    if (inner !== undefined) return inner;
  }
  return undefined;
}

// Resolve the library-specific icon name (the value used as the `Icon=` variant
// property in the Design System icon set) for a semantic icon. Mirrors
// findIconInner's candidate order so the chosen name and markup always agree.
// Returns undefined when no candidate exists in the active library.
export function resolveIconName(
  library: IconLibraryName,
  name: SemanticIconName,
): string | undefined {
  const icons = ICON_LIBRARIES[library].icons;
  for (const candidate of SEMANTIC_ICONS[name]) {
    if (icons[candidate] !== undefined) return candidate;
  }
  return undefined;
}

export type CreateIconOptions = {
  // Which icon library to draw from (use resolveIconLibrary on the preset).
  library: IconLibraryName;
  // Semantic icon to render.
  name: SemanticIconName;
  // Target square size in px (geometry is scaled from the native 24px).
  size: number;
  // Theme colour variable the icon should follow.
  color: Variable | undefined;
};

// Render a semantic icon as a Figma node recolored to `color` and scaled to
// `size`. Returns undefined when the active library has no candidate for the
// requested icon (callers fall back to their previous placeholder).
export function createIcon(options: CreateIconOptions): SceneNode | undefined {
  const inner = findIconInner(options.library, options.name);
  if (inner === undefined) return undefined;

  const svgOpen = ICON_LIBRARIES[options.library].svgOpen;
  const node = figma.createNodeFromSvg(`${svgOpen}${inner}</svg>`);
  node.name = "icon";
  recolorIcon(node, options.color);

  // createNodeFromSvg yields a 24×24 frame; rescale scales the geometry too
  // (plain resize would not). Guard the call so the Node-side test mock, which
  // doesn't implement rescale, simply keeps the 24px node.
  if (options.size !== NATIVE_ICON_SIZE && typeof node.rescale === "function") {
    node.rescale(options.size / NATIVE_ICON_SIZE);
  }

  return node;
}

export type CreateNamedIconOptions = {
  // Which icon library to draw from (use resolveIconLibrary on the preset).
  library: IconLibraryName;
  // One or more exact, library-specific icon names (e.g. lucide's
  // "square-terminal"). Unlike createIcon's semantic names this is a direct
  // lookup, but a candidate list is supported so callers can name the same
  // glyph across libraries (e.g. ["chevron-right", "caret-right",
  // "arrow-right-s-line"]) — the first name present in the active library wins.
  // Used by the Sidebar blocks, which mirror shadcn's many lucide-specific
  // glyphs while still rendering in whatever library the preset selected.
  name: string | readonly string[];
  // Target square size in px (geometry is scaled from the native 24px).
  size: number;
  // Theme colour variable the icon should follow.
  color: Variable | undefined;
};

// Render a *named* (library-specific) icon as a Figma node recolored to `color`
// and scaled to `size`. Returns undefined when the active library has no icon
// matching any candidate name (callers fall back to a placeholder). Mirrors
// createIcon but bypasses the small semantic lookup table so blocks can reach
// the full curated icon subset by name.
export function createNamedIcon(
  options: CreateNamedIconOptions,
): SceneNode | undefined {
  const library = ICON_LIBRARIES[options.library];
  const candidates =
    typeof options.name === "string" ? [options.name] : options.name;

  let inner: string | undefined;
  for (const candidate of candidates) {
    const found = library.icons[candidate];
    if (found !== undefined) {
      inner = found;
      break;
    }
  }
  if (inner === undefined) return undefined;

  const node = figma.createNodeFromSvg(`${library.svgOpen}${inner}</svg>`);
  node.name = "icon";
  recolorIcon(node, options.color);

  if (options.size !== NATIVE_ICON_SIZE && typeof node.rescale === "function") {
    node.rescale(options.size / NATIVE_ICON_SIZE);
  }

  return node;
}

export type InstantiateIconOptions = {
  // The Design System icon component set's variants, keyed by library-specific
  // icon name (see buildDesignSystem's result).
  icons: IconComponentMap;
  // Which icon library the preset selected (use resolveIconLibrary).
  library: IconLibraryName;
  // Semantic icon to render.
  name: SemanticIconName;
  // Target square size in px (the 24px instance is rescaled to match).
  size: number;
};

// Create an *instance* of the published Design System icon component for a
// semantic icon, so the embedding component (e.g. Toggle) shares the same
// swappable icon as the icon showcase. The instance inherits the variant's
// theme-bound paint (foreground), so no recolor is needed. Returns undefined
// when the active library has no candidate or the icon set wasn't published
// (callers fall back to their previous placeholder).
export function instantiateIcon(
  options: InstantiateIconOptions,
): InstanceNode | undefined {
  const iconName = resolveIconName(options.library, options.name);
  if (iconName === undefined) return undefined;

  const component = options.icons.get(iconName);
  if (component === undefined) return undefined;
  if (typeof component.createInstance !== "function") return undefined;

  const instance = component.createInstance();
  instance.name = "Icon";

  // The icon set's components are the native 24px; rescale scales the cloned
  // geometry too (plain resize would not). Guard the call so the Node-side
  // test mock, which doesn't implement rescale, keeps the 24px instance.
  if (
    options.size !== NATIVE_ICON_SIZE &&
    typeof instance.rescale === "function"
  ) {
    instance.rescale(options.size / NATIVE_ICON_SIZE);
  }

  return instance;
}
