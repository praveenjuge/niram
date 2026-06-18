// Typography showcase: font sizes, weights, tracking, and leading. Every
// row binds its sample to the matching primitive variable.

import {
  FONT_LEADING_TOKENS,
  FONT_SIZE_TOKENS,
  FONT_TRACKING_TOKENS,
  FONT_WEIGHT_TOKENS,
} from "../../primitives";
import { applyFont } from "../../fonts";
import {
  bindFill,
  bindFontSize,
  bindLetterSpacing,
  bindLineHeight,
} from "../bindings";
import { createDesignSystemContext } from "../context";
import {
  addLabel,
  createSectionFrame,
  createSubSection,
  createTableRow,
  sectionContentWidth,
} from "../layout";
import type { DesignSystemInputs } from "../types";
import { countDescendants, weightStyleName } from "../utils";

export async function addTypography(
  page: PageNode,
  inputs: DesignSystemInputs,
): Promise<number> {
  const ctx = createDesignSystemContext(inputs);
  const section = createSectionFrame("Typography", undefined, ctx);

  const fgVar = ctx.foreground;
  const mutedVar = ctx.mutedForeground;

  // Consistent metrics so the columns line up across all four sub-sections.
  const labelColumnWidth = 160;
  const sampleColumnWidth = sectionContentWidth() - labelColumnWidth - 16;

  // ----- Sizes -----
  const sizeStack = createSubSection(section, "Font sizes", ctx);
  for (const token of FONT_SIZE_TOKENS) {
    const row = createTableRow(sizeStack, labelColumnWidth);
    addLabel(row, `font/size/${token.name}`, mutedVar, labelColumnWidth);

    const sample = figma.createText();
    applyFont(sample, "body", "Regular");
    sample.characters = `The quick brown fox · ${token.value}px`;
    sample.fontSize = token.value;
    bindFontSize(sample, inputs.primitives.get(`font/size/${token.name}`));
    bindFill(sample, fgVar);
    row.appendChild(sample);
  }

  // ----- Weights -----
  // The earlier version put the weight name, value, and sample in a single
  // text node. Inter's per-style metrics shifted the leading column, so the
  // labels looked misaligned. Splitting into a fixed-width name column +
  // value column + sample column keeps everything on the same baseline.
  const weightStack = createSubSection(section, "Font weights", ctx);
  const weightNameWidth = 90;
  const weightValueWidth = 50;
  for (const token of FONT_WEIGHT_TOKENS) {
    const row = createTableRow(weightStack, labelColumnWidth);

    const styleName = weightStyleName(token.value);

    const nameLabel = figma.createText();
    applyFont(nameLabel, "body", styleName);
    nameLabel.characters = token.name;
    nameLabel.fontSize = 14;
    bindFill(nameLabel, fgVar);
    nameLabel.resize(weightNameWidth, 20);
    row.appendChild(nameLabel);

    const valueLabel = figma.createText();
    applyFont(valueLabel, "body", "Regular");
    valueLabel.characters = `${token.value}`;
    valueLabel.fontSize = 12;
    bindFill(valueLabel, mutedVar);
    valueLabel.resize(weightValueWidth, 20);
    row.appendChild(valueLabel);

    const sample = figma.createText();
    applyFont(sample, "body", styleName);
    sample.characters = "The quick brown fox jumps over the lazy dog";
    sample.fontSize = 14;
    bindFill(sample, fgVar);
    row.appendChild(sample);
  }

  // ----- Tracking -----
  const trackingStack = createSubSection(
    section,
    "Letter spacing (tracking)",
    ctx,
  );
  for (const token of FONT_TRACKING_TOKENS) {
    const row = createTableRow(trackingStack, labelColumnWidth);
    addLabel(row, `font/tracking/${token.name}`, mutedVar, labelColumnWidth);

    const sample = figma.createText();
    sample.characters = `Letter spacing ${token.value}px`;
    sample.fontSize = 14;
    applyFont(sample, "body", "Regular");
    sample.letterSpacing = { value: token.value, unit: "PIXELS" };
    bindLetterSpacing(
      sample,
      inputs.primitives.get(`font/tracking/${token.name}`),
    );
    bindFill(sample, fgVar);
    row.appendChild(sample);
  }

  // ----- Leading -----
  // Leading rows need extra height so the two-line sample doesn't visually
  // collide with the next row. We set the row's counter-axis to AUTO and
  // give the sample a fixed width so the wrap is predictable.
  const leadingStack = createSubSection(section, "Line height (leading)", ctx);
  for (const token of FONT_LEADING_TOKENS) {
    const row = createTableRow(leadingStack, labelColumnWidth);
    row.counterAxisAlignItems = "MIN";
    addLabel(row, `font/leading/${token.name}`, mutedVar, labelColumnWidth);

    const sample = figma.createText();
    sample.characters = `Two lines of body copy\nshare leading ${token.value}px`;
    sample.fontSize = 13;
    applyFont(sample, "body", "Regular");
    sample.lineHeight = { value: token.value, unit: "PIXELS" };
    sample.resize(sampleColumnWidth, sample.height);
    bindLineHeight(sample, inputs.primitives.get(`font/leading/${token.name}`));
    bindFill(sample, fgVar);
    row.appendChild(sample);
  }

  page.appendChild(section);
  return countDescendants(section);
}
