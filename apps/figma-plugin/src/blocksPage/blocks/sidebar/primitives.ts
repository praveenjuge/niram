// Shared sidebar primitives, mirroring shadcn's radix-nova `ui/sidebar.tsx`.
//
// Every Sidebar block variant is assembled from these so each rail reads as the
// real shadcn Sidebar composition (SidebarHeader / SidebarContent of
// SidebarGroups / SidebarFooter, built from SidebarMenuButton, SidebarMenuSub,
// SidebarGroupLabel, the SidebarInput search field, etc.). All surfaces bind to
// the active preset's `--sidebar-*` theme variables and the Tailwind primitive
// tokens, exactly like the Components page and the other blocks.
//
// radix-nova reference metrics used below:
//   Sidebar          flex flex-col bg-sidebar text-sidebar-foreground, border-r
//   --sidebar-width      16rem (256)   --sidebar-width-icon  3rem (48)
//   SidebarHeader/Footer flex flex-col gap-2 p-2
//   SidebarContent       flex flex-col gap-0 flex-1
//   SidebarGroup         flex flex-col p-2
//   SidebarGroupLabel    h-8 px-2 text-xs font-medium text-sidebar-foreground/70
//   SidebarMenu          flex flex-col gap-0
//   SidebarMenuButton    h-8 gap-2 rounded-md p-2 text-sm  (lg: h-12, sm: h-7)
//     data-active          bg-sidebar-accent font-medium text-sidebar-accent-fg
//   SidebarMenuSub       ml-3.5 border-l border-sidebar-border px-2.5 py-0.5 gap-1
//   SidebarMenuSubButton h-7 px-2 gap-2 rounded-md text-sidebar-foreground

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../../../componentsPage/bindings";
import { applyFont } from "../../../fonts";
import { createNamedIcon, resolveIconLibrary } from "../../../icons";
import { createConfiguredSlot } from "../../../componentsPage/properties";
import type { IconLibraryName } from "../../../data/icons";
import type { BlocksInputs } from "../../types";

// The user-requested fixed sidebar height (a full desktop screen).
export const SIDEBAR_HEIGHT = 982;
export const SIDEBAR_WIDTH = 256; // `--sidebar-width: 16rem`
export const SIDEBAR_WIDTH_ICON = 48; // `--sidebar-width-icon: 3rem`

// Resolve a `--sidebar-*` token, falling back to a neutral equivalent so
// presets without sidebar variables still render sensibly.
function sidebarVar(
  t: Map<string, Variable>,
  key: string,
  fallback: string,
): Variable | undefined {
  return t.get(key) ?? t.get(fallback);
}

export function iconLibrary(inputs: BlocksInputs): IconLibraryName {
  return resolveIconLibrary(inputs.presetSummary);
}

