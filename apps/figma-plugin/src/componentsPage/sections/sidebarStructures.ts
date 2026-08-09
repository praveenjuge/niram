// Higher-level, interchangeable sidebar structures: dedicated rows, slotted
// groups, and a full shell reused by the 16 block templates.

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
  type SemanticIconName,
} from "../../icons";
import { styleComponentSet } from "../layout";
import {
  collectByTypeAndName,
  createConfiguredSlot,
  defineBooleanProperty,
  defineIconSwapProperty,
  defineTextProperty,
} from "../properties";
import type { ComponentsInputs } from "../types";

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 32;
const SHELL_EXPANDED_WIDTH = 256;
const SHELL_COLLAPSED_WIDTH = 48;
const SHELL_HEIGHT = 982;

const STATES = ["expanded", "collapsed"] as const;
type SidebarState = (typeof STATES)[number];

const SIDES = ["left", "right"] as const;
type SidebarSide = (typeof SIDES)[number];

const STYLES = ["sidebar", "floating", "inset"] as const;
type SidebarStyle = (typeof STYLES)[number];

type RowKind = "search" | "team" | "user" | "project" | "workspace";

type RowSpec = {
  kind: RowKind;
  name: string;
  label: string;
  labelProperty: string;
  supporting?: string;
  leading?: SemanticIconName;
  trailing?: SemanticIconName;
  avatar?: boolean;
  height: number;
};

const ROWS: readonly RowSpec[] = [
  {
    kind: "project",
    name: "Sidebar Project Row",
    label: "Project",
    labelProperty: "Project name",
    leading: "folder",
    trailing: "chevron-right",
    height: 32,
  },
  {
    kind: "workspace",
    name: "Sidebar Workspace Row",
    label: "Workspace",
    labelProperty: "Workspace name",
    leading: "folder",
    trailing: "chevron-right",
    height: 32,
  },
  {
    kind: "search",
    name: "Sidebar Search",
    label: "Search...",
    labelProperty: "Placeholder",
    leading: "search",
    height: 32,
  },
  {
    kind: "team",
    name: "Sidebar Team Switcher",
    label: "Acme Inc",
    labelProperty: "Team name",
    supporting: "Enterprise",
    leading: "command",
    trailing: "chevron-down",
    height: 48,
  },
  {
    kind: "user",
    name: "Sidebar User Menu",
    label: "shadcn",
    labelProperty: "User name",
    supporting: "m@example.com",
    avatar: true,
    trailing: "chevron-down",
    height: 48,
  },
];

export type SidebarStructureSources = {
  groupLabel: ComponentNode;
  buttonSet: ComponentSetNode;
};

export function buildSidebarStructures(
  page: PageNode,
  inputs: ComponentsInputs,
  sources: SidebarStructureSources,
): SceneNode[] {
  const rowSets = new Map<RowKind, ComponentSetNode>();
  const output: SceneNode[] = [];

  for (const spec of ROWS) {
    const set = buildRowSet(page, inputs, spec);
    rowSets.set(spec.kind, set);
    output.push(set);
  }

  const projectSet = rowSets.get("project")!;
  const workspaceSet = rowSets.get("workspace")!;
  const groupSet = buildGroupSet(
    page,
    sources.groupLabel,
    projectSet,
    workspaceSet,
  );
  output.push(groupSet);

  const shellSet = buildShellSet(page, inputs, {
    groupSet,
    searchSet: rowSets.get("search")!,
    teamSet: rowSets.get("team")!,
    userSet: rowSets.get("user")!,
    buttonSet: sources.buttonSet,
  });
  output.push(shellSet);

  return output;
}

// ----- Dedicated rows ------------------------------------------------------

