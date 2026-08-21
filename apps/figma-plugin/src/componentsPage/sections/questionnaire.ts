// Questionnaire: a one-question-at-a-time survey card (shadcn's Questionnaire,
// new in the August 2026 @shadcn/react components). It lays out a progress
// counter, a title + description, a list of choice rows, and an action footer.
//
// Mirrors apps/v4/registry/bases/base/ui/questionnaire.tsx: a `flex w-full
// flex-col` root whose choices are `min-h-11` bordered rows with a leading
// radio/checkbox indicator, a label, and an optional secondary description.
// The `Type` axis switches radio (circle + dot) vs checkbox (square + check)
// indicators; the `State` axis covers the resting, selected (a checked row),
// and disabled (an unavailable row at 50% opacity) treatments from the
// upstream examples.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary } from "../../icons";
import { styleComponentSet } from "../layout";
import { collectByTypeAndName, defineTextProperty } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const QUESTIONNAIRE_WIDTH = 420;
const CHOICE_MIN_HEIGHT = 44;

const QUESTIONNAIRE_TYPES = ["radio", "checkbox"] as const;
type QuestionnaireType = (typeof QUESTIONNAIRE_TYPES)[number];

const QUESTIONNAIRE_STATES = ["default", "selected", "disabled"] as const;
type QuestionnaireState = (typeof QUESTIONNAIRE_STATES)[number];

// Per-type sample copy (editable via text properties). The radio set mirrors
// the upstream "direction" item; the checkbox set mirrors its "signals" item.
const CHOICES: Record<QuestionnaireType, { label: string; note: string }[]> = {
  radio: [
    { label: "Delegation", note: "Hand routine work to the assistant." },
    { label: "Questions", note: "Ask before acting on anything new." },
    { label: "Both", note: "Delegate the rest, check in first." },
  ],
  checkbox: [
    { label: "Progress reports", note: "A short digest every Friday." },
    { label: "Decisions", note: "Flag calls that need my sign-off." },
    { label: "Risks", note: "Surface blockers as they appear." },
  ],
};

export async function addQuestionnaireSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const type of QUESTIONNAIRE_TYPES) {
    for (const state of QUESTIONNAIRE_STATES) {
      const comp = buildQuestionnaireComponent(inputs, type, state);
      page.appendChild(comp);
      components.push(comp);
    }
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Questionnaire";
  // Horizontal + wrap so the six variants flow onto rows within the shared
  // section width instead of stacking into one tall column.
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 24;
  styleComponentSet(componentSet);

  defineTextProperty(
    componentSet,
    "Progress",
    "Question 2 of 3",
    collectByTypeAndName(componentSet, "TEXT", "Progress"),
  );
  defineTextProperty(
    componentSet,
    "Title",
    "What brings you here today?",
    collectByTypeAndName(componentSet, "TEXT", "Title"),
  );
  defineTextProperty(
    componentSet,
    "Description",
    "Pick the option that fits best.",
    collectByTypeAndName(componentSet, "TEXT", "Description"),
  );

  return countDescendants(componentSet);
}

function buildQuestionnaireComponent(
  inputs: ComponentsInputs,
  type: QuestionnaireType,
  state: QuestionnaireState,
): ComponentNode {
  const comp = figma.createComponent();
  comp.name = `Type=${type}, State=${state}`;
  comp.layoutMode = "VERTICAL";
  comp.counterAxisSizingMode = "FIXED";
  comp.resize(QUESTIONNAIRE_WIDTH, 1);
  // resize() pins both axes FIXED; keep the width fixed and hug the height.
  comp.primaryAxisSizingMode = "AUTO";
  comp.itemSpacing = 16;
  comp.fills = [];
  comp.strokes = [];

  comp.appendChild(buildProgress(inputs));
  comp.appendChild(buildHeading(inputs));

  const choices = buildChoices(inputs, type, state);
  comp.appendChild(choices);

  comp.appendChild(buildActions(inputs));

  return comp;
}

// QuestionnaireProgress: `text-muted-foreground tabular-nums` counter.
function buildProgress(inputs: ComponentsInputs): TextNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;
  const node = figma.createText();
  applyFont(node, "body", "Medium");
  node.name = "Progress";
  node.characters = "Question 2 of 3";
  node.fontSize = 12;
  bindFontSize(node, p.get("font/size/xs"));
  bindFill(node, t.get("muted-foreground"));
  return node;
}

