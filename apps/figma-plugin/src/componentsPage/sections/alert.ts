// Alert: default and destructive variants with icon, title, and description.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";
import { collectByTypeAndName, defineTextProperty } from "../properties";

const ALERT_VARIANTS = [
  "default",
  "success",
  "warning",
  "destructive",
] as const;
type AlertVariant = (typeof ALERT_VARIANTS)[number];

export async function addAlertSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of ALERT_VARIANTS) {
    const comp = buildAlertComponent(inputs, variant);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Alert";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  // Expose the alert title and description as editable text properties.
  defineTextProperty(
    componentSet,
    "Title",
    "Heads up!",
    collectByTypeAndName(componentSet, "TEXT", "Title"),
  );
  defineTextProperty(
    componentSet,
    "Description",
    "You can add components to your app using the CLI.",
    collectByTypeAndName(componentSet, "TEXT", "Description"),
  );

  return countDescendants(componentSet);
}

function buildAlertComponent(
  inputs: ComponentsInputs,
  variant: AlertVariant,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  // Use a vertical layout for the component with a nested horizontal row
  // for icon + text. This avoids Figma's auto-height issues with horizontal
  // layouts containing fill-width text children.
  const comp = figma.createComponent();
  comp.name = `Variant=${variant}`;
  comp.layoutMode = "VERTICAL";
  // Resize before declaring the sizing modes — calling resize() on an
  // auto-layout frame pins both axes to FIXED, which would lock the height
  // at the placeholder value below. Re-setting primaryAxisSizingMode to
  // AUTO afterwards lets Figma hug the children vertically.
  comp.resize(480, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  // radix-nova Alert: `rounded-lg px-2.5 py-2 has-[>svg]:gap-x-2`.
  comp.paddingLeft = 10;
  comp.paddingRight = 10;
  comp.paddingTop = 8;
  comp.paddingBottom = 8;
  comp.itemSpacing = 0;
  comp.cornerRadius = 8;
  bindCornerRadii(comp, p.get("radius/lg"));
  bindFill(comp, t.get("card"));
  bindStrokeColor(comp, t.get("border"));
  comp.strokeWeight = 1;

  // Row: icon + text column. radix-nova has `gap-x-2` (8) between the SVG
  // column and the text column.
  const row = figma.createFrame();
  row.name = "Content";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "AUTO";
  row.itemSpacing = 8;
  row.fills = [];
  comp.appendChild(row);
  row.layoutSizingHorizontal = "FILL";

  // Icon — a real icon from the preset's icon library, inheriting the alert's
  // `text-current` colour (card-foreground for default, a Tailwind accent for
  // success/warning, destructive for the destructive variant). Falls back to a
  // small filled square when the active library has no candidate.
  const accent = alertAccentVar(variant, t, inputs.tailwindColors);
  const iconColor = accent;
  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: alertIconName(variant),
    size: 16,
    color: iconColor,
  });
  if (icon) {
    icon.name = "Icon";
    row.appendChild(icon);
  } else {
    const fallback = figma.createFrame();
    fallback.name = "Icon";
    fallback.resize(16, 16);
    fallback.cornerRadius = 4;
    bindCornerRadii(fallback, p.get("radius/sm"));
    bindFill(fallback, iconColor);
    row.appendChild(fallback);
  }

  // Text column. radix-nova `gap-0.5` between title and description.
  const textCol = figma.createFrame();
  textCol.name = "Text";
  textCol.layoutMode = "VERTICAL";
  textCol.primaryAxisSizingMode = "AUTO";
  textCol.counterAxisSizingMode = "AUTO";
  textCol.itemSpacing = 2;
  textCol.fills = [];
  row.appendChild(textCol);
  textCol.layoutSizingHorizontal = "FILL";

  const title = figma.createText();
  applyFont(title, "heading", "Medium");
  title.name = "Title";
  title.fontSize = 14;
  bindFontSize(title, p.get("font/size/sm"));
  title.characters = alertTitle(variant);
  bindFill(title, accent ?? t.get("card-foreground"));
  textCol.appendChild(title);
  title.layoutSizingHorizontal = "FILL";

  const desc = figma.createText();
  applyFont(desc, "body", "Regular");
  desc.name = "Description";
  desc.fontSize = 14;
  bindFontSize(desc, p.get("font/size/sm"));
  desc.characters = alertDescription(variant);
  if (variant === "default") {
    bindFill(desc, t.get("muted-foreground"));
  } else {
    // Non-default variants tint the description with the accent and soften it
    // slightly so the title still leads.
    bindFill(desc, accent ?? t.get("muted-foreground"));
    desc.opacity = 0.9;
  }
  textCol.appendChild(desc);
  desc.layoutSizingHorizontal = "FILL";

  return comp;
}

// Accent colour shared by the icon, title, and description of a non-default
// alert. `default` returns undefined so callers fall back to the neutral
// card-foreground / muted-foreground pairing.
function alertAccentVar(
  variant: AlertVariant,
  t: Map<string, Variable>,
  tw: Map<string, Variable>,
): Variable | undefined {
  switch (variant) {
    case "default":
      return t.get("card-foreground");
    case "success":
      return tw.get("green/600");
    case "warning":
      return tw.get("amber/600");
    case "destructive":
      return t.get("destructive");
  }
}

function alertIconName(variant: AlertVariant): "info" | "success" | "warning" {
  switch (variant) {
    case "default":
      return "info";
    case "success":
      return "success";
    case "warning":
    case "destructive":
      return "warning";
  }
}

function alertTitle(variant: AlertVariant): string {
  switch (variant) {
    case "default":
      return "Heads up!";
    case "success":
      return "Success";
    case "warning":
      return "Warning";
    case "destructive":
      return "Error";
  }
}

function alertDescription(variant: AlertVariant): string {
  switch (variant) {
    case "default":
      return "You can add components to your app using the CLI.";
    case "success":
      return "Your changes have been saved successfully.";
    case "warning":
      return "Your trial ends in 3 days. Upgrade to keep your data.";
    case "destructive":
      return "Your session has expired. Please sign in again.";
  }
}
