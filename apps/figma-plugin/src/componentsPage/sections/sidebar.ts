// Sidebar kit: the small, reusable sidebar atoms, published as their own
// components so blocks (and designers) compose a rail from real instances
// instead of one opaque, hand-drawn frame.
//
// Mirrors shadcn's radix-nova `ui/sidebar.tsx` primitives at the component
// level:
//   SidebarMenuButton    `flex h-8 w-full items-center gap-2 rounded-md p-2
//                          text-sm`; active → `bg-sidebar-accent
//                          text-sidebar-accent-foreground font-medium`;
//                          `sm` h-7, `lg` h-12.
//   SidebarMenuSubButton `h-7 px-2 gap-2 rounded-md text-sidebar-foreground`.
//   SidebarGroupLabel    `h-8 px-2 text-xs font-medium
//                          text-sidebar-foreground/70`.
//   SidebarSeparator     `mx-2 h-px bg-sidebar-border`.
//   SidebarMenu          `flex w-full min-w-0 flex-col` — here a real SLOT
//                          ("Items") whose preferred insert is the published
//                          Sidebar Menu Button, so a menu is composed by
//                          dropping button instances into the slot.
//
// Every surface binds the preset's `--sidebar-*` theme variables (falling back
// to the neutral equivalents) and the Tailwind primitive tokens, exactly like
// the other Components-page sections.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import {
  createIcon,
  instantiateIcon,
  resolveIconLibrary,
  resolveIconName,
} from "../../icons";
import { styleComponentSet, wrapInSectionCard } from "../layout";
import {
  collectByTypeAndName,
  createConfiguredSlot,
  defineBooleanProperty,
  defineIconSwapProperty,
  defineTextProperty,
} from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

// The shared menu-button width: wide enough to read as a real nav row while
// still happy to stretch to FILL when dropped into a sidebar's menu slot.
const BUTTON_WIDTH = 240;

const MENU_BUTTON_STATES = ["default", "active"] as const;
type MenuButtonState = (typeof MENU_BUTTON_STATES)[number];

const MENU_BUTTON_SIZES = ["default", "sm", "lg"] as const;
type MenuButtonSize = (typeof MENU_BUTTON_SIZES)[number];

// radix-nova SidebarMenuButton heights: default `h-8` (32), sm `h-7` (28),
// lg `h-12` (48).
const MENU_BUTTON_HEIGHT: Record<MenuButtonSize, number> = {
  default: 32,
  sm: 28,
  lg: 48,
};

// The Sidebar Menu compositions, mirroring the menu shapes the shadcn sidebar
// blocks render:
//   default     a flat menu of icon + label rows
//   labeled     a SidebarGroupLabel above the menu (the SidebarGroup shape)
//   submenu     a menu whose active row expands into a SidebarMenuSub
// Each is composed from instances of the published button / sub-button /
// group-label atoms, so the set is a real composition, not a redraw.
const MENU_VARIANTS = ["default", "labeled", "submenu"] as const;
type MenuVariant = (typeof MENU_VARIANTS)[number];

// Resolve a `--sidebar-*` token, falling back to its neutral equivalent so
// presets without sidebar variables still render sensibly (mirrors the block's
// sidebarVar helper).
function sidebarVar(
  t: Map<string, Variable>,
  key: string,
  fallback: string,
): Variable | undefined {
  return t.get(key) ?? t.get(fallback);
}

export async function addSidebarSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  let count = 0;

  // 1) Sidebar Menu Button — the workhorse nav row (State × Size).
  const buttonSet = buildMenuButtonSet(page, inputs);
  count += countDescendants(buttonSet);

  // 2) Sidebar Menu Sub Button — the nested sub-item row (State).
  const subButtonSet = buildMenuSubButtonSet(page, inputs);
  count += countDescendants(subButtonSet);

  // 3) Sidebar Group Label — the muted section caption.
  const groupLabel = buildGroupLabel(inputs);
  defineTextProperty(
    groupLabel,
    "Label",
    "Platform",
    collectByTypeAndName(groupLabel, "TEXT", "Label"),
  );
  const groupLabelCard = wrapInSectionCard(groupLabel);
  page.appendChild(groupLabelCard);
  count += countDescendants(groupLabelCard);

  // 4) Sidebar Separator — the `h-px bg-sidebar-border` divider.
  const separator = buildSeparator(inputs);
  const separatorCard = wrapInSectionCard(separator);
  page.appendChild(separatorCard);
  count += countDescendants(separatorCard);

  // 5) Sidebar Menu — composed menus as a variant set (default / labeled /
  // submenu), each built from button / sub-button / group-label instances with
  // a real Items slot that offers the button set as its preferred insert.
  const menuSet = buildMenuSet(
    page,
    inputs,
    buttonSet,
    subButtonSet,
    groupLabel,
  );
  count += countDescendants(menuSet);

  return count;
}

