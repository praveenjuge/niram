// Calendar: a single-month date picker. Mirrors radix-nova's Calendar
// (react-day-picker): `bg-background p-2 [--cell-radius:var(--radius-md)]
// [--cell-size:--spacing(7)]` (28px cells). A nav row carries ghost
// prev/next icon buttons (`size-(--cell-size)`) flanking the centred month
// caption (`text-sm font-medium`); a weekday header row (`text-[0.8rem]
// text-muted-foreground`) sits over the day grid.
//
// We surface the common compositions designers actually swap as a curated
// `Variant` axis:
//   basic        — a single selected day (today highlighted)
//   range        — a contiguous from–to selection
//   multiple      — several non-contiguous selected days
//   dropdown     — month / year dropdown caption instead of plain text
//   week-numbers — a leading week-number column
//
// Day cells are ghost buttons rounded to `--cell-radius`. The selected day is
// `bg-primary text-primary-foreground`; range middles are `bg-accent`; "today"
// is `bg-muted text-foreground`; outside (adjacent-month) days are
// `text-muted-foreground`. We render June 2025 (which starts on a Sunday) so
// the grid reads as a clean 5×7 month. Everything binds the selected preset's
// semantic tokens, radius, and font.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { styleComponentSet } from "../layout";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const CALENDAR_VARIANTS = [
  "basic",
  "range",
  "multiple",
  "dropdown",
  "week-numbers",
] as const;
type CalendarVariant = (typeof CALENDAR_VARIANTS)[number];

const CELL_SIZE = 28; // --cell-size: --spacing(7)
const COLUMNS = 7;
const GRID_WIDTH = CELL_SIZE * COLUMNS; // 196

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

// A day cell descriptor. `outside` days belong to the adjacent month; `today`
// and `selected` drive the highlighted states; range flags drive the
// continuous-selection styling.
type Day = {
  label: string;
  outside?: boolean;
  today?: boolean;
  selected?: boolean;
  rangeStart?: boolean;
  rangeEnd?: boolean;
  rangeMiddle?: boolean;
};

export async function addCalendarSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const components: ComponentNode[] = [];
  for (const variant of CALENDAR_VARIANTS) {
    const comp = buildCalendarComponent(inputs, variant);
    page.appendChild(comp);
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, page);
  componentSet.name = "Calendar";
  componentSet.layoutMode = "HORIZONTAL";
  componentSet.itemSpacing = 16;
  styleComponentSet(componentSet);

  return countDescendants(componentSet);
}

