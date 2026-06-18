// Table: a header row over a few body rows with a footer.
//
// Mirrors radix-nova's Table primitives: `text-sm` throughout, header cells
// are `h-10 px-2 font-medium text-foreground`, body cells are `p-2`, every
// row carries a `border-b` (the last body row's border is removed), and the
// footer uses `bg-muted/50 font-medium border-t`.

import { bindFill, bindFontSize, bindStrokeColor } from "../bindings";
import { applyFont } from "../../fonts";
import { wrapInSectionCard } from "../layout";
import { createConfiguredSlot } from "../properties";
import type { ComponentsInputs } from "../types";
import { countDescendants } from "../utils";

const TABLE_WIDTH = 480;

// Column layout: an "Invoice" id, a status, a method, and a right-aligned
// amount — a compact stand-in for shadcn's invoice table demo.
type Column = { header: string; width: number; align: "left" | "right" };
const COLUMNS: Column[] = [
  { header: "Invoice", width: 120, align: "left" },
  { header: "Status", width: 120, align: "left" },
  { header: "Method", width: 140, align: "left" },
  { header: "Amount", width: 100, align: "right" },
];

const ROWS: string[][] = [
  ["INV001", "Paid", "Credit Card", "$250.00"],
  ["INV002", "Pending", "PayPal", "$150.00"],
  ["INV003", "Unpaid", "Bank Transfer", "$350.00"],
];

const FOOTER: string[] = ["Total", "", "", "$750.00"];

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 41; // p-2 (8) top/bottom + ~14px line ≈ 40, +1 border.

export async function addTableSection(
  page: PageNode,
  inputs: ComponentsInputs,
): Promise<number> {
  const comp = buildTableComponent(inputs);
  const card = wrapInSectionCard(comp);
  page.appendChild(card);
  return countDescendants(card);
}

function buildTableComponent(inputs: ComponentsInputs): ComponentNode {
  const comp = figma.createComponent();
  comp.name = "Table";
  comp.layoutMode = "VERTICAL";
  // Resize before declaring sizing modes — resize() pins both axes to FIXED;
  // re-setting the primary axis to AUTO lets Figma hug the rows vertically.
  comp.resize(TABLE_WIDTH, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  comp.itemSpacing = 0;
  comp.fills = [];
  comp.strokes = [];

  // Header row.
  const header = buildRow(
    inputs,
    COLUMNS.map((c) => c.header),
    {
      bold: true,
      height: HEADER_HEIGHT,
      withBorder: true,
      foreground: "foreground",
    },
  );
  comp.appendChild(header);
  header.layoutSizingHorizontal = "FILL";

  // Body rows live in a Rows slot so instances can add/remove/reorder rows.
  // (Cells stay fixed — column sizing and table semantics are brittle.) The
  // last row drops its bottom border; the second row previews the selected
  // (`data-[state=selected]:bg-muted`) treatment.
  const bodyRows = ROWS.map((cells, i) =>
    buildRow(inputs, cells, {
      bold: false,
      height: ROW_HEIGHT,
      withBorder: i < ROWS.length - 1,
      foreground: "foreground",
      selected: i === 1,
    }),
  );
  const rows = createConfiguredSlot(comp, "Rows", bodyRows, {
    description: "Table body rows.",
    settings: { minChildren: 1 },
  });
  rows.layoutMode = "VERTICAL";
  rows.primaryAxisSizingMode = "AUTO";
  rows.counterAxisSizingMode = "FIXED";
  rows.itemSpacing = 0;
  rows.fills = [];
  rows.strokes = [];
  rows.layoutSizingHorizontal = "FILL";
  for (const row of bodyRows) row.layoutSizingHorizontal = "FILL";

  // Footer row: muted surface, medium weight, top border.
  const footer = buildRow(inputs, FOOTER, {
    bold: true,
    height: ROW_HEIGHT,
    withBorder: false,
    topBorder: true,
    foreground: "foreground",
    muted: true,
  });
  comp.appendChild(footer);
  footer.layoutSizingHorizontal = "FILL";

  return comp;
}

type RowOptions = {
  bold: boolean;
  height: number;
  withBorder: boolean;
  topBorder?: boolean;
  foreground: string;
  muted?: boolean;
  selected?: boolean;
};

function buildRow(
  inputs: ComponentsInputs,
  cells: string[],
  opts: RowOptions,
): FrameNode {
  const t = inputs.theme.light;

  const row = figma.createFrame();
  row.name = "Row";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "FIXED";
  row.counterAxisAlignItems = "CENTER";
  row.resize(TABLE_WIDTH, opts.height);
  row.itemSpacing = 0;
  row.strokes = [];

  if (opts.muted) {
    // radix-nova footer: `bg-muted/50`. We approximate with the solid muted
    // surface (binding a variable fill can't carry a 50% alpha cleanly).
    bindFill(row, t.get("muted"));
  } else if (opts.selected) {
    // radix-nova row: `data-[state=selected]:bg-muted`.
    bindFill(row, t.get("muted"));
  } else {
    row.fills = [];
  }

  if (opts.withBorder || opts.topBorder) {
    bindStrokeColor(row, t.get("border"));
    row.strokeWeight = 1;
    row.strokeAlign = "INSIDE";
    row.strokeBottomWeight = opts.withBorder ? 1 : 0;
    row.strokeTopWeight = opts.topBorder ? 1 : 0;
    row.strokeLeftWeight = 0;
    row.strokeRightWeight = 0;
  }

  for (let i = 0; i < COLUMNS.length; i++) {
    const column = COLUMNS[i]!;
    row.appendChild(buildCell(inputs, cells[i] ?? "", column, opts));
  }

  return row;
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
  // radix-nova: header `px-2`, body `p-2`. We apply horizontal padding here
  // and let the row height drive the vertical rhythm.
  cell.paddingLeft = 8;
  cell.paddingRight = 8;
  // The cell is sized to the row height directly, so no FILL is needed (and
  // layoutSizingVertical can only be set once a node is already a child of an
  // auto-layout frame).
  cell.resize(column.width, opts.height);
  cell.fills = [];
  cell.strokes = [];

  const text = figma.createText();
  applyFont(text, "body", opts.bold ? "Medium" : "Regular");
  text.characters = value;
  text.fontSize = 14;
  bindFontSize(text, p.get("font/size/sm"));
  bindFill(text, t.get(opts.foreground));
  cell.appendChild(text);

  return cell;
}
