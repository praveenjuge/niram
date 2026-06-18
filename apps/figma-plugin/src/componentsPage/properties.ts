// Reusable wiring for Figma component properties.
//
// Component properties let designers edit an instance without diving into its
// layers: a text property exposes a label, a boolean property toggles a layer's
// visibility, and an instance-swap property swaps a nested instance (e.g. an
// icon) for another. Niram adds a focused set of these to high-value
// components so the generated library is ergonomic to use.
//
// These are thin wrappers over the direct Figma API
// (`addComponentProperty` + `componentPropertyReferences`) with two jobs:
//   1. Guard the calls so a missing API surface or a rejected reference never
//      breaks generation (property wiring is a nicety, not load-bearing).
//   2. Fan a single property out across every variant node that should share
//      it (a TEXT property on a set is defined once but referenced from the
//      matching text node in each variant).
//
// Sandbox-safe: no DOM, no network — runs inside Figma's QuickJS sandbox.

// The container that owns the property: a ComponentSetNode for variant sets, or
// a standalone ComponentNode for single components (Label, Dialog, …).
type PropertyContainer = {
  addComponentProperty?(
    name: string,
    type: string,
    defaultValue: string | boolean,
    options?: ComponentPropertyOptionsLike,
  ): string;
};

type InstanceSwapPreferredValue = {
  type: "COMPONENT" | "COMPONENT_SET";
  key: string;
};

// The options bag `addComponentProperty` accepts. `preferredValues` applies to
// INSTANCE_SWAP and SLOT; `description` + `slotSettings` apply to SLOT only.
type ComponentPropertyOptionsLike = {
  preferredValues?: ReadonlyArray<InstanceSwapPreferredValue>;
  description?: string;
  slotSettings?: SlotSettings;
};

// Per-property limits Figma enforces on a SLOT. Mirrors the plugin API's
// `SlotSettings`; every field is optional so callers only set what they need.
//   - stretchChildOnInsert: inserted children stretch to fill the slot
//   - displayEmptyByDefault: the slot ships empty rather than with defaults
//   - minChildren / maxChildren: child-count bounds (null clears a bound)
//   - allowPreferredValuesOnly: restrict inserts to the preferred instances
export type SlotSettings = {
  stretchChildOnInsert?: boolean;
  displayEmptyByDefault?: boolean;
  minChildren?: number | null;
  maxChildren?: number | null;
  allowPreferredValuesOnly?: boolean;
};

// Niram-facing options for a slot: the curated swap choices Figma offers first,
// a human description shown in the properties panel, and the limit settings.
export type SlotOptions = {
  preferredValues?: ReadonlyArray<InstanceSwapPreferredValue>;
  description?: string;
  settings?: SlotSettings;
};

// A node that can reference a component property (text, visibility, swap).
type ReferenceableNode = {
  componentPropertyReferences?: Record<string, string> | null;
};

// The Figma node-property a reference binds to.
type ReferenceField = "characters" | "visible" | "mainComponent";

// Point a node's property reference at a created component-property id, merging
// with any existing references on the node.
function setReference(
  node: ReferenceableNode,
  field: ReferenceField,
  propertyId: string,
): void {
  const existing = node.componentPropertyReferences ?? {};
  node.componentPropertyReferences = { ...existing, [field]: propertyId };
}

// Add the property to the container, guarding both the API presence and a
// possible throw (e.g. a duplicate name). Returns the property id, or undefined
// when the property could not be created.
function addProperty(
  container: PropertyContainer,
  name: string,
  type: string,
  defaultValue: string | boolean,
  options?: ComponentPropertyOptionsLike,
): string | undefined {
  if (typeof container.addComponentProperty !== "function") return undefined;
  try {
    return container.addComponentProperty(name, type, defaultValue, options);
  } catch {
    return undefined;
  }
}

// Define a TEXT property and point each given text node's `characters` at it.
// The default value seeds the property; pass the copy the component ships with.
export function defineTextProperty(
  container: PropertyContainer,
  name: string,
  defaultValue: string,
  textNodes: ReadonlyArray<ReferenceableNode>,
): string | undefined {
  if (textNodes.length === 0) return undefined;
  const id = addProperty(container, name, "TEXT", defaultValue);
  if (id === undefined) return undefined;
  for (const node of textNodes) setReference(node, "characters", id);
  return id;
}