function buildRowSet(
  page: PageNode,
  inputs: ComponentsInputs,
  spec: RowSpec,
): ComponentSetNode {
  const components: ComponentNode[] = [];
  for (const state of STATES) {
    const component = buildRow(inputs, spec, state);
    page.appendChild(component);
    components.push(component);
  }

  const set = figma.combineAsVariants(components, page);
  set.name = spec.name;
  set.layoutMode = "HORIZONTAL";
  set.itemSpacing = 16;
  styleComponentSet(set);

  defineTextProperty(
    set,
    spec.labelProperty,
    spec.label,
    collectByTypeAndName(set, "TEXT", "Label"),
  );
  if (spec.supporting) {
    defineTextProperty(
      set,
      "Supporting text",
      spec.supporting,
      collectByTypeAndName(set, "TEXT", "Supporting"),
    );
    defineBooleanProperty(
      set,
      "Show supporting text",
      true,
      collectFromState(set, "expanded", "TEXT", "Supporting"),
    );
  }

  const leadingInstances = collectByTypeAndName(set, "INSTANCE", "Leading");
  const leadingFrames = collectByTypeAndName(set, "FRAME", "Avatar");
  defineBooleanProperty(
    set,
    "Show leading",
    true,
    [...leadingInstances, ...leadingFrames],
  );
  defineBooleanProperty(
    set,
    "Show trailing",
    Boolean(spec.trailing),
    collectFromState(set, "expanded", "INSTANCE", "Trailing"),
  );

  const library = resolveIconLibrary(inputs.presetSummary);
  const leadingName = spec.leading
    ? resolveIconName(library, spec.leading)
    : undefined;
  const trailingName = spec.trailing
    ? resolveIconName(library, spec.trailing)
    : undefined;
  defineIconSwapProperty(
    set,
    "Leading icon",
    leadingName ? inputs.iconComponents?.get(leadingName) : undefined,
    leadingInstances,
  );
  defineIconSwapProperty(
    set,
    "Trailing icon",
    trailingName ? inputs.iconComponents?.get(trailingName) : undefined,
    collectByTypeAndName(set, "INSTANCE", "Trailing"),
  );

  return set;
}

function buildRow(
  inputs: ComponentsInputs,
  spec: RowSpec,
  state: SidebarState,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const expanded = state === "expanded";
  const fg =
    spec.kind === "search"
      ? t.get("muted-foreground")
      : sidebarVar(t, "sidebar-foreground", "foreground");

  const component = figma.createComponent();
  component.name = `State=${state}`;
  component.layoutMode = "HORIZONTAL";
  component.primaryAxisSizingMode = "FIXED";
  component.counterAxisSizingMode = "FIXED";
  component.counterAxisAlignItems = "CENTER";
  component.primaryAxisAlignItems = expanded ? "MIN" : "CENTER";
  component.itemSpacing = 8;
  component.paddingLeft = expanded ? 8 : 0;
  component.paddingRight = expanded ? 8 : 0;
  component.resize(expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH, spec.height);
  component.cornerRadius = 6;
  bindCornerRadii(component, p.get("radius/md"));
  if (spec.kind === "search") {
    bindFill(component, t.get("background"));
    bindStrokeColor(component, t.get("border"));
    component.strokeWeight = 1;
    component.strokeAlign = "INSIDE";
  } else {
    component.fills = [];
    component.strokes = [];
  }

  if (spec.avatar) {
    component.appendChild(buildAvatar(inputs));
  } else if (spec.leading) {
    if (spec.kind === "team") {
      component.appendChild(buildBrand(inputs, spec.leading));
    } else {
      const leading = buildIcon(inputs, spec.leading, fg);
      if (leading) {
        leading.name = "Leading";
        if (spec.kind === "search") {
          (leading as unknown as { opacity: number }).opacity = 0.5;
        }
        component.appendChild(leading);
      }
    }
  }

  const text = figma.createFrame();
  text.name = "Text";
  text.layoutMode = "VERTICAL";
  text.primaryAxisSizingMode = "AUTO";
  text.counterAxisSizingMode = "AUTO";
  text.itemSpacing = 0;
  text.fills = [];
  text.strokes = [];
  text.visible = expanded;

  const label = createLabel(inputs, "Label", spec.label, 14, "Regular", fg);
  text.appendChild(label);
  clampText(label);

  if (spec.supporting) {
    const supporting = createLabel(
      inputs,
      "Supporting",
      spec.supporting,
      12,
      "Regular",
      fg,
    );
    supporting.opacity = 0.7;
    text.appendChild(supporting);
    clampText(supporting);
  }

  component.appendChild(text);
  text.layoutGrow = 1;
  fillWidth(text);

  if (spec.trailing) {
    const trailing = buildIcon(inputs, spec.trailing, fg);
    if (trailing) {
      trailing.name = "Trailing";
      trailing.visible = expanded;
      component.appendChild(trailing);
    }
  }

  return component;
}