// Cross-library candidate lists for the glyphs the Sidebar blocks use. Keyed by
// the lucide name we reference in data.ts / variants.ts; each value lists the
// equivalent names across the five bundled libraries (lucide / hugeicons /
// tabler / phosphor / remixicon) so a non-lucide preset still renders the icon
// instead of dropping it (the bug behind the missing chevron/caret glyphs).
// createNamedIcon picks the first candidate present in the active library.
const ICON_CANDIDATES: Record<string, readonly string[]> = {
  // Structural glyphs (the ones most often missing outside lucide).
  "chevron-right": [
    "chevron-right",
    "caret-right",
    "arrow-right-s-line",
    "arrow-right-01",
    "arrow-right",
  ],
  "chevron-down": [
    "chevron-down",
    "caret-down",
    "arrow-down-s-line",
    "arrow-down-01",
    "arrow-down",
  ],
  "chevron-left": [
    "chevron-left",
    "caret-left",
    "arrow-left-s-line",
    "arrow-left-01",
    "arrow-left",
  ],
  "chevrons-up-down": [
    "chevrons-up-down",
    "unfold-more",
    "selector",
    "caret-up-down",
    "arrow-up-down-line",
  ],
  "more-horizontal": [
    "more-horizontal",
    "more-horizontal-circle-01",
    "dots",
    "dots-three",
    "more-2-line",
    "more-line",
  ],
  "more-vertical": [
    "more-vertical",
    "more-vertical-circle-01",
    "dots-vertical",
    "dots-three-vertical",
    "more-2-line",
  ],
  plus: ["plus", "plus-sign", "circle-plus", "plus-circle", "add-line"],
  minus: ["minus", "minus-sign", "subtract-line"],
  check: ["check", "checkmark-badge-02", "tick-02", "check-line"],
  // Brand / leading glyphs.
  "gallery-vertical-end": [
    "gallery-vertical-end",
    "layout-bottom",
    "layout-rows",
    "rows",
    "gallery-line",
  ],
  command: ["command", "command-line"],
  "terminal-square": [
    "terminal-square",
    "computer-terminal-01",
    "terminal-2",
    "terminal",
    "terminal-box-line",
  ],
  bot: ["bot", "robotic", "robot", "robot-line"],
  "book-open": ["book-open", "book-open-02", "book", "book-open-line"],
  "settings-2": [
    "settings-2",
    "settings-05",
    "settings",
    "gear",
    "settings-line",
  ],
  settings: ["settings", "settings-01", "settings", "gear", "settings-line"],
  frame: [
    "frame",
    "dashboard-square-01",
    "frame",
    "squares-four",
    "layout-line",
  ],
  "pie-chart": [
    "pie-chart",
    "pie-chart",
    "chart-pie",
    "chart-pie",
    "pie-chart-line",
  ],
  map: ["map", "maps", "map", "map-trifold", "map-line"],
  "life-buoy": [
    "life-buoy",
    "help-circle",
    "lifebuoy",
    "lifebuoy",
    "lifebuoy-line",
  ],
  send: ["send", "sent", "send", "paper-plane-tilt", "send-plane-line"],
  inbox: ["inbox", "inbox", "inbox", "tray", "inbox-line"],
  file: ["file", "file-01", "file", "file", "file-line"],
  "file-text": [
    "file-text",
    "file-02",
    "file-text",
    "file-text",
    "file-text-line",
  ],
  "archive-x": [
    "archive-x",
    "archive-02",
    "archive-off",
    "archive",
    "archive-line",
  ],
  "trash-2": ["trash-2", "delete-02", "trash", "trash", "delete-bin-line"],
  search: ["search", "search-01", "search", "magnifying-glass", "search-line"],
  sparkles: ["sparkles", "sparkles", "sparkles", "sparkle", "sparkling-line"],
  home: ["home", "home-01", "home", "house", "home-line"],
  calendar: [
    "calendar",
    "calendar-03",
    "calendar",
    "calendar",
    "calendar-line",
  ],
  blocks: ["blocks", "grid", "layout-grid", "squares-four", "grid-line"],
  "message-circle-question": [
    "message-circle-question",
    "message-question",
    "message-question",
    "chat-circle",
    "question-line",
  ],
  "message-circle": [
    "message-circle",
    "message-01",
    "message",
    "chat-circle",
    "chat-1-line",
  ],
  folder: ["folder", "folder-01", "folder", "folder", "folder-line"],
  bell: ["bell", "notification-02", "bell", "bell", "bell-line"],
  menu: ["menu", "menu-01", "menu", "list", "menu-line"],
  paintbrush: [
    "paintbrush",
    "paint-board",
    "palette",
    "palette",
    "palette-line",
  ],
  globe: ["globe", "globe-02", "globe", "globe", "globe-line"],
  keyboard: ["keyboard", "keyboard", "keyboard", "keyboard", "keyboard-line"],
  video: ["video", "tv-01", "video-plus", "video", "video-line"],
  link: ["link", "link", "link", "link", "links-line"],
  lock: ["lock", "square-lock-02", "lock", "lock", "lock-line"],
};

// Resolve the cross-library candidate list for a sidebar icon name. Falls back
// to the bare name so any glyph that already matches the active library still
// resolves (and unknown names degrade to a single literal lookup).
export function iconCandidates(name: string): readonly string[] {
  return ICON_CANDIDATES[name] ?? [name];
}

// ----- Sidebar shell -------------------------------------------------------

export type SidebarVariantStyle = "sidebar" | "floating" | "inset";