// ----- Sidebar Menu Button -------------------------------------------------

function buildMenuButtonSet(
  page: PageNode,
  inputs: ComponentsInputs,
): ComponentSetNode {
  const components: ComponentNode[] = [];
  for (const state of MENU_BUTTON_STATES) {
    for (const size of MENU_BUTTON_SIZES) {
      const comp = buildMenuButton(inputs, state, size);
      page.appendChild(comp);
      components.push(comp);
    }
  }

  const set = figma.combineAsVariants(components, page);
  set.name = "Sidebar Menu Button";
  set.layoutMode = "HORIZONTAL";
  set.layoutWrap = "WRAP";
  set.itemSpacing = 16;
  set.counterAxisSpacing = 16;
  styleComponentSet(set);

  // The label copy, editable from any instance, fanned across every variant.
  defineTextProperty(
    set,
    "Label",
    "Menu Item",
    collectByTypeAndName(set, "TEXT", "Label"),
  );

  // The leading glyph as a swappable instance of the Design System icon set,
  // when it's available (same model as the Toggle).
  if (inputs.iconComponents) {
    const iconName = resolveIconName(
      resolveIconLibrary(inputs.presetSummary),
      "folder",
    );
    const source = iconName ? inputs.iconComponents.get(iconName) : undefined;
    defineIconSwapProperty(
      set,
      "Icon",
      source as unknown as { key?: string; parent?: { type: string } },
      collectByTypeAndName(set, "INSTANCE", "Icon"),
    );
  }

  // A trailing chevron, hidden by default and toggled per instance — covers the
  // collapsible / "has submenu" rows without a separate variant axis.
  defineBooleanProperty(
    set,
    "Trailing",
    false,
    collectByTypeAndName(set, "FRAME", "Trailing"),
  );

  return set;
}

function buildMenuButton(
  inputs: ComponentsInputs,
  state: MenuButtonState,
  size: MenuButtonSize,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const active = state === "active";

  const comp = figma.createComponent();
  comp.name = `State=${state}, Size=${size}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.counterAxisAlignItems = "CENTER";
  comp.itemSpacing = 8;
  comp.paddingLeft = 8;
  comp.paddingRight = 8;
  comp.resize(BUTTON_WIDTH, MENU_BUTTON_HEIGHT[size]);
  comp.cornerRadius = 6;
  bindCornerRadii(comp, p.get("radius/md"));
  comp.strokes = [];

  const fg = active
    ? sidebarVar(t, "sidebar-accent-foreground", "accent-foreground")
    : sidebarVar(t, "sidebar-foreground", "foreground");

  if (active) {
    bindFill(comp, sidebarVar(t, "sidebar-accent", "accent"));
  } else {
    comp.fills = [];
  }

  // Leading icon — a swappable instance of the published icon set when present,
  // else a drawn glyph (so isolated callers / tests still render an icon).
  const icon = inputs.iconComponents
    ? instantiateIcon({
        icons: inputs.iconComponents,
        library: resolveIconLibrary(inputs.presetSummary),
        name: "folder",
        size: 16,
      })
    : createIcon({
        library: resolveIconLibrary(inputs.presetSummary),
        name: "folder",
        size: 16,
        color: fg,
      });
  if (icon) {
    icon.name = "Icon";
    comp.appendChild(icon);
  }

  const label = figma.createText();
  applyFont(label, "body", active ? "Medium" : "Regular");
  label.name = "Label";
  label.characters = "Menu Item";
  label.fontSize = 14;
  bindFontSize(label, p.get("font/size/sm"));
  bindFill(label, fg);
  comp.appendChild(label);
  growText(label);

  // Trailing chevron (hidden by default; the "Trailing" boolean toggles it).
  const trailing = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "chevron-right",
    size: 16,
    color: fg,
  });
  if (trailing) {
    trailing.name = "Trailing";
    (trailing as unknown as { visible: boolean }).visible = false;
    comp.appendChild(trailing);
  }

  return comp;
}

// ----- Sidebar Menu Sub Button ---------------------------------------------

function buildMenuSubButtonSet(
  page: PageNode,
  inputs: ComponentsInputs,
): ComponentSetNode {
  const components: ComponentNode[] = [];
  for (const state of MENU_BUTTON_STATES) {
    const comp = buildMenuSubButton(inputs, state);
    page.appendChild(comp);
    components.push(comp);
  }

  const set = figma.combineAsVariants(components, page);
  set.name = "Sidebar Menu Sub Button";
  set.layoutMode = "HORIZONTAL";
  set.itemSpacing = 16;
  styleComponentSet(set);

  defineTextProperty(
    set,
    "Label",
    "Sub Item",
    collectByTypeAndName(set, "TEXT", "Label"),
  );

  return set;
}

function buildMenuSubButton(
  inputs: ComponentsInputs,
  state: MenuButtonState,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const active = state === "active";

  const comp = figma.createComponent();
  comp.name = `State=${state}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.counterAxisAlignItems = "CENTER";
  comp.itemSpacing = 8;
  comp.paddingLeft = 8;
  comp.paddingRight = 8;
  comp.resize(BUTTON_WIDTH, 28);
  comp.cornerRadius = 6;
  bindCornerRadii(comp, p.get("radius/md"));
  comp.strokes = [];

  const fg = active
    ? sidebarVar(t, "sidebar-accent-foreground", "accent-foreground")
    : sidebarVar(t, "sidebar-foreground", "foreground");
  if (active) {
    bindFill(comp, sidebarVar(t, "sidebar-accent", "accent"));
  } else {
    comp.fills = [];
  }

  const label = figma.createText();
  applyFont(label, "body", "Regular");
  label.name = "Label";
  label.characters = "Sub Item";
  label.fontSize = 14;
  bindFontSize(label, p.get("font/size/sm"));
  bindFill(label, fg);
  comp.appendChild(label);
  growText(label);

  return comp;
}