// Title + description column (`gap-1`).
function buildHeading(inputs: ComponentsInputs): FrameNode {
  const heading = figma.createFrame();
  heading.name = "Heading";
  heading.layoutMode = "VERTICAL";
  heading.primaryAxisSizingMode = "AUTO";
  heading.counterAxisSizingMode = "AUTO";
  heading.itemSpacing = 4;
  heading.fills = [];
  heading.strokes = [];

  const title = figma.createText();
  applyFont(title, "heading", "Medium");
  title.name = "Title";
  title.characters = "What brings you here today?";
  title.fontSize = 18;
  bindFontSize(title, inputs.primitives.get("font/size/lg"));
  bindFill(title, inputs.theme.light.get("foreground"));
  heading.appendChild(title);

  const description = figma.createText();
  applyFont(description, "body", "Regular");
  description.name = "Description";
  description.characters = "Pick the option that fits best.";
  description.fontSize = 14;
  bindFontSize(description, inputs.primitives.get("font/size/sm"));
  bindFill(description, inputs.theme.light.get("muted-foreground"));
  heading.appendChild(description);

  return heading;
}

// QuestionnaireChoices: a vertical stack of choice rows (`gap-2`).
function buildChoices(
  inputs: ComponentsInputs,
  type: QuestionnaireType,
  state: QuestionnaireState,
): FrameNode {
  const choices = figma.createFrame();
  choices.name = "Choices";
  choices.layoutMode = "VERTICAL";
  choices.primaryAxisSizingMode = "AUTO";
  choices.counterAxisSizingMode = "FIXED";
  choices.resize(QUESTIONNAIRE_WIDTH, 1);
  choices.primaryAxisSizingMode = "AUTO";
  choices.itemSpacing = 8;
  choices.fills = [];
  choices.strokes = [];

  const rows = CHOICES[type];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const selected = state === "selected" && i === 1;
    const disabled = state === "disabled" && i === rows.length - 1;
    choices.appendChild(
      buildChoiceRow(inputs, type, row.label, row.note, selected, disabled),
    );
  }

  return choices;
}

// One choice row: `min-h-11` bordered surface with a leading indicator and a
// label + description column. Selected swaps the border to primary; disabled
// dims the whole row to 50% opacity.
function buildChoiceRow(
  inputs: ComponentsInputs,
  type: QuestionnaireType,
  label: string,
  note: string,
  selected: boolean,
  disabled: boolean,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = figma.createFrame();
  row.name = disabled ? "Choice (disabled)" : selected ? "Choice (selected)" : "Choice";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.resize(QUESTIONNAIRE_WIDTH, CHOICE_MIN_HEIGHT);
  row.counterAxisAlignItems = "CENTER";
  row.itemSpacing = 10;
  row.paddingLeft = 12;
  row.paddingRight = 12;
  row.paddingTop = 10;
  row.paddingBottom = 10;
  row.cornerRadius = 8;
  bindCornerRadii(row, p.get("radius/lg"));
  bindFill(row, t.get("background"));
  if (selected) {
    bindStrokeColor(row, t.get("primary"));
  } else {
    bindStrokeColor(row, t.get("input"));
  }
  row.strokeWeight = 1;

  row.appendChild(buildIndicator(inputs, type, selected));

  const content = figma.createFrame();
  content.name = "Content";
  content.layoutMode = "VERTICAL";
  content.primaryAxisSizingMode = "AUTO";
  content.counterAxisSizingMode = "AUTO";
  content.itemSpacing = 2;
  content.fills = [];
  content.strokes = [];

  const labelText = figma.createText();
  applyFont(labelText, "body", "Medium");
  labelText.name = "Label";
  labelText.characters = label;
  labelText.fontSize = 14;
  bindFontSize(labelText, p.get("font/size/sm"));
  bindFill(labelText, t.get("foreground"));
  content.appendChild(labelText);

  const noteText = figma.createText();
  applyFont(noteText, "body", "Regular");
  noteText.name = "Note";
  noteText.characters = note;
  noteText.fontSize = 12;
  bindFontSize(noteText, p.get("font/size/xs"));
  bindFill(noteText, t.get("muted-foreground"));
  content.appendChild(noteText);

  row.appendChild(content);

  if (disabled) {
    row.opacity = 0.5;
  }

  return row;
}