function buildCalendarComponent(
  inputs: ComponentsInputs,
  variant: CalendarVariant,
): ComponentNode {
  const t = inputs.theme.light;

  const comp = figma.createComponent();
  comp.name = `Variant=${variant}`;
  comp.layoutMode = "VERTICAL";
  comp.resize(GRID_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "AUTO";
  // `bg-background p-2`, month gap `gap-4`.
  comp.itemSpacing = 16;
  comp.paddingTop = 8;
  comp.paddingBottom = 8;
  comp.paddingLeft = 8;
  comp.paddingRight = 8;
  bindFill(comp, t.get("background"));
  comp.strokes = [];

  comp.appendChild(buildNav(inputs, variant));
  comp.appendChild(buildMonthGrid(inputs, variant));

  return comp;
}

// Nav + caption row: prev icon button, centred caption (plain text, or
// month/year dropdown buttons for the `dropdown` variant), next icon button.
function buildNav(
  inputs: ComponentsInputs,
  variant: CalendarVariant,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const nav = figma.createFrame();
  nav.name = "Nav";
  nav.layoutMode = "HORIZONTAL";
  nav.primaryAxisSizingMode = "FIXED";
  nav.counterAxisSizingMode = "AUTO";
  nav.primaryAxisAlignItems = "SPACE_BETWEEN";
  nav.counterAxisAlignItems = "CENTER";
  const navWidth =
    variant === "week-numbers" ? GRID_WIDTH + CELL_SIZE : GRID_WIDTH;
  nav.resize(navWidth, CELL_SIZE);
  nav.fills = [];
  nav.strokes = [];

  nav.appendChild(buildNavButton(inputs, "chevron-left"));

  if (variant === "dropdown") {
    const dropdowns = figma.createFrame();
    dropdowns.name = "Caption Dropdowns";
    dropdowns.layoutMode = "HORIZONTAL";
    dropdowns.primaryAxisSizingMode = "AUTO";
    dropdowns.counterAxisSizingMode = "AUTO";
    dropdowns.counterAxisAlignItems = "CENTER";
    dropdowns.itemSpacing = 4;
    dropdowns.fills = [];
    dropdowns.strokes = [];
    dropdowns.appendChild(buildCaptionDropdown(inputs, "June"));
    dropdowns.appendChild(buildCaptionDropdown(inputs, "2025"));
    nav.appendChild(dropdowns);
  } else {
    const caption = figma.createText();
    applyFont(caption, "body", "Medium");
    caption.characters = "June 2025";
    caption.fontSize = 14;
    bindFontSize(caption, p.get("font/size/sm"));
    bindFill(caption, t.get("foreground"));
    nav.appendChild(caption);
  }

  nav.appendChild(buildNavButton(inputs, "chevron-right"));

  return nav;
}

// A small caption dropdown button (`h-7 rounded-md gap-1 text-sm`) used by the
// dropdown caption variant.
function buildCaptionDropdown(
  inputs: ComponentsInputs,
  value: string,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = "Caption Select";
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "AUTO";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "MIN";
  btn.counterAxisAlignItems = "CENTER";
  btn.resize(btn.width, CELL_SIZE);
  btn.primaryAxisSizingMode = "AUTO";
  btn.itemSpacing = 2;
  btn.paddingLeft = 8;
  btn.paddingRight = 6;
  btn.cornerRadius = 6;
  bindCornerRadii(btn, p.get("radius/md"));
  bindFill(btn, t.get("background"));
  bindStrokeColor(btn, t.get("input"));
  btn.strokeWeight = 1;
  btn.strokeAlign = "INSIDE";

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = value;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get("foreground"));
  btn.appendChild(text);

  const chevron = figma.createVector();
  chevron.name = "Chevron";
  chevron.resize(14, 14);
  chevron.vectorPaths = [
    { windingRule: "NONZERO", data: "M 3.5 5 L 7 8.5 L 10.5 5" },
  ];
  chevron.strokeWeight = 1.5;
  chevron.strokeCap = "ROUND";
  chevron.strokeJoin = "ROUND";
  chevron.fills = [];
  bindStrokeColor(chevron, t.get("muted-foreground"));
  btn.appendChild(chevron);

  return btn;
}

// A ghost icon button (`size-(--cell-size)`) holding a chevron. The chevrons
// are drawn as simple vectors (like the Select section) so they don't depend
// on the preset icon library having a left-chevron candidate.
function buildNavButton(
  inputs: ComponentsInputs,
  direction: "chevron-left" | "chevron-right",
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = direction === "chevron-left" ? "Previous" : "Next";
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "FIXED";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.resize(CELL_SIZE, CELL_SIZE);
  btn.cornerRadius = 6;
  bindCornerRadii(btn, p.get("radius/md"));
  btn.fills = [];
  btn.strokes = [];

  btn.appendChild(buildChevron(t, direction));
  return btn;
}

// A 16px chevron pointing left or right, drawn as an open vector path.
function buildChevron(
  t: Map<string, Variable>,
  direction: "chevron-left" | "chevron-right",
): VectorNode {
  const chevron = figma.createVector();
  chevron.name = "Chevron";
  chevron.resize(16, 16);
  chevron.vectorPaths = [
    {
      windingRule: "NONZERO",
      data:
        direction === "chevron-left"
          ? "M 10 4 L 6 8 L 10 12"
          : "M 6 4 L 10 8 L 6 12",
    },
  ];
  chevron.strokeWeight = 1.5;
  chevron.strokeCap = "ROUND";
  chevron.strokeJoin = "ROUND";
  chevron.fills = [];
  bindStrokeColor(chevron, t.get("foreground"));
  return chevron;
}