// ----- Sidebar Group Label -------------------------------------------------

function buildGroupLabel(inputs: ComponentsInputs): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = "Sidebar Group Label";
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.counterAxisAlignItems = "CENTER";
  comp.paddingLeft = 8;
  comp.paddingRight = 8;
  comp.resize(BUTTON_WIDTH, 32);
  comp.fills = [];
  comp.strokes = [];

  const label = figma.createText();
  applyFont(label, "body", "Medium");
  label.name = "Label";
  label.characters = "Platform";
  label.fontSize = 12;
  bindFontSize(label, p.get("font/size/xs"));
  bindFill(label, sidebarVar(t, "sidebar-foreground", "foreground"));
  label.opacity = 0.7;
  comp.appendChild(label);

  return comp;
}

// ----- Sidebar Separator ---------------------------------------------------

function buildSeparator(inputs: ComponentsInputs): ComponentNode {
  const t = inputs.theme.light;

  const comp = figma.createComponent();
  comp.name = "Sidebar Separator";
  comp.layoutMode = "VERTICAL";
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.resize(BUTTON_WIDTH, 1);
  bindFill(comp, sidebarVar(t, "sidebar-border", "border"));
  comp.strokes = [];

  return comp;
}

// ----- Sidebar Menu --------------------------------------------------------

// The Sidebar Menu set: each variant is a composed menu (built from instances
// of the published button / sub-button / group-label atoms) with a real Items
// slot that offers the Sidebar Menu Button set as its preferred insert. A
// designer picks a menu shape and still drops more button instances into the
// slot — the menu is composed, never one opaque frame.
function buildMenuSet(
  page: PageNode,
  inputs: ComponentsInputs,
  buttonSet: ComponentSetNode,
  subButtonSet: ComponentSetNode,
  groupLabel: ComponentNode,
): ComponentSetNode {
  const components: ComponentNode[] = [];
  for (const variant of MENU_VARIANTS) {
    const comp = buildMenu(
      inputs,
      variant,
      buttonSet,
      subButtonSet,
      groupLabel,
    );
    page.appendChild(comp);
    components.push(comp);
  }

  const set = figma.combineAsVariants(components, page);
  set.name = "Sidebar Menu";
  set.layoutMode = "HORIZONTAL";
  set.layoutWrap = "WRAP";
  set.itemSpacing = 24;
  set.counterAxisSpacing = 24;
  set.counterAxisAlignItems = "MIN";
  styleComponentSet(set);

  return set;
}