// The root rail: a fixed `width × SIDEBAR_HEIGHT` `bg-sidebar` column. The
// `sidebar` variant carries the right border; `floating`/`inset` drop it (they
// float their own panel / inset).
export function createSidebarShell(
  inputs: BlocksInputs,
  name: string,
  opts: {
    width?: number;
    variant?: SidebarVariantStyle;
    side?: "left" | "right";
    border?: boolean;
  } = {},
): ComponentNode {
  const t = inputs.theme.light;
  const variant = opts.variant ?? "sidebar";
  const width = opts.width ?? SIDEBAR_WIDTH;

  const comp = figma.createComponent();
  comp.name = name;
  comp.layoutMode = "VERTICAL";
  comp.itemSpacing = 0;
  comp.resize(width, SIDEBAR_HEIGHT);
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.clipsContent = true;
  bindFill(comp, sidebarVar(t, "sidebar", "card"));
  comp.strokes = [];

  // `group-data-[side=left]:border-r` / `border-l` for the right side.
  const wantsBorder = opts.border ?? variant === "sidebar";
  if (wantsBorder) {
    bindStrokeColor(comp, sidebarVar(t, "sidebar-border", "border"));
    comp.strokeWeight = 1;
    comp.strokeAlign = "INSIDE";
    comp.strokeTopWeight = 0;
    comp.strokeBottomWeight = 0;
    if (opts.side === "right") {
      comp.strokeLeftWeight = 1;
      comp.strokeRightWeight = 0;
    } else {
      comp.strokeLeftWeight = 0;
      comp.strokeRightWeight = 1;
    }
  }

  // Floating panels round + ring + shadow; we approximate with rounded corners
  // and a full sidebar-border ring (`group-data-[variant=floating]:rounded-lg`).
  if (variant === "floating") {
    comp.cornerRadius = 8;
    bindCornerRadii(comp, inputs.primitives.get("radius/lg"));
    bindStrokeColor(comp, sidebarVar(t, "sidebar-border", "border"));
    comp.strokeWeight = 1;
    comp.strokeAlign = "INSIDE";
    comp.strokeTopWeight = 1;
    comp.strokeBottomWeight = 1;
    comp.strokeLeftWeight = 1;
    comp.strokeRightWeight = 1;
  }

  return comp;
}

// `SidebarHeader` / `SidebarFooter`: `flex flex-col gap-2 p-2`.
export function createHeader(name = "Header"): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "FIXED";
  frame.itemSpacing = 8;
  frame.paddingTop = 8;
  frame.paddingBottom = 8;
  frame.paddingLeft = 8;
  frame.paddingRight = 8;
  frame.fills = [];
  frame.strokes = [];
  return frame;
}

export const createFooter = (): FrameNode => createHeader("Footer");

// `SidebarContent`: `flex min-h-0 flex-1 flex-col gap-0 overflow-auto`.
export function createContent(): FrameNode {
  const frame = figma.createFrame();
  frame.name = "Content";
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";
  frame.itemSpacing = 0;
  frame.fills = [];
  frame.strokes = [];
  frame.clipsContent = true;
  return frame;
}

// `SidebarGroup`: `relative flex w-full min-w-0 flex-col p-2`.
export function createGroup(name = "Group"): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "FIXED";
  frame.itemSpacing = 0;
  frame.paddingTop = 8;
  frame.paddingBottom = 8;
  frame.paddingLeft = 8;
  frame.paddingRight = 8;
  frame.fills = [];
  frame.strokes = [];
  return frame;
}

// `SidebarGroupLabel`: `h-8 px-2 text-xs font-medium text-sidebar-foreground/70`.
export function createGroupLabel(
  inputs: BlocksInputs,
  text: string,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = "Group Label";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "FIXED";
  row.counterAxisAlignItems = "CENTER";
  row.resize(10, 32);
  row.paddingLeft = 8;
  row.paddingRight = 8;
  row.fills = [];
  row.strokes = [];

  const label = figma.createText();
  applyFont(label, "body", "Medium");
  label.characters = text;
  label.fontSize = 12;
  bindFontSize(label, p.get("font/size/xs"));
  bindFill(label, sidebarVar(t, "sidebar-foreground", "foreground"));
  label.opacity = 0.7;
  row.appendChild(label);

  return row;
}

