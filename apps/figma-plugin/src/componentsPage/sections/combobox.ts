// Combobox: an autocomplete input paired with a popover list. shadcn composes
// it from an InputGroup trigger (`h-8 rounded-lg border-input` with a trailing
// chevron) over a ComboboxContent popover (`rounded-lg bg-popover p-1 shadow-md
// ring-1 ring-foreground/10`). Items mirror ComboboxItem (`gap-2 rounded-md
// py-1 pr-8 pl-1.5 text-sm`) with a trailing check on the selected option
// (`data-highlighted:bg-accent`).
//
// We surface the common compositions designers actually swap as a curated
// `Variant` axis — trigger + open popup rendered together so the whole pattern
// reads at a glance:
//   default   — single value, selected option carries a trailing check
//   clearable — trigger gains a clear (×) button before the chevron
//   multiple  — trigger shows selected chips, multiple options checked
//   grouped   — popup splits options under group labels
//   disabled  — trigger at reduced opacity with a placeholder, no popup
//
// Every variant binds the selected preset's semantic tokens, radius, font, and
// icon library.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { applyEffectStyle } from "../../effectStyles";
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const COMBOBOX_VARIANTS = [
  "default",
  "clearable",
  "multiple",
  "grouped",
  "disabled",
] as const;
type ComboboxVariant = (typeof COMBOBOX_VARIANTS)[number];

const COMBOBOX_WIDTH = 280;

type Option = { label: string; selected?: boolean; group?: string };
const OPTIONS: Option[] = [
  { label: "Next.js" },
  { label: "SvelteKit" },
  { label: "Nuxt.js", selected: true },
  { label: "Remix" },
  { label: "Astro" },
];

const GROUPED_OPTIONS: Option[] = [
  { label: "Next.js", group: "React" },
  { label: "Remix", group: "React", selected: true },
  { label: "SvelteKit", group: "Svelte" },
  { label: "Nuxt.js", group: "Vue" },
];