// Define a BOOLEAN property and bind each given node's `visible` to it, so the
// property toggles those layers. Use it for optional icons, descriptions, and
// helper/error text that already exist as layers.
export function defineBooleanProperty(
  container: PropertyContainer,
  name: string,
  defaultValue: boolean,
  nodes: ReadonlyArray<ReferenceableNode>,
): string | undefined {
  if (nodes.length === 0) return undefined;
  const id = addProperty(container, name, "BOOLEAN", defaultValue);
  if (id === undefined) return undefined;
  for (const node of nodes) setReference(node, "visible", id);
  return id;
}

// Define an INSTANCE_SWAP property for icon (or other instance) slots and bind
// each given instance's `mainComponent` to it. `defaultComponentKey` is the
// published key of the component shown by default; `preferredValues` are the
// curated swap choices Figma offers first (e.g. the Design System icon set).
// Both are best-effort: when the default key is missing the property is skipped
// so we never create an invalid swap.
export function defineInstanceSwapProperty(
  container: PropertyContainer,
  name: string,
  defaultComponentKey: string | undefined,
  instances: ReadonlyArray<ReferenceableNode>,
  preferredValues?: ReadonlyArray<InstanceSwapPreferredValue>,
): string | undefined {
  if (instances.length === 0) return undefined;
  if (!defaultComponentKey) return undefined;
  const options =
    preferredValues && preferredValues.length > 0
      ? { preferredValues }
      : undefined;
  const id = addProperty(
    container,
    name,
    "INSTANCE_SWAP",
    defaultComponentKey,
    options,
  );
  if (id === undefined) return undefined;
  for (const node of instances) setReference(node, "mainComponent", id);
  return id;
}

// A source icon component used to seed an instance-swap property: its `key` is
// the default swap value, and its owning component set (its parent) becomes the
// preferred swap choice Figma offers first.
type IconSwapSource = {
  key?: string;
  parent?: { type: string; key?: string } | null;
};

// Convenience over defineInstanceSwapProperty for the common icon-slot case:
// derive the default component key + preferred values (the Design System icon
// set) from the source icon component, then wire the property. Best-effort —
// no-ops when the source or its published key is missing.
export function defineIconSwapProperty(
  container: PropertyContainer,
  name: string,
  source: IconSwapSource | undefined,
  instances: ReadonlyArray<ReferenceableNode>,
): string | undefined {
  if (!source) return undefined;
  const parent = source.parent;
  const preferredValues =
    parent && parent.type === "COMPONENT_SET" && parent.key
      ? [{ type: "COMPONENT_SET" as const, key: parent.key }]
      : undefined;
  return defineInstanceSwapProperty(
    container,
    name,
    source.key,
    instances,
    preferredValues,
  );
}

// ---------------------------------------------------------------------------
// Slots
//
// A SLOT is a flexible content region: designers can add, remove, and reorder
// children inside an instance without detaching it, while staying inside the
// component's chrome. Unlike text/visibility/swap properties (wired via
// `componentPropertyReferences`), a slot is a real node created by
// `component.createSlot()`, which also registers the matching SLOT component
// property. Niram adds slots only where they buy real composability (card and
// dialog content/action regions, repeated item lists, form composition).
//
// Both helpers are best-effort and host-version aware: on a host without slot
// support they degrade to a plain named frame so generation never breaks.
// ---------------------------------------------------------------------------

// A frame-like node we can name and fill with default content. Satisfied by
// both a real SlotNode (native path) and a FrameNode (fallback path).
type SlotLikeNode = {
  name: string;
  appendChild(child: SceneNode): void;
};

// A component that may expose the slot API surface. ComponentNode satisfies
// this; the optional members let us probe support at runtime on older hosts.
type SlotHost = PropertyContainer & {
  createSlot?(): SlotNode;
  editComponentProperty?(
    name: string,
    newValue: {
      preferredValues?: InstanceSwapPreferredValue[];
      description?: string;
      slotSettings?: SlotSettings;
    },
  ): string;
  appendChild?(child: SceneNode): void;
};

