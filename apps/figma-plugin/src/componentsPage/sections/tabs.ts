// Tabs: a list with one trigger active. Two variants (default / line) ×
// three active indices.
//
// Mirrors radix-nova's Tabs (radix-ui primitive). The `default` variant is a
// `bg-muted` rounded list whose active trigger gets the `bg-background`
// surface plus a subtle drop shadow. The `line` variant is a transparent,
// square list (`gap-1 bg-transparent rounded-none`) whose active trigger has
// no surface — it's marked by a 2px `foreground` underline (the source's
// `after:` indicator).

import { bindCornerRadii, bindFill, bindFontSize } from "../bindings";
import { applyFont } from "../../fonts";
import { applyEffectStyle } from "../../effectStyles";
import { styleComponentSet } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const TAB_LABELS = ["Account", "Password", "Team"] as const;

const TAB_VARIANTS = ["default", "line"] as const;
type TabVariant = (typeof TAB_VARIANTS)[number];

const ACTIVE_INDICES = [0, 1, 2] as const;
type ActiveIndex = (typeof ACTIVE_INDICES)[number];

// Whether the trailing tab is disabled. shadcn renders disabled triggers with
// `disabled:opacity-50 disabled:pointer-events-none`; expose it as a boolean
// axis so designers can preview a partially-disabled tab strip.
const TAB_DISABLED = ["False", "True"] as const;
type TabDisabled = (typeof TAB_DISABLED)[number];

const LIST_HEIGHT = 32;
const LIST_PADDING = 3;
const UNDERLINE_HEIGHT = 2;

export async function addTabsSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of TAB_VARIANTS) {
    for (const active of ACTIVE_INDICES) {
      for (const disabled of TAB_DISABLED) {
        const comp = await buildTabsComponent(
          inputs,
          variant,
          active,
          disabled,
        );
        page.appendChild(comp);
        components.push(comp);
      }
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Tabs";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

async function buildTabsComponent(
  inputs: ComponentsInputs,
  variant: TabVariant,
  active: ActiveIndex,
  disabled: TabDisabled,
): Promise<ComponentNode> {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const isLine = variant === "line";

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}, Active=${TAB_LABELS[active]}, Disabled=${disabled}`;
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  comp.primaryAxisAlignItems = "CENTER";
  comp.counterAxisAlignItems = "CENTER";
  if (isLine) {
    // radix-nova line list: `gap-1 bg-transparent rounded-none p-[3px]`.
    comp.itemSpacing = 4;
    comp.fills = [];
  } else {
    // radix-nova default list: `h-8 gap-2 p-[3px] rounded-lg bg-muted`.
    comp.itemSpacing = 8;
    comp.cornerRadius = 8;
    bindCornerRadii(comp, p.get("radius/lg"));
    bindFill(comp, t.get("muted"));
  }
  comp.paddingLeft = LIST_PADDING;
  comp.paddingRight = LIST_PADDING;
  comp.paddingTop = LIST_PADDING;
  comp.paddingBottom = LIST_PADDING;
  comp.strokes = [];

  // Tab triggers live in a slot so instances can add/remove/reorder tabs.
  const triggers: FrameNode[] = [];
  for (let i = 0; i < TAB_LABELS.length; i++) {
    const trigger = await buildTabTrigger(
      inputs,
      TAB_LABELS[i]!,
      i === active,
      variant,
    );
    // When disabled, dim the trailing tab (and never the active one) so the
    // strip shows a realistic "this tab is unavailable" state.
    if (disabled === "True" && i === TAB_LABELS.length - 1 && i !== active) {
      trigger.opacity = 0.5;
      trigger.name = "Trigger (disabled)";
    }
    triggers.push(trigger);
  }

  const tabs = createConfiguredSlot(comp, "Tabs", triggers, {
    description: "Tab triggers.",
    settings: { minChildren: 1 },
  });
  tabs.layoutMode = "HORIZONTAL";
  tabs.primaryAxisSizingMode = "AUTO";
  tabs.counterAxisSizingMode = "AUTO";
  tabs.primaryAxisAlignItems = "CENTER";
  tabs.counterAxisAlignItems = "CENTER";
  tabs.itemSpacing = isLine ? 4 : 8;
  tabs.fills = [];
  tabs.strokes = [];

  return comp;
}

async function buildTabTrigger(
  inputs: ComponentsInputs,
  label: string,
  isActive: boolean,
  variant: TabVariant,
): Promise<FrameNode> {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const isLine = variant === "line";

  // The line variant wraps the trigger in a vertical column so the active
  // underline can sit beneath the label without affecting the row layout.
  const trigger = figma.createFrame();
  trigger.name = isActive ? "Trigger (active)" : "Trigger";
  trigger.layoutMode = isLine ? "VERTICAL" : "HORIZONTAL";
  trigger.primaryAxisSizingMode = "AUTO";
  trigger.counterAxisSizingMode = isLine ? "AUTO" : "FIXED";
  trigger.primaryAxisAlignItems = "CENTER";
  trigger.counterAxisAlignItems = "CENTER";
  if (!isLine) {
    trigger.resize(96, LIST_HEIGHT - LIST_PADDING * 2);
  }
  // radix-nova TabsTrigger: `gap-1.5 rounded-md px-1.5 py-0.5 text-sm
  // font-medium`.
  trigger.itemSpacing = isLine ? 4 : 6;
  trigger.paddingLeft = 6;
  trigger.paddingRight = 6;
  trigger.paddingTop = 2;
  trigger.paddingBottom = 2;
  trigger.strokes = [];

  if (!isLine) {
    trigger.cornerRadius = 6;
    bindCornerRadii(trigger, p.get("radius/md"));
    if (isActive) {
      bindFill(trigger, t.get("background"));
      trigger.effects = [
        {
          type: "DROP_SHADOW",
          color: { r: 0, g: 0, b: 0, a: 0.05 },
          offset: { x: 0, y: 1 },
          radius: 2,
          spread: 0,
          visible: true,
          blendMode: "NORMAL",
          showShadowBehindNode: true,
        },
      ];
      // Reference the shared Shadow/xs effect style so the active tab tracks
      // later edits to the shadow scale.
      await applyEffectStyle(trigger, inputs.effectStyles?.idFor("Shadow/xs"));
    } else {
      trigger.fills = [];
    }
  } else {
    // line variant triggers have no surface in any state.
    trigger.fills = [];
  }

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  if (isActive) {
    bindFill(text, t.get("foreground"));
  } else {
    // radix-nova inactive trigger: `text-foreground/60` (then
    // `dark:text-muted-foreground`). Use muted-foreground for the light
    // mode look — close enough at most presets.
    bindFill(text, t.get("muted-foreground"));
  }
  trigger.appendChild(text);

  // line variant active indicator: a 2px `bg-foreground` underline.
  if (isLine) {
    const underline = figma.createRectangle();
    underline.name = "Indicator";
    underline.resize(Math.max(1, text.width), UNDERLINE_HEIGHT);
    if (isActive) {
      bindFill(underline, t.get("foreground"));
    } else {
      // Keep the slot so active/inactive triggers share a height; just hide it.
      underline.fills = [];
      underline.visible = false;
    }
    trigger.appendChild(underline);
    if ("layoutSizingHorizontal" in underline) {
      (underline as RectangleNode).layoutSizingHorizontal = "FILL";
    }
  }

  return trigger;
}
