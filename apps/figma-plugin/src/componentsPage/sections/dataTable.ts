// Data Table: shadcn's data-table recipe composed on top of Table + Input +
// Checkbox + Button. It is a full pattern rather than a single primitive:
//
//   Toolbar  — a filter Input (`h-8 rounded-lg border-input`) on top
//   Table    — a header row with a leading checkbox column, body rows with
//              per-row checkboxes (one selected → `bg-muted`), and `text-sm`
//              cells matching radix-nova's Table (`h-10` header, `p-2` cells,
//              `border-b` rows).
//   Footer   — a `text-sm text-muted-foreground` selection count on the left
//              and ghost/outline "Previous"/"Next" buttons on the right.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../bindings";
import { applyFont } from "../../fonts";
import { createIcon, resolveIconLibrary } from "../../icons";
import { wrapInSectionCard } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const TABLE_WIDTH = 520;
const CHECKBOX_COL = 36;

type Column = { header: string; width: number; align: "left" | "right" };
const COLUMNS: Column[] = [
  { header: "Status", width: 140, align: "left" },
  { header: "Email", width: 220, align: "left" },
  { header: "Amount", width: 124, align: "right" },
];

type Row = { cells: string[]; selected: boolean };
const ROWS: Row[] = [
  { cells: ["Success", "ken99@example.com", "$316.00"], selected: false },
  { cells: ["Success", "abe45@example.com", "$242.00"], selected: true },
  { cells: ["Processing", "monserrat44@x.com", "$837.00"], selected: false },
  { cells: ["Failed", "carmella@example.com", "$721.00"], selected: false },
];

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 44;

export async function addDataTableSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = buildDataTableComponent(inputs);
  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

function buildDataTableComponent(inputs: ComponentsInputs): ComponentNode {
  const comp = figma.createComponent();
  comp.name = "Data Table";
  comp.layoutMode = "VERTICAL";
  comp.resize(TABLE_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  comp.itemSpacing = 16;
  comp.fills = [];
  comp.strokes = [];

  // Toolbar: a filter input.
  const toolbar = buildToolbar(inputs);
  comp.appendChild(toolbar);
  toolbar.layoutSizingHorizontal = "FILL";

  // The bordered table surface.
  const table = buildTable(inputs, comp);
  comp.appendChild(table);
  table.layoutSizingHorizontal = "FILL";

  // Footer: selection count + pagination buttons.
  const footer = buildFooter(inputs);
  comp.appendChild(footer);
  footer.layoutSizingHorizontal = "FILL";

  return comp;
}

function buildToolbar(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const input = figma.createFrame();
  input.name = "Filter Input";
  input.layoutMode = "HORIZONTAL";
  input.primaryAxisSizingMode = "FIXED";
  input.counterAxisSizingMode = "FIXED";
  input.counterAxisAlignItems = "CENTER";
  input.resize(260, 32);
  input.itemSpacing = 6;
  input.paddingLeft = 10;
  input.paddingRight = 10;
  input.cornerRadius = 8;
  bindCornerRadii(input, p.get("radius/lg"));
  bindFill(input, t.get("background"));
  bindStrokeColor(input, t.get("input"));
  input.strokeWeight = 1;

  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "search",
    size: 16,
    color: t.get("muted-foreground"),
  });
  if (icon) {
    icon.name = "Icon";
    input.appendChild(icon);
  }

  const placeholder = figma.createText();
  applyFont(placeholder, "body", "Regular");
  placeholder.characters = "Filter emails...";
  placeholder.fontSize = 14;
  bindFontSize(placeholder, p.get("font/size/sm"));
  bindFill(placeholder, t.get("muted-foreground"));
  input.appendChild(placeholder);

  return input;
}