// `SidebarMenu`: `flex w-full min-w-0 flex-col gap-0`. `gap` overridable for the
// few variants that set `gap-1`/`gap-2`.
export function createMenu(gap = 0): FrameNode {
  const frame = figma.createFrame();
  frame.name = "Menu";
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "FIXED";
  frame.itemSpacing = gap;
  frame.fills = [];
  frame.strokes = [];
  return frame;
}

export type MenuButtonOpts = {
  label: string;
  // A library-specific lucide icon name rendered at the leading edge (size-4).
  icon?: string;
  // An emoji rendered as a leading text glyph (the workspace / favorites rows).
  emoji?: string;
  active?: boolean;
  size?: "default" | "sm" | "lg";
  // A trailing lucide icon (chevron / chevrons-up-down / more-horizontal).
  trailingIcon?: string;
  // A trailing short text badge (`SidebarMenuBadge`).
  badge?: string;
  // The `size-8 rounded-lg bg-sidebar-primary` brand square (header rows).
  brand?: boolean;
  // A `size-8 rounded-lg` muted avatar square with "CN" initials (user rows).
  avatar?: boolean;
  // A small `size-5 rounded-md bg-sidebar-primary` brand square (sidebar-10's
  // compact team switcher).
  smallBrand?: boolean;
  // A second, muted-looking subtitle line under the label (brand rows).
  subtitle?: string;
  // Mute the label (`text-sidebar-foreground/70` "More" rows).
  muted?: boolean;
};

