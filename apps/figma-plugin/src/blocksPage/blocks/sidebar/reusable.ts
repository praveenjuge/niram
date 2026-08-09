// Live instances of the high-level Sidebar components. Each helper configures
// the nested copy for a block and falls back to the canonical drawn primitive
// when the Components region is unavailable (isolated tests/callers).

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../../../componentsPage/bindings";
import { applyFont } from "../../../fonts";
import { createNamedIcon } from "../../../icons";
import { instanceFromComponents } from "../../utils";
import type { BlocksInputs } from "../../types";
import {
  createMenuButton,
  iconCandidates,
  iconLibrary,
} from "./primitives";

function findNamed(root: SceneNode, name: string): SceneNode | undefined {
  const stack: SceneNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node !== root && node.name === name) return node;
    const children = (node as unknown as { children?: SceneNode[] }).children;
    if (children) {
      for (const child of children) stack.push(child);
    }
  }
  return undefined;
}

function setNamedText(root: SceneNode, name: string, value: string): void {
  const node = findNamed(root, name);
  if (!node || node.type !== "TEXT") return;
  try {
    node.characters = value;
  } catch {
    // Keep the source text when an override is unavailable.
  }
}

function swapIcon(node: SceneNode, inputs: BlocksInputs, name: string): void {
  const icons = inputs.iconComponents;
  if (!icons) return;
  let target: ComponentNode | undefined;
  for (const candidate of iconCandidates(name)) {
    target = icons.get(candidate);
    if (target) break;
  }
  const swap = (
    node as unknown as { swapComponent?: (component: ComponentNode) => void }
  ).swapComponent;
  if (!target || typeof swap !== "function") return;
  try {
    swap.call(node, target);
  } catch {
    // Keep the source icon.
  }
}

function instanceStructureRow(
  inputs: BlocksInputs,
  componentName: string,
  options: {
    label: string;
    supporting?: string;
    leadingIcon?: string;
    trailingIcon?: string;
  },
): InstanceNode | undefined {
  const instance = instanceFromComponents(
    inputs,
    componentName,
    "State=expanded",
  );
  if (!instance) return undefined;
  instance.name = componentName;
  setNamedText(instance, "Label", options.label);
  if (options.supporting) {
    setNamedText(instance, "Supporting", options.supporting);
  }
  const leading = findNamed(instance, "Leading");
  if (leading && options.leadingIcon) {
    swapIcon(leading, inputs, options.leadingIcon);
  }
  const trailing = findNamed(instance, "Trailing");
  if (trailing) {
    trailing.visible = Boolean(options.trailingIcon);
    if (options.trailingIcon) swapIcon(trailing, inputs, options.trailingIcon);
  }
  return instance;
}

export function createTeamSwitcher(
  inputs: BlocksInputs,
  options: {
    label: string;
    subtitle: string;
    icon?: string;
    trailingIcon?: string;
  },
): SceneNode {
  return (
    instanceStructureRow(inputs, "Sidebar Team Switcher", {
      label: options.label,
      supporting: options.subtitle,
      leadingIcon: options.icon,
      trailingIcon: options.trailingIcon,
    }) ??
    createMenuButton(inputs, {
      label: options.label,
      subtitle: options.subtitle,
      brand: true,
      icon: options.icon,
      size: "lg",
      trailingIcon: options.trailingIcon,
    })
  );
}

export function createUserMenu(
  inputs: BlocksInputs,
  label: string,
  email: string,
): SceneNode {
  return (
    instanceStructureRow(inputs, "Sidebar User Menu", {
      label,
      supporting: email,
      trailingIcon: "chevrons-up-down",
    }) ??
    createMenuButton(inputs, {
      label,
      subtitle: email,
      avatar: true,
      size: "lg",
      trailingIcon: "chevrons-up-down",
    })
  );
}

export function createProjectRow(
  inputs: BlocksInputs,
  label: string,
  icon = "folder",
  trailingIcon = "more-horizontal",
): SceneNode {
  return (
    instanceStructureRow(inputs, "Sidebar Project Row", {
      label,
      leadingIcon: icon,
      trailingIcon,
    }) ?? createMenuButton(inputs, { label, icon, trailingIcon })
  );
}

export function createWorkspaceRow(
  inputs: BlocksInputs,
  label: string,
): SceneNode {
  return (
    instanceStructureRow(inputs, "Sidebar Workspace Row", {
      label,
      leadingIcon: "folder",
      trailingIcon: "chevron-right",
    }) ??
    createMenuButton(inputs, {
      label,
      icon: "folder",
      trailingIcon: "chevron-right",
    })
  );
}

export function createSearchField(
  inputs: BlocksInputs,
  placeholder = "Search the docs...",
  height = 32,
): SceneNode {
  if (height === 32) {
    const instance = instanceStructureRow(inputs, "Sidebar Search", {
      label: placeholder,
      leadingIcon: "search",
    });
    if (instance) return instance;
  }

  const t = inputs.theme.light;
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
  bindCornerRadii(input, inputs.primitives.get("radius/md"));
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
  bindFontSize(text, inputs.primitives.get("font/size/sm"));
  bindFill(text, t.get("muted-foreground"));
  input.appendChild(text);
  text.layoutGrow = 1;
  return input;
}