function buildAvatar(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const avatar = figma.createFrame();
  avatar.name = "Avatar";
  avatar.layoutMode = "HORIZONTAL";
  avatar.primaryAxisSizingMode = "FIXED";
  avatar.counterAxisSizingMode = "FIXED";
  avatar.primaryAxisAlignItems = "CENTER";
  avatar.counterAxisAlignItems = "CENTER";
  avatar.resize(32, 32);
  avatar.cornerRadius = 8;
  bindCornerRadii(avatar, inputs.primitives.get("radius/lg"));
  bindFill(avatar, t.get("muted"));
  avatar.strokes = [];
  const initials = createLabel(
    inputs,
    "Initials",
    "CN",
    12,
    "Medium",
    t.get("muted-foreground"),
  );
  avatar.appendChild(initials);
  return avatar;
}

function buildBrand(
  inputs: ComponentsInputs,
  iconName: SemanticIconName,
): FrameNode {
  const t = inputs.theme.light;
  const brand = figma.createFrame();
  brand.name = "Brand";
  brand.layoutMode = "HORIZONTAL";
  brand.primaryAxisSizingMode = "FIXED";
  brand.counterAxisSizingMode = "FIXED";
  brand.primaryAxisAlignItems = "CENTER";
  brand.counterAxisAlignItems = "CENTER";
  brand.resize(32, 32);
  brand.cornerRadius = 8;
  bindCornerRadii(brand, inputs.primitives.get("radius/lg"));
  bindFill(brand, sidebarVar(t, "sidebar-primary", "primary"));
  brand.strokes = [];
  const icon = buildIcon(
    inputs,
    iconName,
    sidebarVar(t, "sidebar-primary-foreground", "primary-foreground"),
  );
  if (icon) {
    icon.name = "Leading";
    brand.appendChild(icon);
  }
  return brand;
}

// ----- Slotted group -------------------------------------------------------

function buildGroupSet(
  page: PageNode,
  groupLabel: ComponentNode,
  projectSet: ComponentSetNode,
  workspaceSet: ComponentSetNode,
): ComponentSetNode {
  const components: ComponentNode[] = [];
  for (const state of STATES) {
    const component = figma.createComponent();
    component.name = `State=${state}`;
    component.layoutMode = "VERTICAL";
    component.primaryAxisSizingMode = "AUTO";
    component.counterAxisSizingMode = "FIXED";
    component.itemSpacing = 0;
    component.paddingTop = 8;
    component.paddingBottom = 8;
    component.paddingLeft = 8;
    component.paddingRight = 8;
    component.resize(
      state === "expanded" ? SHELL_EXPANDED_WIDTH : SHELL_COLLAPSED_WIDTH,
      1,
    );
    component.primaryAxisSizingMode = "AUTO";
    component.fills = [];
    component.strokes = [];

    const label = instanceOf(groupLabel);
    if (label) {
      label.name = "Group Label";
      label.visible = state === "expanded";
      component.appendChild(label);
      fillWidth(label);
    }

    const project = instanceOf(
      findVariant(projectSet, `State=${state}`),
    );
    const workspace = instanceOf(
      findVariant(workspaceSet, `State=${state}`),
    );
    const children = [project, workspace].filter(
      (node): node is InstanceNode => Boolean(node),
    );
    const slot = createConfiguredSlot(component, "Items", children, {
      description: "Add, remove, and reorder sidebar rows.",
      settings: { minChildren: 1, stretchChildOnInsert: true },
      preferredValues: [preferred(projectSet), preferred(workspaceSet)].filter(
        (value): value is { type: "COMPONENT_SET"; key: string } =>
          Boolean(value),
      ),
    });
    configureVerticalSlot(slot, 0);
    for (const child of children) fillWidth(child);

    page.appendChild(component);
    components.push(component);
  }

  const set = figma.combineAsVariants(components, page);
  set.name = "Sidebar Group";
  set.layoutMode = "HORIZONTAL";
  set.itemSpacing = 16;
  styleComponentSet(set);
  return set;
}

// ----- Full shell ----------------------------------------------------------

type ShellSources = {
  groupSet: ComponentSetNode;
  searchSet: ComponentSetNode;
  teamSet: ComponentSetNode;
  userSet: ComponentSetNode;
  buttonSet: ComponentSetNode;
};