// `SidebarMenuButton`: `flex h-8 w-full items-center gap-2 rounded-md p-2
// text-sm`. Active rows get `bg-sidebar-accent text-sidebar-accent-foreground
// font-medium`. `lg` (h-12) hosts the brand/user rows; `sm` (h-7) the secondary
// nav.
export function createMenuButton(
  inputs: BlocksInputs,
  opts: MenuButtonOpts,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const lib = iconLibrary(inputs);
  const size = opts.size ?? "default";
  const height = size === "lg" ? 48 : size === "sm" ? 28 : 32;

  const row = figma.createFrame();
  row.name = opts.active ? "Item (active)" : "Item";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "FIXED";
  row.counterAxisAlignItems = "CENTER";
  row.itemSpacing = 8;
  row.paddingLeft = 8;
  row.paddingRight = 8;
  row.resize(10, height);
  row.cornerRadius = 6;
  bindCornerRadii(row, p.get("radius/md"));
  row.strokes = [];

  const fg = opts.active
    ? sidebarVar(t, "sidebar-accent-foreground", "accent-foreground")
    : sidebarVar(t, "sidebar-foreground", "foreground");

  if (opts.active) {
    bindFill(row, sidebarVar(t, "sidebar-accent", "accent"));
  } else {
    row.fills = [];
  }

  // Leading brand square (`size-8 rounded-lg bg-sidebar-primary`).
  if (opts.brand) {
    const square = figma.createFrame();
    square.name = "Logo";
    square.layoutMode = "HORIZONTAL";
    square.primaryAxisAlignItems = "CENTER";
    square.counterAxisAlignItems = "CENTER";
    square.primaryAxisSizingMode = "FIXED";
    square.counterAxisSizingMode = "FIXED";
    square.resize(32, 32);
    square.cornerRadius = 8;
    bindCornerRadii(square, p.get("radius/lg"));
    bindFill(square, sidebarVar(t, "sidebar-primary", "primary"));
    square.strokes = [];
    const glyph = createNamedIcon({
      library: lib,
      name: iconCandidates(opts.icon ?? "gallery-vertical-end"),
      size: 16,
      color: sidebarVar(t, "sidebar-primary-foreground", "primary-foreground"),
    });
    if (glyph) {
      glyph.name = "Icon";
      square.appendChild(glyph);
    }
    row.appendChild(square);
  } else if (opts.smallBrand) {
    const square = figma.createFrame();
    square.name = "Logo";
    square.layoutMode = "HORIZONTAL";
    square.primaryAxisAlignItems = "CENTER";
    square.counterAxisAlignItems = "CENTER";
    square.primaryAxisSizingMode = "FIXED";
    square.counterAxisSizingMode = "FIXED";
    square.resize(20, 20);
    square.cornerRadius = 6;
    bindCornerRadii(square, p.get("radius/md"));
    bindFill(square, sidebarVar(t, "sidebar-primary", "primary"));
    square.strokes = [];
    const glyph = createNamedIcon({
      library: lib,
      name: iconCandidates(opts.icon ?? "command"),
      size: 12,
      color: sidebarVar(t, "sidebar-primary-foreground", "primary-foreground"),
    });
    if (glyph) {
      glyph.name = "Icon";
      square.appendChild(glyph);
    }
    row.appendChild(square);
  } else if (opts.avatar) {
    const square = figma.createFrame();
    square.name = "Avatar";
    square.layoutMode = "HORIZONTAL";
    square.primaryAxisAlignItems = "CENTER";
    square.counterAxisAlignItems = "CENTER";
    square.primaryAxisSizingMode = "FIXED";
    square.counterAxisSizingMode = "FIXED";
    square.resize(32, 32);
    square.cornerRadius = 8;
    bindCornerRadii(square, p.get("radius/lg"));
    bindFill(square, t.get("muted"));
    square.strokes = [];
    const initials = figma.createText();
    applyFont(initials, "body", "Medium");
    initials.characters = "CN";
    initials.fontSize = 12;
    bindFontSize(initials, p.get("font/size/xs"));
    bindFill(initials, t.get("muted-foreground"));
    square.appendChild(initials);
    row.appendChild(square);
  } else if (opts.icon) {
    const glyph = createNamedIcon({
      library: lib,
      name: iconCandidates(opts.icon),
      size: 16,
      color: fg,
    });
    if (glyph) {
      glyph.name = "Icon";
      row.appendChild(glyph);
    }
  } else if (opts.emoji) {
    const e = figma.createText();
    applyFont(e, "body", "Regular");
    e.characters = opts.emoji;
    e.fontSize = 14;
    row.appendChild(e);
  }

  // Label column: one line, or label + subtitle for the brand/user rows.
  if (opts.brand || opts.subtitle) {
    const col = figma.createFrame();
    col.name = "Text";
    col.layoutMode = "VERTICAL";
    col.primaryAxisSizingMode = "AUTO";
    col.counterAxisSizingMode = "AUTO";
    col.itemSpacing = 0;
    col.fills = [];
    col.strokes = [];
    const title = figma.createText();
    applyFont(title, "body", "Medium");
    title.characters = opts.label;
    title.fontSize = 14;
    bindFontSize(title, p.get("font/size/sm"));
    bindFill(title, fg);
    col.appendChild(title);
    fillW(title);
    truncateLine(title);
    if (opts.subtitle) {
      const sub = figma.createText();
      applyFont(sub, "body", "Regular");
      sub.characters = opts.subtitle;
      sub.fontSize = 12;
      bindFontSize(sub, p.get("font/size/xs"));
      bindFill(sub, fg);
      sub.opacity = 0.7;
      col.appendChild(sub);
      fillW(sub);
      truncateLine(sub);
    }
    row.appendChild(col);
    col.layoutGrow = 1;
    // Constrain the label column so its lines truncate instead of wrapping.
    fillW(col);
  } else {
    const label = figma.createText();
    applyFont(label, "body", opts.active ? "Medium" : "Regular");
    label.characters = opts.label;
    label.fontSize = 14;
    bindFontSize(label, p.get("font/size/sm"));
    bindFill(label, fg);
    if (opts.muted) label.opacity = 0.7;
    row.appendChild(label);
    label.layoutGrow = 1;
    // `truncate`: one line with an ellipsis instead of wrapping to two lines.
    fillW(label);
    truncateLine(label);
  }

  // Trailing badge (`SidebarMenuBadge`: small tabular count at the right).
  if (opts.badge) {
    const badge = figma.createText();
    applyFont(badge, "body", "Medium");
    badge.characters = opts.badge;
    badge.fontSize = 12;
    bindFontSize(badge, p.get("font/size/xs"));
    bindFill(badge, fg);
    row.appendChild(badge);
  }

  // Trailing icon (chevron / chevrons-up-down / more-horizontal).
  if (opts.trailingIcon) {
    const trailing = createNamedIcon({
      library: lib,
      name: iconCandidates(opts.trailingIcon),
      size: 16,
      color: fg,
    });
    if (trailing) {
      trailing.name = "Trailing";
      row.appendChild(trailing);
    }
  }

  return row;
}