// The radio circle or checkbox square. Selected shows the dot / check mark in
// the same treatment as the Radio Group and Checkbox sections.
function buildIndicator(
  inputs: ComponentsInputs,
  type: QuestionnaireType,
  selected: boolean,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const indicator = figma.createFrame();
  indicator.name = "Indicator";
  indicator.layoutMode = "HORIZONTAL";
  indicator.primaryAxisSizingMode = "FIXED";
  indicator.counterAxisSizingMode = "FIXED";
  indicator.primaryAxisAlignItems = "CENTER";
  indicator.counterAxisAlignItems = "CENTER";
  indicator.resize(16, 16);
  indicator.strokes = [];

  if (type === "radio") {
    indicator.cornerRadius = 9999;
    bindCornerRadii(indicator, p.get("radius/full"));
  } else {
    indicator.cornerRadius = 4;
    bindCornerRadii(indicator, p.get("radius/sm"));
  }

  if (selected) {
    bindFill(indicator, t.get("primary"));
    bindStrokeColor(indicator, t.get("primary"));
    indicator.strokeWeight = 1;
    if (type === "radio") {
      const dot = figma.createEllipse();
      dot.name = "Dot";
      dot.resize(8, 8);
      bindFill(dot, t.get("primary-foreground"));
      indicator.appendChild(dot);
    } else {
      const check = createIcon({
        library: resolveIconLibrary(inputs.presetSummary),
        name: "check",
        size: 12,
        color: t.get("primary-foreground"),
      });
      if (check) {
        check.name = "Check";
        indicator.appendChild(check);
      }
    }
  } else {
    bindFill(indicator, t.get("background"));
    bindStrokeColor(indicator, t.get("input"));
    indicator.strokeWeight = 1;
  }

  return indicator;
}

// QuestionnaireActions: Previous | spacer | Skip | Next. The final step's
// Next becomes Submit with the primary treatment either way.
function buildActions(inputs: ComponentsInputs): FrameNode {
  const actions = figma.createFrame();
  actions.name = "Actions";
  actions.layoutMode = "HORIZONTAL";
  actions.primaryAxisSizingMode = "FIXED";
  actions.counterAxisSizingMode = "AUTO";
  actions.counterAxisAlignItems = "CENTER";
  actions.resize(QUESTIONNAIRE_WIDTH, 36);
  actions.primaryAxisSizingMode = "FIXED";
  actions.itemSpacing = 8;
  actions.fills = [];
  actions.strokes = [];

  actions.appendChild(buildActionButton(inputs, "Previous", "ghost"));

  // A growing spacer pushes Skip + Next to the far edge.
  const spacer = figma.createFrame();
  spacer.name = "Spacer";
  spacer.fills = [];
  spacer.strokes = [];
  spacer.resize(1, 1);
  try {
    (spacer as unknown as { layoutGrow: number }).layoutGrow = 1;
  } catch {
    // Keep intrinsic width when the host rejects grow.
  }
  actions.appendChild(spacer);

  actions.appendChild(buildActionButton(inputs, "Skip", "ghost"));
  actions.appendChild(buildActionButton(inputs, "Next", "primary"));

  return actions;
}

// A compact action button (`h-9 px-3 rounded-lg`): ghost is borderless text,
// primary carries the theme fill.
function buildActionButton(
  inputs: ComponentsInputs,
  label: string,
  variant: "ghost" | "primary",
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const button = figma.createFrame();
  button.name = label;
  button.layoutMode = "HORIZONTAL";
  button.primaryAxisSizingMode = "AUTO";
  button.counterAxisSizingMode = "FIXED";
  button.primaryAxisAlignItems = "CENTER";
  button.counterAxisAlignItems = "CENTER";
  button.resize(button.width, 36);
  button.paddingLeft = 12;
  button.paddingRight = 12;
  button.cornerRadius = 8;
  bindCornerRadii(button, p.get("radius/lg"));
  button.strokes = [];

  if (variant === "primary") {
    bindFill(button, t.get("primary"));
  } else {
    button.fills = [];
  }

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, variant === "primary" ? t.get("primary-foreground") : t.get("foreground"));
  button.appendChild(text);

  return button;
}