// The weekday header row over the week rows (`flex flex-col` of `flex` rows).
function buildMonthGrid(
  inputs: ComponentsInputs,
  variant: CalendarVariant,
): FrameNode {
  const weeks = buildJune2025(variant);
  const showWeekNumbers = variant === "week-numbers";
  const gridWidth = showWeekNumbers ? GRID_WIDTH + CELL_SIZE : GRID_WIDTH;

  const grid = figma.createFrame();
  grid.name = "Month";
  grid.layoutMode = "VERTICAL";
  // Resize before declaring sizing modes — resize() pins both axes to FIXED;
  // re-setting the primary axis to AUTO afterwards lets the grid hug its
  // weekday + week rows vertically at the fixed grid width.
  grid.resize(gridWidth, 10);
  grid.primaryAxisSizingMode = "AUTO";
  grid.counterAxisSizingMode = "FIXED";
  // `week` rows carry `mt-2` (8px) between them; the header sits flush.
  grid.itemSpacing = 8;
  grid.fills = [];
  grid.strokes = [];

  grid.appendChild(buildWeekdayRow(inputs, showWeekNumbers));
  let weekNumber = 23; // ISO week of June 1, 2025.
  for (const week of weeks) {
    grid.appendChild(
      buildWeekRow(inputs, week, showWeekNumbers ? weekNumber : undefined),
    );
    weekNumber++;
  }

  return grid;
}

function buildWeekdayRow(
  inputs: ComponentsInputs,
  showWeekNumbers: boolean,
): FrameNode {
  const gridWidth = showWeekNumbers ? GRID_WIDTH + CELL_SIZE : GRID_WIDTH;

  const row = figma.createFrame();
  row.name = "Weekdays";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.itemSpacing = 0;
  row.resize(gridWidth, CELL_SIZE);
  row.fills = [];
  row.strokes = [];

  if (showWeekNumbers) {
    row.appendChild(buildWeekdayCell(inputs, "#"));
  }
  for (const day of WEEKDAYS) {
    row.appendChild(buildWeekdayCell(inputs, day));
  }

  return row;
}

function buildWeekdayCell(inputs: ComponentsInputs, label: string): FrameNode {
  const t = inputs.theme.light;

  const cell = figma.createFrame();
  cell.name = "Weekday";
  cell.layoutMode = "HORIZONTAL";
  cell.primaryAxisSizingMode = "FIXED";
  cell.counterAxisSizingMode = "FIXED";
  cell.primaryAxisAlignItems = "CENTER";
  cell.counterAxisAlignItems = "CENTER";
  cell.resize(CELL_SIZE, CELL_SIZE);
  cell.fills = [];
  cell.strokes = [];

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.characters = label;
  text.fontSize = 13; // text-[0.8rem]
  bindFill(text, t.get("muted-foreground"));
  cell.appendChild(text);

  return cell;
}

function buildWeekRow(
  inputs: ComponentsInputs,
  week: Day[],
  weekNumber: number | undefined,
): FrameNode {
  const gridWidth =
    weekNumber !== undefined ? GRID_WIDTH + CELL_SIZE : GRID_WIDTH;

  const row = figma.createFrame();
  row.name = "Week";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.itemSpacing = 0;
  row.resize(gridWidth, CELL_SIZE);
  row.fills = [];
  row.strokes = [];

  if (weekNumber !== undefined) {
    row.appendChild(buildWeekNumberCell(inputs, weekNumber));
  }
  for (const day of week) row.appendChild(buildDayCell(inputs, day));
  return row;
}

