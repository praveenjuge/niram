// Misc helpers shared by the Components page.

import { loadPresetFonts } from "../fonts";
import type { ComponentsInputs } from "./types";

// Load the preset fonts for the Components page and activate them. Falls back
// to Inter when the inputs don't carry preset fonts (older callers/tests).
export async function loadComponentsFonts(
  inputs: ComponentsInputs,
): Promise<void> {
  const body = inputs.fonts ? inputs.fonts.body : "Inter";
  const heading = inputs.fonts ? inputs.fonts.heading : "Inter";
  await loadPresetFonts({ body, heading, fontVars: inputs.fontVars });
}

export function countDescendants(node: SceneNode): number {
  let count = 1;
  if ("children" in node) {
    for (const child of node.children) count += countDescendants(child);
  }
  return count;
}

// Find a component the page already built so another section can embed a live
// instance of it (the same reuse model the Toggle uses for the icon set). It
// looks for either:
//   - a ComponentSet named `name` → returns the variant whose name matches
//     `variant` (or the first variant when omitted/absent), or
//   - a standalone Component named `name` (e.g. Label, which is wrapped in a
//     section card rather than combined into a set).
// Returns undefined when nothing matches, so callers can fall back.
export function findInstanceSource(
  root: SceneNode,
  name: string,
  variant?: string,
): ComponentNode | undefined {
  let setMatch: ComponentNode | undefined;
  let componentMatch: ComponentNode | undefined;

  function visit(node: SceneNode): void {
    if (setMatch) return;

    if (node.type === "COMPONENT_SET" && node.name === name) {
      const children = (node as ChildrenMixin).children as SceneNode[];
      if (variant !== undefined) {
        for (const child of children) {
          if (child.type === "COMPONENT" && child.name === variant) {
            setMatch = child as ComponentNode;
            return;
          }
        }
      }
      for (const child of children) {
        if (child.type === "COMPONENT") {
          setMatch = child as ComponentNode;
          return;
        }
      }
      return;
    }

    if (node.type === "COMPONENT" && node.name === name) {
      componentMatch = node as ComponentNode;
      return;
    }

    if ("children" in node) {
      for (const child of (node as ChildrenMixin).children as SceneNode[]) {
        visit(child);
      }
    }
  }

  visit(root);
  return setMatch ?? componentMatch;
}

// Create an instance of a page-built component, optionally retargeting its
// first text descendant so the embedding composition reads correctly (e.g. a
// reused Label saying "Email" instead of its default copy). Best-effort: hosts
// that reject the instance or the text edit leave the default in place.
export function instantiateBuiltComponent(
  source: ComponentNode,
  overrideText?: string,
): InstanceNode | undefined {
  if (typeof source.createInstance !== "function") return undefined;
  const instance = source.createInstance();
  if (overrideText !== undefined) overrideFirstText(instance, overrideText);
  return instance;
}

// Set the characters of the first text node found in a subtree. The page's
// fonts are already loaded, so editing the override is safe; still guarded so a
// host rejection (locked layer, mixed font) keeps the original text.
function overrideFirstText(root: SceneNode, text: string): boolean {
  if (root.type === "TEXT") {
    try {
      (root as unknown as { characters: string }).characters = text;
      return true;
    } catch {
      return false;
    }
  }
  if ("children" in root) {
    for (const child of (root as ChildrenMixin).children as SceneNode[]) {
      if (overrideFirstText(child, text)) return true;
    }
  }
  return false;
}