// `SidebarMenuSub`: `ml-3.5 flex flex-col gap-1 border-l border-sidebar-border
// px-2.5 py-0.5`. Holds `SidebarMenuSubButton`s (`h-7 px-2 rounded-md`). Figma
// has no per-child margins, so the `ml-3.5` indent is a transparent left pad on
// an outer wrapper; the inner frame carries the left border + `px-2.5`.
export function createMenuSub(inputs: BlocksInputs): {
  wrapper: FrameNode;
  body: FrameNode;
} {
  const t = inputs.theme.light;

  const wrapper = figma.createFrame();
  wrapper.name = "Sub";
  wrapper.layoutMode = "VERTICAL";
  wrapper.primaryAxisSizingMode = "AUTO";
  wrapper.counterAxisSizingMode = "FIXED";
  wrapper.itemSpacing = 0;
  wrapper.paddingLeft = 14; // `ml-3.5`
  wrapper.fills = [];
  wrapper.strokes = [];

  const body = figma.createFrame();
  body.name = "Sub Items";
  body.layoutMode = "VERTICAL";
  body.primaryAxisSizingMode = "AUTO";
  body.counterAxisSizingMode = "FIXED";
  body.itemSpacing = 4;
  body.paddingLeft = 10;
  body.paddingRight = 10;
  body.paddingTop = 2;
  body.paddingBottom = 2;
  body.fills = [];
  bindStrokeColor(body, sidebarVar(t, "sidebar-border", "border"));
  body.strokeWeight = 1;
  body.strokeAlign = "INSIDE";
  body.strokeTopWeight = 0;
  body.strokeBottomWeight = 0;
  body.strokeRightWeight = 0;
  body.strokeLeftWeight = 1;
  wrapper.appendChild(body);
  body.layoutSizingHorizontal = "FILL";

  return { wrapper, body };
}

export function createMenuSubButton(
  inputs: BlocksInputs,
  label: string,
  opts: { active?: boolean; emoji?: string } = {},
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = opts.active ? "Sub Item (active)" : "Sub Item";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "FIXED";
  row.counterAxisAlignItems = "CENTER";
  row.itemSpacing = 8;
  row.paddingLeft = 8;
  row.paddingRight = 8;
  row.resize(10, 28);
  row.cornerRadius = 6;
  bindCornerRadii(row, p.get("radius/md"));
  row.strokes = [];

  const fg = opts.active
    ? sidebarVar(t, "sidebar-accent-foreground", "accent-foreground")
    : sidebarVar(t, "sidebar-foreground", "foreground");
  if (opts.active) {
    bindFill(row, sidebarVar(t, "sidebar-accent", "accent"));
  } else {
    row.fills = [];
  }

  if (opts.emoji) {
    const e = figma.createText();
    applyFont(e, "body", "Regular");
    e.characters = opts.emoji;
    e.fontSize = 14;
    row.appendChild(e);
  }

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.characters = label;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, fg);
  row.appendChild(text);
  text.layoutGrow = 1;

  return row;
}

// Post-build pass: wrap each SidebarMenu's items in a slot so instances can
// add/remove/reorder menu rows without detaching. Only the repeated menu item
// areas (`createMenu` → "Menu" frames) are slotted; the rail chrome (header,
// search, separators, group labels, sub-menus) stays fixed. Slots are named
// uniquely per component ("Menu Items N") so the SLOT properties don't collide.
export function slotifyMenus(comp: ComponentNode): void {
  const menus: FrameNode[] = [];
  const visit = (node: { children?: readonly SceneNode[] }) => {
    const children = node.children;
    if (!children) return;
    for (const child of children) {
      if (child.type === "FRAME" && child.name === "Menu") {
        menus.push(child as FrameNode);
      }
      visit(child as unknown as { children?: readonly SceneNode[] });
    }
  };
  visit(comp as unknown as { children?: readonly SceneNode[] });

  let index = 0;
  for (const menu of menus) {
    const items = [...menu.children];
    if (items.length === 0) continue;
    index += 1;
    const slot = createConfiguredSlot(comp, `Menu Items ${index}`, items, {
      description: "Sidebar menu items.",
      settings: { minChildren: 1 },
    });
    menu.appendChild(slot);
    slot.layoutMode = "VERTICAL";
    slot.primaryAxisSizingMode = "AUTO";
    slot.counterAxisSizingMode = "FIXED";
    slot.itemSpacing = menu.itemSpacing;
    slot.fills = [];
    slot.strokes = [];
    fillW(slot);
    for (const item of items) fillW(item);
  }
}

