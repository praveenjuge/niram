// Typography: shadcn's prose recipes (h1–h4, paragraph, blockquote, lead,
// large, small, muted) as a real component *variant set* you can drop in
// anywhere — pick the `Style` you need from the instance menu and type your
// copy. shadcn ships these as utility-class recipes rather than a component, so
// each variant bakes the recipe's size + weight + colour and binds the size to
// the matching `font/size/*` primitive. The post-build text-style sweep then
// maps each body variant onto its published `text-<size>/<weight>` style.

import { bindFill, bindFontSize, bindStrokeColor } from "../bindings";
import { applyFont } from "../../fonts";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

// A prose variant: the `Style` value (variant property), the sample copy, the
// font role + weight, the px size, and the `font/size/*` token it binds to.
type Specimen = {
  style: string;
  text: string;
  role: "body" | "heading";
  weight: string;
  size: number;
  sizeToken: string;
  // lead / muted use `text-muted-foreground`.
  muted?: boolean;
  // blockquote renders inside a left-bordered, indented frame.
  blockquote?: boolean;
};

// Mirrors shadcn's Typography page recipes.
const SPECIMENS: Specimen[] = [
  {
    style: "h1",
    text: "Taxing Laughter",
    role: "heading",
    weight: "Extra Bold",
    size: 36,
    sizeToken: "font/size/4xl",
  },
  {
    style: "h2",
    text: "The People of the Kingdom",
    role: "heading",
    weight: "Semi Bold",
    size: 30,
    sizeToken: "font/size/3xl",
  },
  {
    style: "h3",
    text: "The Joke Tax",
    role: "heading",
    weight: "Semi Bold",
    size: 24,
    sizeToken: "font/size/2xl",
  },
  {
    style: "h4",
    text: "People stopped telling jokes",
    role: "heading",
    weight: "Semi Bold",
    size: 20,
    sizeToken: "font/size/xl",
  },
  {
    style: "p",
    text: "The king, seeing how much happier his subjects were, realized the error of his ways and repealed the joke tax.",
    role: "body",
    weight: "Regular",
    size: 16,
    sizeToken: "font/size/base",
  },
  {
    style: "blockquote",
    text: "After all, everyone enjoys a good joke, so it's only fair that they should pay for the privilege.",
    role: "body",
    weight: "Regular",
    size: 16,
    sizeToken: "font/size/base",
    blockquote: true,
  },
  {
    style: "lead",
    text: "A modal dialog that interrupts the user with important content.",
    role: "body",
    weight: "Regular",
    size: 20,
    sizeToken: "font/size/xl",
    muted: true,
  },
  {
    style: "large",
    text: "Are you absolutely sure?",
    role: "body",
    weight: "Semi Bold",
    size: 18,
    sizeToken: "font/size/lg",
  },
  {
    style: "small",
    text: "Email address",
    role: "body",
    weight: "Medium",
    size: 14,
    sizeToken: "font/size/sm",
  },
  {
    style: "muted",
    text: "Enter your email address.",
    role: "body",
    weight: "Regular",
    size: 14,
    sizeToken: "font/size/sm",
    muted: true,
  },
];

// A fixed width so multi-line variants (p, blockquote, lead) wrap predictably
// while single-line headings sit comfortably. Instances stay resizable.
const CONTENT_WIDTH = 560;

export async function addTypographySection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const specimen of SPECIMENS) {
    const comp = buildTypographyVariant(inputs, specimen);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Typography";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 24;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildTypographyVariant(
  inputs: ComponentsInputs,
  specimen: Specimen,
): ComponentNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const comp = figma.createComponent();
  comp.name = `Style=${specimen.style}`;
  comp.layoutMode = "VERTICAL";
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisSizingMode = "AUTO";
  // resize() pins both axes to FIXED; re-set the primary axis to AUTO so the
  // variant hugs its (possibly wrapped) text instead of freezing at 1px.
  comp.resize(CONTENT_WIDTH, 1);
  comp.primaryAxisSizingMode = "AUTO";
  comp.fills = [];
  comp.strokes = [];

  if (specimen.blockquote) {
    // `border-l-2 pl-6` — a left rule with the quote text indented past it.
    comp.paddingLeft = 24;
    bindStrokeColor(comp, t.get("border"));
    comp.strokeAlign = "INSIDE";
    comp.strokeTopWeight = 0;
    comp.strokeRightWeight = 0;
    comp.strokeBottomWeight = 0;
    comp.strokeLeftWeight = 2;
  }

  const color = specimen.muted
    ? t.get("muted-foreground")
    : t.get("foreground");

  const text = figma.createText();
  applyFont(text, specimen.role, specimen.weight);
  text.characters = specimen.text;
  text.fontSize = specimen.size;
  bindFontSize(text, p.get(specimen.sizeToken));
  bindFill(text, color);
  comp.appendChild(text);
  // Fill the variant width so long copy wraps + auto-heights inside the frame.
  text.layoutSizingHorizontal = "FILL";

  return comp;
}