function buildTable(inputs: ComponentsInputs, comp: ComponentNode): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const table = figma.createFrame();
  table.name = "Table";
  table.layoutMode = "VERTICAL";
  table.resize(TABLE_WIDTH, 10);
  table.primaryAxisSizingMode = "AUTO";
  table.counterAxisSizingMode = "FIXED";
  table.itemSpacing = 0;
  table.cornerRadius = 8;
  bindCornerRadii(table, p.get("radius/lg"));
  table.fills = [];
  bindStrokeColor(table, t.get("border"));
  table.strokeWeight = 1;
  table.strokeAlign = "INSIDE";
  table.clipsContent = true;

  // Header row.
  const header = buildRow(
    inputs,
    COLUMNS.map((c) => c.header),
    { bold: true, height: HEADER_HEIGHT, withBorder: true, selected: false },
  );
  table.appendChild(header);
  header.layoutSizingHorizontal = "FILL";

  // Body rows live in a Rows slot (created on the component, nested in the
  // table) so instances can add/remove/reorder rows. The last row drops its
  // bottom border.
  const bodyRows = ROWS.map((data, i) =>
    buildRow(inputs, data.cells, {
      bold: false,
      height: ROW_HEIGHT,
      withBorder: i < ROWS.length - 1,
      selected: data.selected,
    }),
  );
  const rows = createConfiguredSlot(comp, "Rows", bodyRows, {
    description: "Data table rows.",
    settings: { minChildren: 1 },
  });
  table.appendChild(rows);
  rows.layoutMode = "VERTICAL";
  rows.primaryAxisSizingMode = "AUTO";
  rows.counterAxisSizingMode = "FIXED";
  rows.itemSpacing = 0;
  rows.fills = [];
  rows.strokes = [];
  rows.layoutSizingHorizontal = "FILL";
  for (const row of bodyRows) row.layoutSizingHorizontal = "FILL";

  return table;
}

type RowOptions = {
  bold: boolean;
  height: number;
  withBorder: boolean;
  selected: boolean;
};

function buildRow(
  inputs: ComponentsInputs,
  cells: string[],
  opts: RowOptions,
): FrameNode {
  const t = inputs.theme.light;

  const row = figma.createFrame();
  row.name = opts.selected ? "Row (selected)" : "Row";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "FIXED";
  row.counterAxisAlignItems = "CENTER";
  row.resize(TABLE_WIDTH, opts.height);
  row.itemSpacing = 0;
  row.strokes = [];

  if (opts.selected) {
    // `data-[state=selected]:bg-muted`.
    bindFill(row, t.get("muted"));
  } else {
    row.fills = [];
  }

  if (opts.withBorder) {
    bindStrokeColor(row, t.get("border"));
    row.strokeWeight = 1;
    row.strokeAlign = "INSIDE";
    row.strokeBottomWeight = 1;
    row.strokeTopWeight = 0;
    row.strokeLeftWeight = 0;
    row.strokeRightWeight = 0;
  }

  // Leading checkbox column.
  row.appendChild(buildCheckboxCell(inputs, opts));

  for (let i = 0; i < COLUMNS.length; i++) {
    const column = COLUMNS[i]!;
    row.appendChild(buildCell(inputs, cells[i] ?? "", column, opts));
  }

  return row;
}

// A cell containing a small checkbox — checked on the header (select-all) and
// on selected rows. Mirrors radix-nova's Checkbox (`size-4 rounded-[4px]
// border-input`, checked → `bg-primary`).
function buildCheckboxCell(
  inputs: ComponentsInputs,
  opts: RowOptions,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const cell = figma.createFrame();
  cell.name = "Cell";
  cell.layoutMode = "HORIZONTAL";
  cell.primaryAxisSizingMode = "FIXED";
  cell.counterAxisSizingMode = "FIXED";
  cell.primaryAxisAlignItems = "CENTER";
  cell.counterAxisAlignItems = "CENTER";
  cell.resize(CHECKBOX_COL, opts.height);
  cell.fills = [];
  cell.strokes = [];

  const checked = opts.bold || opts.selected;

  const box = figma.createFrame();
  box.name = "Checkbox";
  box.layoutMode = "HORIZONTAL";
  box.primaryAxisSizingMode = "FIXED";
  box.counterAxisSizingMode = "FIXED";
  box.primaryAxisAlignItems = "CENTER";
  box.counterAxisAlignItems = "CENTER";
  box.resize(16, 16);
  box.cornerRadius = 4;
  bindCornerRadii(box, p.get("radius/sm"));
  if (checked) {
    bindFill(box, t.get("primary"));
    box.strokes = [];
  } else {
    bindFill(box, t.get("background"));
    bindStrokeColor(box, t.get("input"));
    box.strokeWeight = 1;
  }
  cell.appendChild(box);

  if (checked) {
    const check = createIcon({
      library: resolveIconLibrary(inputs.presetSummary),
      name: "check",
      size: 12,
      color: t.get("primary-foreground"),
    });
    if (check) {
      check.name = "Check";
      box.appendChild(check);
    }
  }

  return cell;
}