function buildWeekNumberCell(
  inputs: ComponentsInputs,
  weekNumber: number,
): FrameNode {
  const t = inputs.theme.light;

  const cell = figma.createFrame();
  cell.name = "Week Number";
  cell.layoutMode = "HORIZONTAL";
  cell.primaryAxisSizingMode = "FIXED";
  cell.counterAxisSizingMode = "FIXED";
  cell.primaryAxisAlignItems = "CENTER";
  cell.counterAxisAlignItems = "CENTER";
  cell.resize(CELL_SIZE, CELL_SIZE);
  cell.fills = [];
  cell.strokes = [];

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.characters = String(weekNumber);
  text.fontSize = 13;
  bindFill(text, t.get("muted-foreground"));
  cell.appendChild(text);

  return cell;
}

function buildDayCell(inputs: ComponentsInputs, day: Day): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const cell = figma.createFrame();
  cell.name = "Day";
  cell.layoutMode = "HORIZONTAL";
  cell.primaryAxisSizingMode = "FIXED";
  cell.counterAxisSizingMode = "FIXED";
  cell.primaryAxisAlignItems = "CENTER";
  cell.counterAxisAlignItems = "CENTER";
  cell.resize(CELL_SIZE, CELL_SIZE);
  cell.fills = [];
  cell.strokes = [];

  // Resting label colour.
  let labelColor = t.get("foreground");

  if (day.selected || day.rangeStart || day.rangeEnd) {
    // `data-[selected-single=true]:bg-primary text-primary-foreground` and the
    // range endpoints.
    cell.cornerRadius = 6;
    bindCornerRadii(cell, p.get("radius/md"));
    bindFill(cell, t.get("primary"));
    labelColor = t.get("primary-foreground");
  } else if (day.rangeMiddle) {
    // Range middle days: `bg-accent text-accent-foreground`, square corners so
    // the band reads continuously (no radius binding — keep the literal 0).
    cell.cornerRadius = 0;
    bindFill(cell, t.get("accent"));
    labelColor = t.get("accent-foreground");
  } else {
    cell.cornerRadius = 6;
    bindCornerRadii(cell, p.get("radius/md"));
    if (day.today) {
      // `today: bg-muted text-foreground`.
      bindFill(cell, t.get("muted"));
      labelColor = t.get("foreground");
    } else if (day.outside) {
      labelColor = t.get("muted-foreground");
    }
  }

  const text = figma.createText();
  applyFont(text, "body", "Regular");
  text.characters = day.label;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, labelColor);
  cell.appendChild(text);

  return cell;
}

// Build the June 2025 month: 5 rows of 7 days, with July 1–5 as trailing
// outside days. Selection state depends on the variant:
//   basic        — today = June 1, selected = June 17
//   range        — June 10 → June 17 (inclusive)
//   multiple     — June 3, 12, 20 selected
//   dropdown     — same as basic
//   week-numbers — same as basic
function buildJune2025(variant: CalendarVariant): Day[][] {
  const rangeStart = 10;
  const rangeEnd = 17;
  const multiSelected = new Set([3, 12, 20]);

  const weeks: Day[][] = [];
  let dayNum = 1;
  for (let w = 0; w < 5; w++) {
    const week: Day[] = [];
    for (let d = 0; d < COLUMNS; d++) {
      if (dayNum <= 30) {
        const day: Day = { label: String(dayNum) };
        if (variant === "range") {
          if (dayNum === rangeStart) day.rangeStart = true;
          else if (dayNum === rangeEnd) day.rangeEnd = true;
          else if (dayNum > rangeStart && dayNum < rangeEnd)
            day.rangeMiddle = true;
        } else if (variant === "multiple") {
          if (multiSelected.has(dayNum)) day.selected = true;
        } else {
          day.today = dayNum === 1;
          day.selected = dayNum === 17;
        }
        week.push(day);
        dayNum++;
      } else {
        // Trailing outside days from the next month.
        week.push({ label: String(dayNum - 30), outside: true });
        dayNum++;
      }
    }
    weeks.push(week);
  }
  return weeks;
}