// `SidebarSeparator`: `mx-2 h-px bg-sidebar-border`.
export function createSeparator(inputs: BlocksInputs): FrameNode {
  const t = inputs.theme.light;
  const wrap = figma.createFrame();
  wrap.name = "Separator";
  wrap.layoutMode = "VERTICAL";
  wrap.primaryAxisSizingMode = "FIXED";
  wrap.counterAxisSizingMode = "FIXED";
  wrap.resize(10, 1);
  bindFill(wrap, sidebarVar(t, "sidebar-border", "border"));
  wrap.strokes = [];
  return wrap;
}

// `SidebarInput`: `h-8 w-full rounded-md border bg-background`, with the search
// glyph overlaid (`pl-8`). Drawn as an inline row so it reads correctly without
// absolute positioning.
export function createSearchField(
  inputs: BlocksInputs,
  placeholder = "Search the docs...",
  height = 32,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const input = figma.createFrame();
  input.name = "Search";
  input.layoutMode = "HORIZONTAL";
  input.primaryAxisSizingMode = "FIXED";
  input.counterAxisSizingMode = "FIXED";
  input.counterAxisAlignItems = "CENTER";
  input.itemSpacing = 8;
  input.paddingLeft = 8;
  input.paddingRight = 8;
  input.resize(10, height);
  input.cornerRadius = 6;
  bindCornerRadii(input, p.get("radius/md"));
  bindFill(input, t.get("background"));
  bindStrokeColor(input, t.get("border"));
  input.strokeWeight = 1;
  input.strokeAlign = "INSIDE";

  const glyph = createNamedIcon({
    library: iconLibrary(inputs),
    name: iconCandidates("search"),
    size: 16,
    color: t.get("muted-foreground"),
  });
  if (glyph) {
    glyph.name = "Icon";
    (glyph as unknown as { opacity: number }).opacity = 0.5;
    input.appendChild(glyph);
  }

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.characters = placeholder;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get("muted-foreground"));
  input.appendChild(text);
  text.layoutGrow = 1;

  return input;
}

// Helper: append a frame to an auto-layout parent and stretch it to full width.
export function appendFill(
  parent: FrameNode | ComponentNode,
  child: SceneNode,
): void {
  parent.appendChild(child);
  fillW(child);
}

// Guarded `layoutSizingHorizontal = "FILL"` for a node already parented to an
// auto-layout frame. Some hosts/instances reject FILL; the node then keeps its
// intrinsic width.
export function fillW(node: SceneNode): void {
  try {
    (
      node as unknown as { layoutSizingHorizontal: string }
    ).layoutSizingHorizontal = "FILL";
  } catch {
    // Keep intrinsic width.
  }
}

// Helper: stretch a node's height to fill its auto-layout parent (the content
// region between header and footer).
export function fillHeight(node: SceneNode): void {
  try {
    (node as unknown as { layoutSizingVertical: string }).layoutSizingVertical =
      "FILL";
  } catch {
    // Keep intrinsic height.
  }
}

// Helper: clamp a text node to a single, ellipsis-truncated line — mirrors
// shadcn's `[&>span:last-child]:truncate` on the sidebar menu buttons so long
// labels (e.g. the Favorites entries) don't wrap. The node must be width-
// constrained by its auto-layout parent (FILL / layoutGrow), so its width is
// fixed and only the visible text is clipped with an ellipsis.
export function truncateLine(node: TextNode): void {
  try {
    (node as unknown as { textAutoResize: string }).textAutoResize = "HEIGHT";
  } catch {
    // Keep default sizing.
  }
  try {
    (node as unknown as { maxLines: number }).maxLines = 1;
  } catch {
    // Older hosts ignore maxLines.
  }
  try {
    (node as unknown as { textTruncation: string }).textTruncation = "ENDING";
  } catch {
    // Older hosts ignore truncation.
  }
}