function buildShellSet(
  page: PageNode,
  inputs: ComponentsInputs,
  sources: ShellSources,
): ComponentSetNode {
  const components: ComponentNode[] = [];
  for (const state of STATES) {
    for (const side of SIDES) {
      for (const style of STYLES) {
        const component = buildShell(inputs, state, side, style, sources);
        page.appendChild(component);
        components.push(component);
      }
    }
  }

  const set = figma.combineAsVariants(components, page);
  set.name = "Sidebar Shell";
  set.layoutMode = "HORIZONTAL";
  set.layoutWrap = "WRAP";
  set.itemSpacing = 24;
  set.counterAxisSpacing = 24;
  set.counterAxisAlignItems = "MIN";
  styleComponentSet(set);
  return set;
}

function buildShell(
  inputs: ComponentsInputs,
  state: SidebarState,
  side: SidebarSide,
  style: SidebarStyle,
  sources: ShellSources,
): ComponentNode {
  const t = inputs.theme.light;
  const component = figma.createComponent();
  component.name = `State=${state}, Side=${side}, Style=${style}`;
  component.layoutMode = "VERTICAL";
  component.primaryAxisSizingMode = "FIXED";
  component.counterAxisSizingMode = "FIXED";
  component.itemSpacing = 0;
  component.resize(
    state === "expanded" ? SHELL_EXPANDED_WIDTH : SHELL_COLLAPSED_WIDTH,
    SHELL_HEIGHT,
  );
  component.clipsContent = true;
  bindFill(component, sidebarVar(t, "sidebar", "card"));
  component.strokes = [];
  applyShellStyle(component, inputs, side, style);

  const team = instanceOf(findVariant(sources.teamSet, `State=${state}`));
  const search = instanceOf(findVariant(sources.searchSet, `State=${state}`));
  const group = instanceOf(findVariant(sources.groupSet, `State=${state}`));
  const secondary = instanceOf(
    findVariant(sources.groupSet, `State=${state}`),
  );
  const user = instanceOf(findVariant(sources.userSet, `State=${state}`));

  const headerChildren = [team, search].filter(isInstance);
  const navigationChildren = [group].filter(isInstance);
  const secondaryChildren = [secondary].filter(isInstance);
  const footerChildren = [user].filter(isInstance);

  const header = createConfiguredSlot(component, "Header", headerChildren, {
    description: "Team switcher, search, or custom header content.",
    settings: { stretchChildOnInsert: true },
    preferredValues: preferredList(sources.teamSet, sources.searchSet),
  });
  configurePaddedSlot(header);

  const navigation = createConfiguredSlot(
    component,
    "Navigation",
    navigationChildren,
    {
      description: "Primary sidebar navigation groups.",
      settings: { minChildren: 1, stretchChildOnInsert: true },
      preferredValues: preferredList(sources.groupSet, sources.buttonSet),
    },
  );
  configureVerticalSlot(navigation, 0);
  fillHeight(navigation);

  const secondaryNavigation = createConfiguredSlot(
    component,
    "Secondary Navigation",
    secondaryChildren,
    {
      description: "Optional secondary navigation groups.",
      settings: { stretchChildOnInsert: true },
      preferredValues: preferredList(sources.groupSet, sources.buttonSet),
    },
  );
  configureVerticalSlot(secondaryNavigation, 0);

  const footer = createConfiguredSlot(component, "Footer", footerChildren, {
    description: "User menu or custom footer content.",
    settings: { stretchChildOnInsert: true },
    preferredValues: preferredList(sources.userSet),
  });
  configurePaddedSlot(footer);

  for (const child of [
    ...headerChildren,
    ...navigationChildren,
    ...secondaryChildren,
    ...footerChildren,
  ]) {
    fillWidth(child);
  }

  return component;
}

function applyShellStyle(
  component: ComponentNode,
  inputs: ComponentsInputs,
  side: SidebarSide,
  style: SidebarStyle,
): void {
  const t = inputs.theme.light;
  if (style === "sidebar") {
    bindStrokeColor(component, sidebarVar(t, "sidebar-border", "border"));
    component.strokeWeight = 1;
    component.strokeAlign = "INSIDE";
    component.strokeTopWeight = 0;
    component.strokeBottomWeight = 0;
    component.strokeLeftWeight = side === "right" ? 1 : 0;
    component.strokeRightWeight = side === "left" ? 1 : 0;
  }
  if (style === "floating") {
    component.cornerRadius = 8;
    bindCornerRadii(component, inputs.primitives.get("radius/lg"));
    bindStrokeColor(component, sidebarVar(t, "sidebar-border", "border"));
    component.strokeWeight = 1;
    component.strokeAlign = "INSIDE";
  }
}

