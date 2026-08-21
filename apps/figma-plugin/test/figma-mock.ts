// In-memory fake of the slice of the Figma plugin API that niram touches.
//
// Fidelity goal: make assertions about *which* variables/collections exist,
// their resolved type, their per-mode value, and variable aliasing meaningful.
// Node geometry and auto-layout are NOT simulated — nodes accept any property
// assignment and only track parent/child relationships, `resize()` dimensions,
// and bound variables, which is enough for the generator and the page-builder
// smoke tests.

// NOTE: this module must stay free of any `vitest` import. It is bundled
// standalone (esbuild → IIFE → QuickJS) by the QuickJS harness test, where
// `vitest` does not exist. Use the local `createSpy` below instead of `vi.fn`.

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

// Minimal call-recording spy that mirrors the slice of vitest's mock surface
// the suite actually reads (`fn.mock.calls`). Avoids a hard `vi` dependency so
// the mock can run under QuickJS.
export type Spy<A extends unknown[] = unknown[], R = unknown> = ((
  ...args: A
) => R) & { mock: { calls: A[] } };

function createSpy<A extends unknown[] = unknown[], R = unknown>(
  impl?: (...args: A) => R,
): Spy<A, R> {
  const calls: A[] = [];
  const fn = ((...args: A): R => {
    calls.push(args);
    return impl ? impl(...args) : (undefined as unknown as R);
  }) as Spy<A, R>;
  fn.mock = { calls };
  return fn;
}

export type AliasValue = { type: "VARIABLE_ALIAS"; id: string };
export type ColorValue = { r: number; g: number; b: number; a?: number };
export type ModeValue = number | string | boolean | ColorValue | AliasValue;

// A permissive node. Any property assignment is accepted at runtime (the code
// under test sees the real Figma node types via @figma/plugin-typings); we only
// give real behavior to the handful of methods/relationships we assert on.
export type FakeNode = {
  type: string;
  id: string;
  name: string;
  children: FakeNode[];
  parent: FakeNode | null;
  boundVariables: Record<string, AliasValue>;
  width: number;
  height: number;
  x: number;
  y: number;
  fills: unknown[];
  strokes: unknown[];
  effects: unknown[];
  appendChild(child: FakeNode): void;
  insertChild(index: number, child: FakeNode): void;
  resize(w: number, h: number): void;
  resizeWithoutConstraints(w: number, h: number): void;
  setBoundVariable(field: string, variable: { id: string }): void;
  setPluginData(key: string, value: string): void;
  getPluginData(key: string): string;
  setFillStyleIdAsync(styleId: string): Promise<void>;
  setEffectStyleIdAsync(styleId: string): Promise<void>;
  setTextStyleIdAsync(styleId: string): Promise<void>;
  remove(): void;
  [key: string]: unknown;
};

export type FigmaMock = ReturnType<typeof createFigmaMock>;

export type FakePaintStyle = {
  id: string;
  name: string;
  type: "PAINT";
  paints: unknown[];
  remove(): void;
};

export type FakeEffectStyle = {
  id: string;
  name: string;
  type: "EFFECT";
  effects: unknown[];
  remove(): void;
};

export type FakeTextStyle = {
  id: string;
  name: string;
  type: "TEXT";
  fontName: { family: string; style: string };
  fontSize: number;
  lineHeight: unknown;
  letterSpacing: unknown;
  boundVariables: Record<string, AliasValue>;
  setBoundVariable(field: string, variable: { id: string } | null): void;
  remove(): void;
};

