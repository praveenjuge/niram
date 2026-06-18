// Switch: toggle with thumb, two sizes × two states.

import { bindCornerRadii, bindFill } from "../bindings";
import { applyEffectStyle } from "../../effectStyles";
import { styleComponentSet } from "../layout";
import { type ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

// Boolean variant: shadcn / Radix Switch exposes a `checked` prop, so we
// expose `Checked=True/False`. Figma promotes a property to a boolean toggle
// in the inspector when its values are exactly `True`/`False`.
const SWITCH_STATES = ["False", "True"] as const;
type SwitchState = (typeof SWITCH_STATES)[number];

const SWITCH_SIZES = ["sm", "default"] as const;
type SwitchSize = (typeof SWITCH_SIZES)[number];

// Disabled twin. shadcn Switch uses `disabled:opacity-50`; expose it as a
// boolean property alongside size + checked.
const SWITCH_DISABLED = ["False", "True"] as const;
type SwitchDisabled = (typeof SWITCH_DISABLED)[number];

// Mirrors shadcn's Switch: default `w-8 h-[1.15rem]` (32×~18.4) with a
// size-4 thumb; sm `w-6 h-3.5` (24×14) with a size-3 thumb.
const SWITCH_DIMS: Record<SwitchSize, { w: number; h: number; thumb: number }> =
  {
    sm: { w: 24, h: 14, thumb: 12 },
    default: { w: 32, h: 18, thumb: 16 },
  };

export async function addSwitchSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const size of SWITCH_SIZES) {
    for (const state of SWITCH_STATES) {
      for (const disabled of SWITCH_DISABLED) {
        const comp = await buildSwitchComponent(inputs, size, state, disabled);
        page.appendChild(comp);
        components.push(comp);
      }
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Switch";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildSwitchComponent(
  inputs: ComponentsInputs,
  size: SwitchSize,
  state: SwitchState,
  disabled: SwitchDisabled,
): Promise<ComponentNode> {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const dims = SWITCH_DIMS[size];

  const comp = figma.createComponent();
  comp.name = `Size=${size}, Checked=${state}, Disabled=${disabled}`;
  // Use absolute positioning for the thumb inside the track.
  comp.layoutMode = "NONE";
  comp.resize(dims.w, dims.h);
  comp.cornerRadius = 9999;
  bindCornerRadii(comp, p.get("radius/full"));

  if (state === "True") {
    bindFill(comp, t.get("primary"));
  } else {
    bindFill(comp, t.get("input"));
  }

  // Thumb.
  const thumb = figma.createEllipse();
  thumb.name = "Thumb";
  thumb.resize(dims.thumb, dims.thumb);
  bindFill(thumb, t.get("background"));
  const yOffset = (dims.h - dims.thumb) / 2;
  thumb.y = yOffset;
  // shadcn translates the thumb by `calc(100%-2px)` when checked and 0
  // otherwise, leaving the thumb at the track's left edge in the off state.
  if (state === "True") {
    thumb.x = dims.w - dims.thumb - 2;
  } else {
    thumb.x = 0;
  }
  thumb.effects = [
    {
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.12 },
      offset: { x: 0, y: 1 },
      radius: 2,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
      showShadowBehindNode: true,
    },
  ];
  comp.appendChild(thumb);

  if (disabled === "True") {
    comp.opacity = 0.5;
  }

  return applyEffectStyle(thumb, inputs.effectStyles?.idFor("Shadow/xs")).then(
    () => comp,
  );
}