export async function addComboboxSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of COMBOBOX_VARIANTS) {
    const comp = await buildComboboxComponent(inputs, variant);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Combobox";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

async function buildComboboxComponent(
  inputs: ComponentsInputs,
  variant: ComboboxVariant,
): Promise<ComponentNode> {
  const comp = figma.createComponent();
  comp.name = `Variant=${variant}`;
  comp.layoutMode = "VERTICAL";
  comp.resize(COMBOBOX_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  // sideOffset between the trigger and the popup (`sideOffset={6}`).
  comp.itemSpacing = 6;
  comp.fills = [];
  comp.strokes = [];

  // Trigger (InputGroup with a trailing chevron).
  const trigger = buildTrigger(inputs, variant);
  comp.appendChild(trigger);
  trigger.layoutSizingHorizontal = "FILL";

  // The disabled variant previews the resting trigger only (dimmed); every
  // other variant shows the open popup beneath it.
  if (variant === "disabled") {
    comp.opacity = 0.5;
    return comp;
  }

  const popup = buildPopup(inputs, variant, comp);
  comp.appendChild(popup);
  popup.layoutSizingHorizontal = "FILL";
  // ComboboxContent uses `shadow-md`.
  await applyEffectStyle(popup, inputs.effectStyles?.idFor("Shadow/md"));

  return comp;
}

function buildTrigger(
  inputs: ComponentsInputs,
  variant: ComboboxVariant,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const trigger = figma.createFrame();
  trigger.name = "Trigger";
  trigger.layoutMode = "HORIZONTAL";
  trigger.primaryAxisSizingMode = "FIXED";
  trigger.counterAxisSizingMode = "FIXED";
  trigger.primaryAxisAlignItems = "MIN";
  trigger.counterAxisAlignItems = "CENTER";
  trigger.resize(COMBOBOX_WIDTH, variant === "multiple" ? 36 : 32);
  // InputGroup: `h-8 rounded-lg border-input`, addon `pr-2`.
  trigger.itemSpacing = 6;
  trigger.paddingLeft = variant === "multiple" ? 6 : 10;
  trigger.paddingRight = 8;
  trigger.cornerRadius = 8;
  bindCornerRadii(trigger, p.get("radius/lg"));
  bindFill(trigger, t.get("background"));
  bindStrokeColor(trigger, t.get("input"));
  trigger.strokeWeight = 1;
  trigger.strokeAlign = "INSIDE";

  if (variant === "multiple") {
    // Selected values rendered as chips that grow to fill the trigger.
    const chips = figma.createFrame();
    chips.name = "Chips";
    chips.layoutMode = "HORIZONTAL";
    chips.primaryAxisSizingMode = "AUTO";
    chips.counterAxisSizingMode = "AUTO";
    chips.counterAxisAlignItems = "CENTER";
    chips.itemSpacing = 4;
    chips.fills = [];
    chips.strokes = [];
    chips.appendChild(buildChip(inputs, "Next.js"));
    chips.appendChild(buildChip(inputs, "Remix"));
    trigger.appendChild(chips);
    chips.layoutGrow = 1;
  } else {
    const value = figma.createText();
    applyFont(value, "body", "Regular");
    const showsPlaceholder = variant === "disabled";
    value.characters = showsPlaceholder ? "Select framework…" : "Nuxt.js";
    value.fontSize = 14;
    bindFontSize(value, p.get("font/size/sm"));
    bindFill(
      value,
      showsPlaceholder ? t.get("muted-foreground") : t.get("foreground"),
    );
    trigger.appendChild(value);
    value.layoutGrow = 1;
  }

  // Clearable triggers gain a clear (×) button before the chevron.
  if (variant === "clearable") {
    trigger.appendChild(buildClearButton(inputs));
  }

  trigger.appendChild(buildChevronDown(t));

  return trigger;
}

// A small dismissable chip used by the `multiple` trigger (`rounded-sm bg-
// secondary px-1.5 text-xs`).
function buildChip(inputs: ComponentsInputs, label: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const chip = figma.createFrame();
  chip.name = "Chip";
  chip.layoutMode = "HORIZONTAL";
  chip.primaryAxisSizingMode = "AUTO";
  chip.counterAxisSizingMode = "AUTO";
  chip.counterAxisAlignItems = "CENTER";
  chip.itemSpacing = 4;
  chip.paddingLeft = 6;
  chip.paddingRight = 4;
  chip.paddingTop = 2;
  chip.paddingBottom = 2;
  chip.cornerRadius = 4;
  bindCornerRadii(chip, p.get("radius/sm"));
  bindFill(chip, t.get("secondary"));
  chip.strokes = [];

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 12;
  bindFontSize(text, p.get("font/size/xs"));
  bindFill(text, t.get("secondary-foreground"));
  chip.appendChild(text);

  const x = buildXMark(t.get("secondary-foreground"));
  chip.appendChild(x);

  return chip;
}

// A clear (×) button for the clearable trigger.
function buildClearButton(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;

  const btn = figma.createFrame();
  btn.name = "Clear";
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "FIXED";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.resize(16, 16);
  btn.fills = [];
  btn.strokes = [];
  btn.appendChild(buildXMark(t.get("muted-foreground")));
  return btn;
}

function buildXMark(color: Variable | undefined): VectorNode {
  const x = figma.createVector();
  x.name = "Clear";
  x.resize(12, 12);
  x.vectorPaths = [{ windingRule: "NONZERO", data: "M 3 3 L 9 9 M 9 3 L 3 9" }];
  x.strokeWeight = 1.5;
  x.strokeCap = "ROUND";
  x.fills = [];
  bindStrokeColor(x, color);
  return x;
}

function buildPopup(
  inputs: ComponentsInputs,
  variant: ComboboxVariant,
  comp: ComponentNode,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const popup = figma.createFrame();
  popup.name = "Content";
  popup.layoutMode = "VERTICAL";
  popup.resize(COMBOBOX_WIDTH, 10);
  popup.primaryAxisSizingMode = "AUTO";
  popup.counterAxisSizingMode = "FIXED";
  // `p-1 rounded-lg`.
  popup.itemSpacing = 0;
  popup.paddingTop = 4;
  popup.paddingBottom = 4;
  popup.paddingLeft = 4;
  popup.paddingRight = 4;
  popup.cornerRadius = 8;
  bindCornerRadii(popup, p.get("radius/lg"));
  bindFill(popup, t.get("popover"));
  bindStrokeColor(popup, t.get("border"));
  popup.strokeWeight = 1;
  popup.strokeAlign = "INSIDE";

  // Gather the option rows (and group labels) into a slot so instances can
  // add/remove/reorder options without detaching.
  const children: SceneNode[] = [];
  if (variant === "grouped") {
    let currentGroup: string | undefined;
    for (const option of GROUPED_OPTIONS) {
      if (option.group !== currentGroup) {
        currentGroup = option.group;
        children.push(buildGroupLabel(inputs, currentGroup ?? ""));
      }
      children.push(buildOption(inputs, option));
    }
  } else {
    // `multiple` checks the first two options; the others single-select Nuxt.js.
    const multiSelected = new Set(["Next.js", "Remix"]);
    for (const option of OPTIONS) {
      const selected =
        variant === "multiple"
          ? multiSelected.has(option.label)
          : option.selected;
      children.push(buildOption(inputs, { ...option, selected }));
    }
  }

  const items = createConfiguredSlot(comp, "Items", children, {
    description: "Combobox options.",
    settings: { minChildren: 1 },
  });
  popup.appendChild(items);
  items.layoutMode = "VERTICAL";
  items.primaryAxisSizingMode = "AUTO";
  items.counterAxisSizingMode = "FIXED";
  items.itemSpacing = 0;
  items.fills = [];
  items.strokes = [];
  items.layoutSizingHorizontal = "FILL";
  for (const child of children) {
    (child as FrameNode).layoutSizingHorizontal = "FILL";
  }

  return popup;
}

function buildGroupLabel(inputs: ComponentsInputs, text: string): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = "Group Label";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.counterAxisAlignItems = "CENTER";
  row.paddingLeft = 6;
  row.paddingRight = 6;
  row.paddingTop = 6;
  row.paddingBottom = 4;
  row.fills = [];
  row.strokes = [];

  const label = figma.createText();
  applyFont(label, "body", "Medium");
  label.characters = text;
  label.fontSize = 12;
  bindFontSize(label, p.get("font/size/xs"));
  bindFill(label, t.get("muted-foreground"));
  row.appendChild(label);

  return row;
}

function buildOption(inputs: ComponentsInputs, option: Option): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = option.selected ? "Item (selected)" : "Item";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.primaryAxisAlignItems = "MIN";
  row.counterAxisAlignItems = "CENTER";
  // `gap-2 rounded-md py-1 pr-8 pl-1.5`.
  row.itemSpacing = 8;
  row.paddingLeft = 6;
  row.paddingRight = 8;
  row.paddingTop = 4;
  row.paddingBottom = 4;
  row.cornerRadius = 6;
  bindCornerRadii(row, p.get("radius/md"));
  // The selected (highlighted) row gets the accent surface.
  if (option.selected) {
    bindFill(row, t.get("accent"));
  } else {
    row.fills = [];
  }
  row.strokes = [];

  const label = figma.createText();
  applyFont(label, "body", "Regular");
  label.characters = option.label;
  label.fontSize = 14;
  bindFontSize(label, p.get("font/size/sm"));
  bindFill(
    label,
    option.selected ? t.get("accent-foreground") : t.get("popover-foreground"),
  );
  row.appendChild(label);
  label.layoutGrow = 1;

  // Trailing check indicator on the selected option (`ComboboxItemIndicator`).
  if (option.selected) {
    const check = createIcon({
      library: resolveIconLibrary(inputs.presetSummary),
      name: "check",
      size: 16,
      color: t.get("accent-foreground"),
    });
    if (check) {
      check.name = "Check";
      row.appendChild(check);
    }
  }

  return row;
}

function buildChevronDown(t: Map<string, Variable>): VectorNode {
  const chevron = figma.createVector();
  chevron.name = "Chevron";
  chevron.resize(16, 16);
  chevron.vectorPaths = [
    {
      windingRule: "NONZERO",
      data: "M 4 6 L 8 10 L 12 6",
    },
  ];
  chevron.strokeWeight = 1.5;
  chevron.strokeCap = "ROUND";
  chevron.strokeJoin = "ROUND";
  chevron.fills = [];
  bindStrokeColor(chevron, t.get("muted-foreground"));
  return chevron;
}