export function createFigmaMock() {
  const collections = new Map<string, FakeCollection>();
  const variables = new Map<string, FakeVariable>();
  const paintStyles = new Map<string, FakePaintStyle>();
  const effectStyles = new Map<string, FakeEffectStyle>();
  const textStyles = new Map<string, FakeTextStyle>();

  // Max modes per collection, mirroring Figma's plan limits (free/Starter = 1,
  // Professional = 4, Org/Enterprise = 40+). Tests flip this via
  // figma.__setModeLimit to exercise paid-tier code paths; the default keeps
  // production's free-tier assumption honest.
  let modeLimit = 1;

  class FakeVariable {
    id = nextId("var");
    name: string;
    resolvedType: string;
    variableCollectionId: string;
    valuesByMode: Record<string, ModeValue> = {};

    constructor(name: string, type: string, collectionId: string) {
      this.name = name;
      this.resolvedType = type;
      this.variableCollectionId = collectionId;
    }

    setValueForMode(modeId: string, value: ModeValue) {
      this.valuesByMode[modeId] = value;
    }

    // Figma can't change a variable's type after creation, so the generator
    // removes and recreates. Detach from the store + owning collection.
    remove() {
      variables.delete(this.id);
      const coll = collections.get(this.variableCollectionId);
      if (coll) {
        coll.variableIds = coll.variableIds.filter((id) => id !== this.id);
      }
    }
  }

  class FakeCollection {
    id = nextId("coll");
    name: string;
    modes = [{ modeId: nextId("mode"), name: "Mode 1" }];
    variableIds: string[] = [];
    // Collection-level plugin data store (VariableCollection plugin data
    // mixin). The generator records the theming strategy here.
    __pluginData = {} as Record<string, string>;

    constructor(name: string) {
      this.name = name;
    }

    setPluginData(key: string, value: string) {
      this.__pluginData[key] = value;
    }

    getPluginData(key: string): string {
      return key in this.__pluginData ? this.__pluginData[key]! : "";
    }

    get defaultModeId() {
      return this.modes[0]!.modeId;
    }

    renameMode(modeId: string, name: string) {
      const mode = this.modes.find((m) => m.modeId === modeId);
      if (mode) mode.name = name;
    }

    removeMode(modeId: string) {
      if (this.modes.length <= 1) {
        throw new Error("Cannot remove the last mode in a collection.");
      }
      this.modes = this.modes.filter((m) => m.modeId !== modeId);
    }

    // Mirrors Figma's plan-gated addMode: throws with the real error shape
    // when the collection already holds the tier's mode limit.
    addMode(name: string): string {
      if (this.modes.length >= modeLimit) {
        throw new Error(
          `in addMode: Limited to ${modeLimit} modes only`,
        );
      }
      const mode = { modeId: nextId("mode"), name };
      this.modes.push(mode);
      return mode.modeId;
    }

    // Removes this collection and all its variables (VariableCollection#remove).
    remove() {
      collections.delete(this.id);
      for (const id of [...this.variableIds]) variables.delete(id);
    }
  }

  function detach(node: FakeNode) {
    if (node.parent) {
      const siblings = node.parent.children;
      const idx = siblings.indexOf(node);
      if (idx >= 0) siblings.splice(idx, 1);
      node.parent = null;
    }
  }

  function makeNode(type: string): FakeNode {
    const node = {
      type,
      id: nextId("node"),
      // Published component key (figma.ComponentNode#key). Real components only
      // get a non-empty key once published, but the in-memory mock hands one to
      // every node so instance-swap property defaults have something to bind.
      key: nextId("key"),
      name: "",
      children: [] as FakeNode[],
      parent: null as FakeNode | null,
      boundVariables: {} as Record<string, AliasValue>,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      fills: [] as unknown[],
      strokes: [] as unknown[],
      effects: [] as unknown[],
      appendChild(child: FakeNode) {
        detach(child);
        child.parent = node;
        node.children.push(child);
      },
      insertChild(index: number, child: FakeNode) {
        detach(child);
        child.parent = node;
        node.children.splice(index, 0, child);
      },
      resize(w: number, h: number) {
        node.width = w;
        node.height = h;
      },
      resizeWithoutConstraints(w: number, h: number) {
        node.width = w;
        node.height = h;
      },
      // Mirror Figma's constraint: a node can only be set to ABSOLUTE layout
      // positioning once it is a child of an auto-layout frame (parent
      // layoutMode !== "NONE"). Real Figma throws otherwise; the permissive
      // mock would silently accept it and let the bug reach the plugin, so we
      // validate here. Stored under a backing key the index signature exposes.
      get layoutPositioning() {
        return (node.__layoutPositioning as string | undefined) ?? "AUTO";
      },
      set layoutPositioning(value: string) {
        if (value === "ABSOLUTE") {
          const parent = node.parent;
          const parentMode = parent
            ? (parent.layoutMode as string | undefined)
            : undefined;
          if (!parent || parentMode === undefined || parentMode === "NONE") {
            throw new Error(
              "in set_layoutPositioning: Can only set layoutPositioning = ABSOLUTE if the parent node has layoutMode !== NONE",
            );
          }
        }
        node.__layoutPositioning = value;
      },
      setBoundVariable(field: string, variable: { id: string }) {
        node.boundVariables[field] = {
          type: "VARIABLE_ALIAS",
          id: variable.id,
        };
      },
      // Explicit per-node variable mode (setExplicitVariableModeForCollection).
      // Records collectionId → modeId so tests can assert which mode a node
      // pins (e.g. the Design System theme swatch halves under the modes
      // strategy).
      setExplicitVariableModeForCollection(
        collection: { id: string },
        modeId: string,
      ) {
        const store = (node.__explicitVariableModes ??= {} as Record<
          string,
          string
        >) as Record<string, string>;
        store[collection.id] = modeId;
      },
      // Component properties (figma.ComponentNode / ComponentSetNode). Records
      // each definition under a Figma-style suffixed id and returns it, so the
      // property + reference tests can assert what was wired. Variant axes use
      // a different code path (combineAsVariants), so this only sees the TEXT /
      // BOOLEAN / INSTANCE_SWAP properties the builders add.
      addComponentProperty(
        name: string,
        propType: string,
        defaultValue: string | boolean,
        options?: {
          preferredValues?: ReadonlyArray<{ type: string; key: string }>;
          description?: string;
          slotSettings?: Record<string, unknown>;
        },
      ): string {
        const store = (node.__componentProperties ??= {} as Record<
          string,
          unknown
        >) as Record<string, unknown>;
        const propertyId = `${name}#${nextId("prop")}`;
        store[propertyId] = {
          type: propType,
          defaultValue,
          preferredValues: options?.preferredValues,
          description: options?.description,
          slotSettings: options?.slotSettings,
        };
        return propertyId;
      },
      // Creates a slot node (figma.ComponentNode#createSlot). In real Figma this
      // also registers a matching SLOT component property; the mock records that
      // property keyed by the slot's name so `editComponentProperty` can update
      // it. The slot is appended as a child of the component, and exposes the
      // `clone()`/`resetSlot()` surface the SlotNode type documents.
      createSlot(): FakeNode {
        const slot = makeNode("SLOT");
        slot.clone = () => {
          const copy = makeNode("FRAME");
          copy.name = slot.name;
          return copy;
        };
        slot.resetSlot = () => {
          node.__slotResetCount = ((node.__slotResetCount as number) ?? 0) + 1;
        };
        node.appendChild(slot);
        return slot;
      },
      // Edits an existing component property (figma.ComponentNode). The mock
      // records the merged config under a Figma-style suffixed id keyed off the
      // property name, so slot-settings tests can assert preferred values,
      // description, and limit settings applied after createSlot.
      editComponentProperty(
        name: string,
        newValue: Record<string, unknown>,
      ): string {
        const store = (node.__slotProperties ??= {} as Record<
          string,
          unknown
        >) as Record<string, Record<string, unknown>>;
        const existing = (store[name] ?? {}) as Record<string, unknown>;
        store[name] = { ...existing, ...newValue };
        return `${name}#${nextId("prop")}`;
      },
      // Per-node plugin data store (figma.PluginDataMixin). The page builders
      // tag the top-level frames they own with a region key so each builder can
      // clear and rebuild only its own region on the shared Niram page.
      setPluginData(key: string, value: string) {
        if (!node.__pluginData) node.__pluginData = {};
        (node.__pluginData as Record<string, string>)[key] = value;
      },
      getPluginData(key: string): string {
        const store = node.__pluginData as Record<string, string> | undefined;
        return store && key in store ? store[key]! : "";
      },
      // Shared factory (see makeInstance below) rather than a fresh per-node
      // closure: a closure capturing `node` would add a node↔closure reference
      // cycle on *every* node, and the extra object pressure trips the
      // strict-assertion QuickJS build's teardown GC. Using a single function
      // that reads via `this` keeps the VM object graph flat.
      createInstance: makeInstance,
      setFillStyleIdAsync(styleId: string) {
        node.fillStyleId = styleId;
        return Promise.resolve();
      },
      setEffectStyleIdAsync(styleId: string) {
        node.effectStyleId = styleId;
        return Promise.resolve();
      },
      setTextStyleIdAsync(styleId: string) {
        node.textStyleId = styleId;
        return Promise.resolve();
      },
      remove() {
        detach(node);
        const rootIdx = figma.root.children.indexOf(node);
        if (rootIdx >= 0) figma.root.children.splice(rootIdx, 1);
      },
    } as FakeNode;
    return node;
  }

  function makeText(): FakeNode {
    const node = makeNode("TEXT");
    node.characters = "";
    node.fontSize = 12;
    node.fontName = { family: "Inter", style: "Regular" };
    node.textDecoration = "NONE";
    return node;
  }

  // Clone a node subtree for instance creation. Mirrors Figma's behaviour
  // where an INSTANCE contains cloned geometry so `recolorIcon` can traverse
  // and rebind paints on the instance's vectors (e.g. Button icons tinted to
  // primary-foreground rather than the icon set's foreground). Slots are not
  // cloned — a component's slot is an instance-insertion point, not concrete
  // geometry; cloning it into every instance would double-count slots when
  // the test walks the tree (the Sidebar Shell test enumerates only the
  // shell's own slots).
  function cloneNode(source: FakeNode): FakeNode {
    if (source.type === "SLOT") return makeNode("SLOT") as unknown as FakeNode;
    const clone = makeNode(source.type);
    clone.name = source.name;
    clone.width = source.width;
    clone.height = source.height;
    // Shallow-copy paints/effects so recolorIcon can mutate them per-instance.
    if (Array.isArray(source.fills)) clone.fills = [...source.fills];
    if (Array.isArray(source.strokes)) clone.strokes = [...source.strokes];
    if (Array.isArray(source.effects)) clone.effects = [...source.effects];
    for (const child of source.children) {
      // Skip slot subtrees — see comment above.
      if (child.type === "SLOT") continue;
      clone.appendChild(cloneNode(child));
    }
    return clone;
  }

  // Shared `createInstance` implementation assigned to every node (see
  // makeNode). Called as `component.createInstance()`, so `this` is the source
  // component. Returns a fresh, detached INSTANCE that copies the component's
  // size/name and clones its subtree so per-instance overrides (like recoloring
  // a Button icon to the variant's label colour) are testable. It deliberately
  // does NOT back-reference the main component (a cross-tree pointer would
  // bloat the VM object graph the strict-assertion QuickJS build inspects on
  // teardown), and nothing under test reads the back-reference directly.
  function makeInstance(this: FakeNode): FakeNode {
    const instance = makeNode("INSTANCE");
    instance.width = this.width;
    instance.height = this.height;
    instance.name = this.name;
    for (const child of this.children) {
      if (child.type === "SLOT") continue;
      instance.appendChild(cloneNode(child));
    }
    // Ensure the instance has at least one paint-bearing vector when the
    // source component has no children (e.g. minimal test stubs like
    // `Icon=bold` with no geometry). This keeps `recolorIcon` testable even
    // for those stubs.
    if (instance.children.length === 0) {
      const vector = makeNode("VECTOR");
      vector.fills = [
        { type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 },
      ];
      vector.strokes = [
        { type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 },
      ];
      instance.appendChild(vector);
    }
    return instance;
  }

  const figma = {
    mixed: Symbol("figma.mixed"),

    variables: {
      getLocalVariableCollectionsAsync: () =>
        Promise.resolve([...collections.values()]),
      createVariableCollection: (name: string) => {
        const collection = new FakeCollection(name);
        collections.set(collection.id, collection);
        return collection;
      },
      getVariableCollectionByIdAsync: (id: string) =>
        Promise.resolve(collections.get(id) ?? null),
      getVariableByIdAsync: (id: string) =>
        Promise.resolve(variables.get(id) ?? null),
      createVariable: (
        name: string,
        collection: FakeCollection,
        type: string,
      ) => {
        const variable = new FakeVariable(name, type, collection.id);
        variables.set(variable.id, variable);
        collection.variableIds.push(variable.id);
        return variable;
      },
      createVariableAlias: (target: { id: string }): AliasValue => ({
        type: "VARIABLE_ALIAS",
        id: target.id,
      }),
      setBoundVariableForPaint: (
        paint: Record<string, unknown>,
        field: string,
        variable: { id: string },
      ) => ({
        ...paint,
        boundVariables: {
          ...((paint.boundVariables as object) ?? {}),
          [field]: { type: "VARIABLE_ALIAS", id: variable.id },
        },
      }),
      setBoundVariableForEffect: (
        effect: Record<string, unknown>,
        field: string,
        variable: { id: string },
      ) => ({
        ...effect,
        boundVariables: {
          ...((effect.boundVariables as object) ?? {}),
          [field]: { type: "VARIABLE_ALIAS", id: variable.id },
        },
      }),
    },

    createFrame: () => makeNode("FRAME"),
    createText: () => makeText(),
    createComponent: () => makeNode("COMPONENT"),
    createRectangle: () => makeNode("RECTANGLE"),
    createEllipse: () => makeNode("ELLIPSE"),
    createVector: () => makeNode("VECTOR"),
    createPage: () => {
      const page = makeNode("PAGE");
      figma.root.children.push(page);
      return page;
    },
    createImage: (_bytes: Uint8Array) => ({ hash: nextId("img") }),
    base64Decode: (_value: string) => new Uint8Array(),

    // createNodeFromSvg parses SVG markup into a FRAME containing vector
    // children. The real API gives the wrapper frame its own (often white or
    // transparent-but-present) background fill and resolves `currentColor` to a
    // black paint on the shapes. We mirror both: a background fill on the
    // wrapper (so consumers must clear it) plus child vectors carrying fills
    // and strokes for the Design System icon section's recolor pass to rebind.
    // The number of vectors matches the number of <path>/<line>/<rect>/<circle>
    // elements so multi-path icons (e.g. "table" with 4 paths) are faithfully
    // represented and the flatten test can verify the single-vector collapse.
    createNodeFromSvg: (_svg: string) => {
      const frame = makeNode("FRAME");
      frame.width = 24;
      frame.height = 24;
      frame.fills = [
        { type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 },
      ];
      // Count SVG shape elements to decide how many vectors to emit. The
      // bundled icons are all <path> (lucide) or a mix of <path>/<rect>/...;
      // counting "<" gives a reasonable proxy for the real API's vector count.
      const pathCount = (_svg.match(/<(path|line|rect|circle|ellipse|polygon|polyline)/g) || []).length;
      const vectorCount = Math.max(1, pathCount || 1);
      for (let i = 0; i < vectorCount; i++) {
        const vector = makeNode("VECTOR");
        vector.name = "Vector";
        vector.fills = [
          { type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 },
        ];
        vector.strokes = [
          { type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 },
        ];
        frame.appendChild(vector);
      }
      return frame;
    },

    // Flatten the given nodes into a single vector (like figma.flatten). Used
    // by the icon builder to collapse multi-path icons into one vector so
    // instance-swap colour overrides are 1:1.
    flatten: (nodes: FakeNode[], parent: FakeNode) => {
      if (nodes.length === 0) {
        const v = makeNode("VECTOR");
        v.name = "Vector";
        if (parent && typeof parent.appendChild === "function") parent.appendChild(v);
        return v;
      }
      // Use the first node's paints as the representative paint for the
      // flattened result (the recolor pass will rebind it anyway).
      const first = nodes[0]!;
      const flat = makeNode("VECTOR");
      flat.name = "Vector";
      flat.width = 24;
      flat.height = 24;
      if (Array.isArray(first.fills)) flat.fills = [...first.fills];
      if (Array.isArray(first.strokes)) flat.strokes = [...first.strokes];
      // Remove the original nodes from their parent and insert the flat.
      for (const n of nodes) {
        const idx = parent.children.indexOf(n);
        if (idx >= 0) parent.children.splice(idx, 1);
        n.parent = null;
      }
      parent.appendChild(flat);
      return flat;
    },

    createPaintStyle: (): FakePaintStyle => {
      const style: FakePaintStyle = {
        id: nextId("style"),
        name: "",
        type: "PAINT",
        paints: [],
        remove() {
          paintStyles.delete(style.id);
        },
      };
      paintStyles.set(style.id, style);
      return style;
    },
    getLocalPaintStylesAsync: () => Promise.resolve([...paintStyles.values()]),

    createEffectStyle: (): FakeEffectStyle => {
      const style: FakeEffectStyle = {
        id: nextId("style"),
        name: "",
        type: "EFFECT",
        effects: [],
        remove() {
          effectStyles.delete(style.id);
        },
      };
      effectStyles.set(style.id, style);
      return style;
    },
    getLocalEffectStylesAsync: () =>
      Promise.resolve([...effectStyles.values()]),

    createTextStyle: (): FakeTextStyle => {
      const style: FakeTextStyle = {
        id: nextId("style"),
        name: "",
        type: "TEXT",
        fontName: { family: "Inter", style: "Regular" },
        fontSize: 16,
        lineHeight: { unit: "AUTO" },
        letterSpacing: { unit: "PERCENT", value: 0 },
        boundVariables: {},
        setBoundVariable(field: string, variable: { id: string } | null) {
          if (variable === null) {
            delete style.boundVariables[field];
            return;
          }
          style.boundVariables[field] = {
            type: "VARIABLE_ALIAS",
            id: variable.id,
          };
        },
        remove() {
          textStyles.delete(style.id);
        },
      };
      textStyles.set(style.id, style);
      return style;
    },
    getLocalTextStylesAsync: () => Promise.resolve([...textStyles.values()]),

    combineAsVariants: (components: FakeNode[], parent: FakeNode) => {
      const set = makeNode("COMPONENT_SET");
      for (const component of components) {
        detach(component);
        component.parent = set;
        set.children.push(component);
      }
      if (parent) {
        set.parent = parent;
        parent.children.push(set);
      }
      return set;
    },

    loadFontAsync: createSpy(() => Promise.resolve()),
    loadAllPagesAsync: createSpy(() => Promise.resolve()),
    setCurrentPageAsync: createSpy((page: FakeNode) => {
      figma.currentPage = page;
      return Promise.resolve();
    }),

    notify: createSpy(),
    showUI: createSpy(),
    closePlugin: createSpy(),
    ui: { postMessage: createSpy(), onmessage: null as unknown },
    viewport: { scrollAndZoomIntoView: createSpy() },

    // clientStorage (figma.clientStorage): in-memory key/value store. The
    // generate flow persists the UI's theming-strategy selection here.
    clientStorage: (() => {
      const store = new Map<string, string>();
      return {
        getAsync: (key: string) =>
          Promise.resolve(store.has(key) ? store.get(key)! : null),
        setAsync: (key: string, value: string) => {
          store.set(key, value);
          return Promise.resolve();
        },
        deleteAsync: (key: string) => {
          store.delete(key);
          return Promise.resolve();
        },
      };
    })(),

    // Test-only knob mirroring Figma's per-plan mode limits. Default 1 keeps
    // the free-tier behavior; raise it to exercise paid-tier paths.
    __setModeLimit: (limit: number) => {
      modeLimit = limit;
    },

    // Document-level plugin data store (figma.DocumentNode). The generate flow
    // persists the progress reporter's per-phase durations here so the next
    // run can calibrate its weighted bar against real time.
    root: (() => {
      const rootStore: Record<string, string> = {};
      return {
        children: [] as FakeNode[],
        setPluginData(key: string, value: string) {
          rootStore[key] = value;
        },
        getPluginData(key: string): string {
          return key in rootStore ? rootStore[key]! : "";
        },
      };
    })(),
    currentPage: null as FakeNode | null,
  };

  return figma;
}