// ----- Helpers -------------------------------------------------------------

function sidebarVar(
  theme: Map<string, Variable>,
  key: string,
  fallback: string,
): Variable | undefined {
  return theme.get(key) ?? theme.get(fallback);
}

function createLabel(
  inputs: ComponentsInputs,
  name: string,
  characters: string,
  size: number,
  weight: "Regular" | "Medium",
  color: Variable | undefined,
): TextNode {
  const text = figma.createText();
  applyFont(text, "body", weight);
  text.name = name;
  text.characters = characters;
  text.fontSize = size;
  bindFontSize(
    text,
    inputs.primitives.get(size === 12 ? "font/size/xs" : "font/size/sm"),
  );
  bindFill(text, color);
  return text;
}

function buildIcon(
  inputs: ComponentsInputs,
  name: SemanticIconName,
  color: Variable | undefined,
): SceneNode | undefined {
  return inputs.iconComponents
    ? instantiateIcon({
        icons: inputs.iconComponents,
        library: resolveIconLibrary(inputs.presetSummary),
        name,
        size: 16,
      })
    : createIcon({
        library: resolveIconLibrary(inputs.presetSummary),
        name,
        size: 16,
        color,
      });
}

function collectFromState(
  set: ComponentSetNode,
  state: SidebarState,
  type: string,
  name: string,
) {
  const out: ReturnType<typeof collectByTypeAndName> = [];
  for (const child of set.children) {
    if (child.type !== "COMPONENT" || child.name !== `State=${state}`) continue;
    out.push(...collectByTypeAndName(child, type, name));
  }
  return out;
}

function findVariant(
  set: ComponentSetNode,
  name: string,
): ComponentNode | undefined {
  return set.children.find(
    (child): child is ComponentNode =>
      child.type === "COMPONENT" && child.name === name,
  );
}

function instanceOf(
  source: ComponentNode | undefined,
): InstanceNode | undefined {
  return source && typeof source.createInstance === "function"
    ? source.createInstance()
    : undefined;
}

function isInstance(node: InstanceNode | undefined): node is InstanceNode {
  return Boolean(node);
}

function preferred(
  set: ComponentSetNode,
): { type: "COMPONENT_SET"; key: string } | undefined {
  const key = (set as unknown as { key?: string }).key;
  return key ? { type: "COMPONENT_SET", key } : undefined;
}

function preferredList(
  ...sets: ComponentSetNode[]
): Array<{ type: "COMPONENT_SET"; key: string }> {
  return sets
    .map(preferred)
    .filter(
      (value): value is { type: "COMPONENT_SET"; key: string } =>
        Boolean(value),
    );
}

function configureVerticalSlot(
  slot: SlotNode | FrameNode,
  spacing: number,
): void {
  slot.layoutMode = "VERTICAL";
  slot.primaryAxisSizingMode = "AUTO";
  slot.counterAxisSizingMode = "FIXED";
  slot.itemSpacing = spacing;
  slot.fills = [];
  slot.strokes = [];
  fillWidth(slot);
}

function configurePaddedSlot(slot: SlotNode | FrameNode): void {
  configureVerticalSlot(slot, 8);
  slot.paddingTop = 8;
  slot.paddingBottom = 8;
  slot.paddingLeft = 8;
  slot.paddingRight = 8;
}

function fillWidth(node: SceneNode): void {
  try {
    (
      node as unknown as { layoutSizingHorizontal: string }
    ).layoutSizingHorizontal = "FILL";
  } catch {
    // Keep intrinsic width on older hosts.
  }
}

function fillHeight(node: SceneNode): void {
  try {
    (node as unknown as { layoutSizingVertical: string }).layoutSizingVertical =
      "FILL";
  } catch {
    // Keep intrinsic height on older hosts.
  }
}

function clampText(node: TextNode): void {
  try {
    node.layoutSizingHorizontal = "FILL";
    node.layoutGrow = 1;
    node.textAutoResize = "HEIGHT";
    node.textTruncation = "ENDING";
    node.maxLines = 1;
  } catch {
    // Keep the host's default text behavior.
  }
}