function buildMenu(
  inputs: ComponentsInputs,
  variant: MenuVariant,
  buttonSet: ComponentSetNode,
  subButtonSet: ComponentSetNode,
  groupLabel: ComponentNode,
): ComponentNode {
  const comp = figma.createComponent();
  comp.name = `Variant=${variant}`;
  // Resize first: resize() pins both axes to FIXED, so set the sizing modes
  // afterwards or the height stays locked at 1px (hug never takes effect).
  comp.resize(BUTTON_WIDTH, 1);
  comp.layoutMode = "VERTICAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  comp.itemSpacing = 4;
  comp.fills = [];
  comp.strokes = [];

  // The labeled menu leads with a SidebarGroupLabel instance (a SidebarGroup).
  if (variant === "labeled") {
    const label = instanceOf(groupLabel);
    if (label) {
      label.name = "Group Label";
      comp.appendChild(label);
      growHorizontal(label);
    }
  }

  // The repeated rows live in the Items slot, seeded with button instances. The
  // submenu variant nests a SidebarMenuSub of sub-button instances after them.
  const def = findVariant(buttonSet, "State=default, Size=default");
  const act = findVariant(buttonSet, "State=active, Size=default");
  const rows = variant === "submenu" ? [def, act] : [def, act, def];

  const items: SceneNode[] = [];
  for (const source of rows) {
    const instance = instanceOf(source);
    if (!instance) continue;
    instance.name = "Item";
    items.push(instance);
  }
  if (variant === "submenu") {
    items.push(buildSubMenu(inputs, subButtonSet));
  }

  // Offer the button set as the slot's preferred insert when it carries a key
  // (published / mock); guard so an unpublished local set degrades gracefully.
  const key = (buttonSet as unknown as { key?: string }).key;
  const slot = createConfiguredSlot(comp, "Items", items, {
    description: "Sidebar menu items — drop Sidebar Menu Button instances in.",
    settings: { minChildren: 1, stretchChildOnInsert: true },
    preferredValues: key ? [{ type: "COMPONENT_SET", key }] : undefined,
  });
  slot.layoutMode = "VERTICAL";
  slot.primaryAxisSizingMode = "AUTO";
  slot.counterAxisSizingMode = "FIXED";
  slot.itemSpacing = 4;
  slot.fills = [];
  slot.strokes = [];
  growHorizontal(slot);
  for (const item of items) growHorizontal(item);

  return comp;
}

// `SidebarMenuSub`: `ml-3.5 border-l border-sidebar-border px-2.5 py-0.5`,
// holding SidebarMenuSubButton instances. The `ml-3.5` indent is a transparent
// left pad on an outer wrapper; the inner body carries the left border.
function buildSubMenu(
  inputs: ComponentsInputs,
  subButtonSet: ComponentSetNode,
): FrameNode {
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

  const def = findVariant(subButtonSet, "State=default");
  for (let i = 0; i < 2; i++) {
    const instance = instanceOf(def);
    if (!instance) continue;
    instance.name = "Sub Item";
    body.appendChild(instance);
    growHorizontal(instance);
  }

  wrapper.appendChild(body);
  growHorizontal(body);
  return wrapper;
}

// ----- helpers -------------------------------------------------------------

function findVariant(
  set: ComponentSetNode,
  name: string,
): ComponentNode | undefined {
  for (const child of set.children) {
    if (child.type === "COMPONENT" && child.name === name) {
      return child as ComponentNode;
    }
  }
  return undefined;
}

// Create an instance of a source component, guarded so hosts without
// createInstance (or a missing source variant) degrade to nothing.
function instanceOf(
  source: ComponentNode | undefined,
): InstanceNode | undefined {
  if (!source || typeof source.createInstance !== "function") return undefined;
  return source.createInstance();
}

// Stretch a label to fill its row's primary axis (so it truncates rather than
// pushing the trailing affordance). Guarded — some hosts reject FILL.
function growText(node: TextNode): void {
  try {
    (node as unknown as { layoutGrow: number }).layoutGrow = 1;
  } catch {
    // Keep intrinsic width.
  }
  try {
    (
      node as unknown as { layoutSizingHorizontal: string }
    ).layoutSizingHorizontal = "FILL";
  } catch {
    // Keep intrinsic width.
  }
}

function growHorizontal(node: SceneNode): void {
  try {
    (
      node as unknown as { layoutSizingHorizontal: string }
    ).layoutSizingHorizontal = "FILL";
  } catch {
    // Keep intrinsic width.
  }
}