// Translate Niram's SlotOptions into the API options bag, dropping empty
// fields. Returns undefined when nothing meaningful is set so callers can pass
// it straight through (and the no-op short-circuits stay clean).
function slotApiOptions(
  options: SlotOptions | undefined,
): ComponentPropertyOptionsLike | undefined {
  if (!options) return undefined;
  const out: ComponentPropertyOptionsLike = {};
  if (options.preferredValues && options.preferredValues.length > 0) {
    out.preferredValues = options.preferredValues;
  }
  if (options.description) out.description = options.description;
  if (options.settings) out.slotSettings = options.settings;
  if (
    out.preferredValues === undefined &&
    out.description === undefined &&
    out.slotSettings === undefined
  ) {
    return undefined;
  }
  return out;
}

function appendChildren(
  parent: { appendChild(child: SceneNode): void },
  children: ReadonlyArray<SceneNode>,
): void {
  for (const child of children) parent.appendChild(child);
}

// Apply preferred values / description / limit settings to a native slot's
// property after creation. createSlot already registered the property, so we
// edit it rather than add a duplicate. Best-effort and guarded.
function configureNativeSlot(
  component: SlotHost,
  name: string,
  options: SlotOptions | undefined,
): void {
  const apiOptions = slotApiOptions(options);
  if (!apiOptions) return;
  if (typeof component.editComponentProperty !== "function") return;
  try {
    component.editComponentProperty(name, {
      preferredValues: apiOptions.preferredValues
        ? [...apiOptions.preferredValues]
        : undefined,
      description: apiOptions.description,
      slotSettings: apiOptions.slotSettings,
    });
  } catch {
    // The slot still exists; it is just left unconfigured.
  }
}

// Register a SLOT component property on the container. Thin guarded wrapper over
// `addComponentProperty(name, "SLOT", …)`; returns the suffixed property id, or
// undefined when the API is missing or the call throws. Used directly on the
// fallback path; native slots get their property from `createSlot()` instead.
export function defineSlotProperty(
  container: PropertyContainer,
  name: string,
  options?: SlotOptions,
): string | undefined {
  return addProperty(container, name, "SLOT", "", slotApiOptions(options));
}

// Create a configured content slot on a component. On a slot-capable host this
// uses `component.createSlot()` (which also registers the SLOT property), names
// the slot, seeds it with `defaultChildren`, and applies the preferred
// instances / description / limit settings. On an older host it degrades to a
// plain named frame appended to the component plus a best-effort SLOT property,
// so the structure is preserved either way. Returns the slot/frame node so the
// caller can keep styling it (layout, sizing, fills).
export function createConfiguredSlot(
  component: SlotHost,
  name: string,
  defaultChildren: ReadonlyArray<SceneNode>,
  options?: SlotOptions,
): SlotNode | FrameNode {
  if (typeof component.createSlot === "function") {
    let slot: SlotNode | undefined;
    try {
      slot = component.createSlot();
    } catch {
      slot = undefined;
    }
    if (slot) {
      slot.name = name;
      appendChildren(slot, defaultChildren);
      configureNativeSlot(component, name, options);
      return slot;
    }
  }

  const frame = figma.createFrame();
  frame.name = name;
  appendChildren(frame, defaultChildren);
  if (typeof component.appendChild === "function") {
    component.appendChild(frame);
  }
  defineSlotProperty(component, name, options);
  return frame;
}

// Collect every descendant (and the root itself) of a given Figma node type and
// name within a tree. Used by section builders to gather the matching text /
// icon node from each variant after `combineAsVariants`, so one property can be
// fanned across the whole set.
export function collectByTypeAndName(
  root: { type: string; name: string; children?: ReadonlyArray<unknown> },
  type: string,
  name: string,
): Array<ReferenceableNode> {
  const out: Array<ReferenceableNode> = [];

  function visit(node: {
    type: string;
    name: string;
    children?: ReadonlyArray<unknown>;
  }) {
    if (node.type === type && node.name === name) {
      out.push(node as unknown as ReferenceableNode);
    }
    const children = node.children;
    if (children) {
      for (const child of children) {
        visit(
          child as {
            type: string;
            name: string;
            children?: ReadonlyArray<unknown>;
          },
        );
      }
    }
  }

  visit(root);
  return out;
}