function buildCell(
  inputs: ComponentsInputs,
  value: string,
  column: Column,
  opts: RowOptions,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const cell = figma.createFrame();
  cell.name = "Cell";
  cell.layoutMode = "HORIZONTAL";
  cell.primaryAxisSizingMode = "FIXED";
  cell.counterAxisSizingMode = "FIXED";
  cell.primaryAxisAlignItems = column.align === "right" ? "MAX" : "MIN";
  cell.counterAxisAlignItems = "CENTER";
  cell.paddingLeft = 8;
  cell.paddingRight = 8;
  cell.resize(column.width, opts.height);
  cell.fills = [];
  cell.strokes = [];

  const text = figma.createText();
  applyFont(text, "body", opts.bold ? "Medium" : "Regular");
  text.characters = value;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, opts.bold ? t.get("muted-foreground") : t.get("foreground"));
  cell.appendChild(text);

  return cell;
}

function buildFooter(inputs: ComponentsInputs): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const footer = figma.createFrame();
  footer.name = "Footer";
  footer.layoutMode = "HORIZONTAL";
  footer.primaryAxisSizingMode = "FIXED";
  footer.counterAxisSizingMode = "AUTO";
  footer.primaryAxisAlignItems = "SPACE_BETWEEN";
  footer.counterAxisAlignItems = "CENTER";
  footer.itemSpacing = 8;
  footer.fills = [];
  footer.strokes = [];

  const count = figma.createText();
  applyFont(count, "body", "Regular");
  count.characters = "1 of 4 row(s) selected.";
  count.fontSize = 14;
  bindFontSize(count, p.get("font/size/sm"));
  bindFill(count, t.get("muted-foreground"));
  footer.appendChild(count);

  const controls = figma.createFrame();
  controls.name = "Controls";
  controls.layoutMode = "HORIZONTAL";
  controls.primaryAxisSizingMode = "AUTO";
  controls.counterAxisSizingMode = "AUTO";
  controls.counterAxisAlignItems = "CENTER";
  controls.itemSpacing = 8;
  controls.fills = [];
  controls.strokes = [];
  controls.appendChild(buildPagerButton(inputs, "Previous", true));
  controls.appendChild(buildPagerButton(inputs, "Next", false));
  footer.appendChild(controls);

  return footer;
}

// An outline pager button (`h-8 px-2.5 rounded-lg`); the disabled "Previous"
// dims to 50% like the data-table demo's first page.
function buildPagerButton(
  inputs: ComponentsInputs,
  label: string,
  disabled: boolean,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const btn = figma.createFrame();
  btn.name = label;
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = "AUTO";
  btn.counterAxisSizingMode = "FIXED";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.resize(btn.width, 32);
  btn.primaryAxisSizingMode = "AUTO";
  btn.paddingLeft = 10;
  btn.paddingRight = 10;
  btn.cornerRadius = 8;
  bindCornerRadii(btn, p.get("radius/lg"));
  bindFill(btn, t.get("background"));
  bindStrokeColor(btn, t.get("border"));
  btn.strokeWeight = 1;

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get("foreground"));
  btn.appendChild(text);

  if (disabled) btn.opacity = 0.5;

  return btn;
}
