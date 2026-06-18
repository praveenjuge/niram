// Dashboard block: a faithful rebuild of shadcn's `dashboard-01`
// (apps/v4/registry/.../blocks/dashboard-01) styled to match
// shadcn-ui/apps/v4/styles/radix-nova/ui.
//
// Structure (mirroring page.tsx):
//   SidebarProvider (inset)
//     AppSidebar         → reuses the published Sidebar instance
//     SidebarInset
//       SiteHeader       → trigger + separator + "Documents" title + GitHub btn
//       SectionCards     → 4 KPI cards (description / value / trend Badge /
//                          footer line) — the `*:shadow-xs` + `ring` card look
//       ChartAreaInteractive → reuses the published Chart (Area) instance
//       DataTable        → reuses the published Data Table instance, with the
//                          tabs/toolbar row above it
//
// Every reusable surface embeds a live instance of a page-built component
// (Sidebar, Chart, Data Table, Button, Badge) so editing a component once flows
// through the dashboard. Each reuse falls back to a drawn stand-in when the
// page has no matching component (isolated callers / tests).

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../../componentsPage/bindings";
import { applyFont } from "../../fonts";
import { applyEffectStyle } from "../../effectStyles";
import { createIcon, resolveIconLibrary } from "../../icons";
import {
  createBlockCanvas,
  createBody,
  createColumn,
  createHeading,
  createRow,
  createSurface,
} from "../layout";
import type { BlocksInputs } from "../types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../types";
import { countDescendants, fillWidth, instanceFromComponents } from "../utils";

// radix-nova: `--sidebar-width: 16rem`. The inset variant floats the content
// area with a small gutter.
const SIDEBAR_WIDTH = 256;
const HEADER_HEIGHT = 48; // `--header-height: calc(spacing * 12)` = 48px
const CONTENT_PADDING = 24; // `md:py-6` / `lg:px-6`
const CONTENT_GAP = 24; // `md:gap-6`

// Four KPI cards — the exact copy from section-cards.tsx.
type Stat = {
  description: string;
  value: string;
  delta: string;
  trendUp: boolean;
  footerTitle: string;
  footerNote: string;
};
const STATS: Stat[] = [
  {
    description: "Total Revenue",
    value: "$1,250.00",
    delta: "+12.5%",
    trendUp: true,
    footerTitle: "Trending up this month",
    footerNote: "Visitors for the last 6 months",
  },
  {
    description: "New Customers",
    value: "1,234",
    delta: "-20%",
    trendUp: false,
    footerTitle: "Down 20% this period",
    footerNote: "Acquisition needs attention",
  },
  {
    description: "Active Accounts",
    value: "45,678",
    delta: "+12.5%",
    trendUp: true,
    footerTitle: "Strong user retention",
    footerNote: "Engagement exceed targets",
  },
  {
    description: "Growth Rate",
    value: "4.5%",
    delta: "+4.5%",
    trendUp: true,
    footerTitle: "Steady performance increase",
    footerNote: "Meets growth projections",
  },
];

export async function addDashboardBlock(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const canvas = createBlockCanvas(
    inputs,
    "Dashboard",
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
  );
  canvas.layoutMode = "HORIZONTAL";
  canvas.itemSpacing = 0;

  // --- Sidebar ------------------------------------------------------------
  // The dashboard draws its own dashboard-01 rail rather than reusing the
  // Sidebar block's 16-variant set (those are a standalone showcase, and the
  // dashboard's nav — Documents/Lifecycle/Analytics + a user row — is its own
  // composition).
  canvas.appendChild(buildFallbackSidebar(inputs));

  // --- Inset (the main content column) ------------------------------------
  const inset = createColumn("Inset", 0);
  inset.primaryAxisSizingMode = "FIXED";
  inset.counterAxisSizingMode = "FIXED";
  inset.layoutGrow = 1;
  canvas.appendChild(inset);
  fillHeight(inset);
  fillWidth(inset);

  // Site header.
  const siteHeader = await buildSiteHeader(inputs);
  inset.appendChild(siteHeader);
  fillWidth(siteHeader);

  // Scroll area: the content body with vertical padding + gaps.
  const body = createColumn("Content", CONTENT_GAP);
  body.paddingTop = CONTENT_PADDING;
  body.paddingBottom = CONTENT_PADDING;
  body.primaryAxisSizingMode = "FIXED";
  body.counterAxisSizingMode = "FIXED";
  body.layoutGrow = 1;
  inset.appendChild(body);
  fillWidth(body);
  fillHeight(body);

  // Section cards (4 across).
  const cards = await buildSectionCards(inputs);
  body.appendChild(cards);
  fillWidth(cards);

  // Chart (reused Area chart instance), wrapped with `px-6` gutters.
  const chartRow = createColumn("Chart Row", 0);
  chartRow.paddingLeft = CONTENT_PADDING;
  chartRow.paddingRight = CONTENT_PADDING;
  chartRow.primaryAxisSizingMode = "AUTO";
  chartRow.counterAxisSizingMode = "FIXED";
  body.appendChild(chartRow);
  fillWidth(chartRow);
  const chart = instanceFromComponents(
    inputs,
    "Chart",
    "Family=Area, Variant=Interactive",
  );
  if (chart) {
    chartRow.appendChild(chart);
    fillWidth(chart);
  } else {
    const fallbackChart = await buildFallbackPanel(inputs, "Total Visitors");
    chartRow.appendChild(fallbackChart);
    fillWidth(fallbackChart);
  }

  // Data table (reused), wrapped with `px-6` gutters and the tabs/toolbar row.
  const tableRow = createColumn("Table Row", CONTENT_GAP);
  tableRow.paddingLeft = CONTENT_PADDING;
  tableRow.paddingRight = CONTENT_PADDING;
  tableRow.primaryAxisSizingMode = "AUTO";
  tableRow.counterAxisSizingMode = "FIXED";
  body.appendChild(tableRow);
  fillWidth(tableRow);

  const tableToolbar = await buildTableToolbar(inputs);
  tableRow.appendChild(tableToolbar);
  fillWidth(tableToolbar);

  const table = instanceFromComponents(inputs, "Data Table");
  if (table) {
    tableRow.appendChild(table);
    fillWidth(table);
  } else {
    const fallbackTable = await buildFallbackPanel(inputs, "Documents");
    tableRow.appendChild(fallbackTable);
    fillWidth(fallbackTable);
  }

  page.appendChild(canvas);
  return countDescendants(canvas);
}

// --- Site header -----------------------------------------------------------
// `flex h-(--header-height) items-center gap-2 border-b` with a sidebar
// trigger, a vertical separator, the page title, and a ghost GitHub button on
// the right.
async function buildSiteHeader(inputs: BlocksInputs): Promise<FrameNode> {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const header = figma.createFrame();
  header.name = "Site Header";
  header.layoutMode = "HORIZONTAL";
  header.primaryAxisSizingMode = "FIXED";
  header.counterAxisSizingMode = "FIXED";
  header.counterAxisAlignItems = "CENTER";
  header.resize(CANVAS_WIDTH - SIDEBAR_WIDTH, HEADER_HEIGHT);
  header.itemSpacing = 8;
  header.paddingLeft = 24;
  header.paddingRight = 24;
  header.fills = [];
  bindStrokeColor(header, t.get("border"));
  header.strokeWeight = 1;
  header.strokeAlign = "INSIDE";
  header.strokeBottomWeight = 1;
  header.strokeTopWeight = 0;
  header.strokeLeftWeight = 0;
  header.strokeRightWeight = 0;

  // Sidebar trigger glyph (`-ml-1`).
  const trigger = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "command",
    size: 16,
    color: t.get("foreground"),
  });
  if (trigger) {
    trigger.name = "Trigger";
    header.appendChild(trigger);
  }

  // Vertical separator (`h-4`).
  const sep = figma.createRectangle();
  sep.name = "Separator";
  sep.resize(1, 16);
  bindFill(sep, t.get("border"));
  header.appendChild(sep);

  // Title (`text-base font-medium`).
  const title = createBody(inputs, "Documents", 16, "foreground", "Medium");
  header.appendChild(title);

  // Spacer pushes the action to the right (`ml-auto`).
  const spacer = figma.createFrame();
  spacer.name = "Spacer";
  spacer.fills = [];
  spacer.strokes = [];
  spacer.resize(10, 1);
  header.appendChild(spacer);
  spacer.layoutGrow = 1;

  // Ghost GitHub button — reuse the published ghost Button.
  const gh = instanceFromComponents(
    inputs,
    "Button",
    "Variant=ghost, Size=sm, State=default",
    "GitHub",
  );
  if (gh) {
    header.appendChild(gh);
  } else {
    const fallback = createBody(inputs, "GitHub", 14, "foreground", "Medium");
    header.appendChild(fallback);
  }

  return header;
}

// --- Section cards ---------------------------------------------------------
// A 4-column grid of KPI cards. Each card mirrors section-cards.tsx:
// CardHeader (description + big value + trend Badge action) over a CardFooter
// (a bold trend line + a muted note).
async function buildSectionCards(inputs: BlocksInputs): Promise<FrameNode> {
  const row = createRow("Section Cards", 16);
  row.counterAxisAlignItems = "MIN";
  row.paddingLeft = CONTENT_PADDING;
  row.paddingRight = CONTENT_PADDING;
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";

  for (const stat of STATS) {
    const card = await buildStatCard(inputs, stat);
    row.appendChild(card);
    try {
      (card as unknown as { layoutGrow: number }).layoutGrow = 1;
    } catch {
      // Keep intrinsic width.
    }
  }
  return row;
}

async function buildStatCard(
  inputs: BlocksInputs,
  stat: Stat,
): Promise<FrameNode> {
  const t = inputs.theme.light;

  // radix-nova Card: `gap-4 py-4 rounded-xl ring-1 ring-foreground/10` plus the
  // dashboard's `shadow-xs`. Header/footer carry the px-4 padding, so the card
  // itself only has vertical padding.
  const card = await createSurface(inputs, 260, {
    name: "Card",
    gap: 16,
    padding: 0,
  });
  card.paddingTop = 16;
  card.paddingBottom = 16;
  card.paddingLeft = 0;
  card.paddingRight = 0;
  await applyEffectStyle(card, inputs.effectStyles?.idFor("Shadow/xs"));

  // Header.
  const header = createColumn("Card Header", 6);
  header.paddingLeft = 16;
  header.paddingRight = 16;
  card.appendChild(header);
  fillWidth(header);

  const desc = createBody(inputs, stat.description, 14, "muted-foreground");
  header.appendChild(desc);
  fillWidth(desc);

  // Value row: the big tabular value with the trend Badge on the right.
  const valueRow = createRow("Value Row", 8);
  valueRow.primaryAxisSizingMode = "FIXED";
  valueRow.counterAxisAlignItems = "CENTER";
  valueRow.primaryAxisAlignItems = "SPACE_BETWEEN";
  header.appendChild(valueRow);
  fillWidth(valueRow);

  const value = createHeading(inputs, stat.value, 30, "card-foreground");
  valueRow.appendChild(value);

  // Trend Badge — reuse the published outline Badge with a trend icon.
  const badge = instanceFromComponents(
    inputs,
    "Badge",
    "Variant=outline, Style=icon",
    stat.delta,
  );
  if (badge) {
    valueRow.appendChild(badge);
  } else {
    valueRow.appendChild(buildFallbackBadge(inputs, stat.delta, stat.trendUp));
  }

  // Footer: a bold trend line + a muted note (`text-sm`).
  const footer = createColumn("Card Footer", 6);
  footer.paddingLeft = 16;
  footer.paddingRight = 16;
  card.appendChild(footer);
  fillWidth(footer);

  const trendLine = createRow("Trend", 6);
  const trendText = createBody(
    inputs,
    stat.footerTitle,
    14,
    "card-foreground",
    "Medium",
  );
  trendLine.appendChild(trendText);
  const trendIcon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: stat.trendUp ? "arrow-right" : "arrow-right",
    size: 16,
    color: t.get("card-foreground"),
  });
  if (trendIcon) {
    trendIcon.name = "Trend Icon";
    trendLine.appendChild(trendIcon);
  }
  footer.appendChild(trendLine);

  const note = createBody(inputs, stat.footerNote, 14, "muted-foreground");
  footer.appendChild(note);

  return card;
}

// --- Data table toolbar ----------------------------------------------------
// The tabs + actions row that sits above the data table
// (`flex items-center justify-between`): a "Outline" tabs strip on the left and
// "Customize Columns" + "Add Section" buttons on the right.
async function buildTableToolbar(inputs: BlocksInputs): Promise<FrameNode> {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const row = createRow("Toolbar", 8);
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisAlignItems = "CENTER";
  row.primaryAxisAlignItems = "SPACE_BETWEEN";

  // Tabs strip (`bg-muted rounded-lg p-0.5`).
  const tabs = figma.createFrame();
  tabs.name = "Tabs";
  tabs.layoutMode = "HORIZONTAL";
  tabs.primaryAxisSizingMode = "AUTO";
  tabs.counterAxisSizingMode = "AUTO";
  tabs.counterAxisAlignItems = "CENTER";
  tabs.itemSpacing = 4;
  tabs.paddingTop = 2;
  tabs.paddingBottom = 2;
  tabs.paddingLeft = 2;
  tabs.paddingRight = 2;
  tabs.cornerRadius = 8;
  bindCornerRadii(tabs, p.get("radius/lg"));
  bindFill(tabs, t.get("muted"));
  tabs.strokes = [];
  const tabLabels = ["Outline", "Past Performance", "Key Personnel"];
  for (let i = 0; i < tabLabels.length; i++) {
    tabs.appendChild(buildTab(inputs, tabLabels[i]!, i === 0));
  }
  row.appendChild(tabs);

  // Right actions.
  const actions = createRow("Actions", 8);
  const columnsBtn = instanceFromComponents(
    inputs,
    "Button",
    "Variant=outline, Size=sm, State=default",
    "Customize Columns",
  );
  if (columnsBtn) actions.appendChild(columnsBtn);
  const addBtn = instanceFromComponents(
    inputs,
    "Button",
    "Variant=outline, Size=sm, State=default",
    "Add Section",
  );
  if (addBtn) actions.appendChild(addBtn);
  row.appendChild(actions);

  return row;
}

function buildTab(
  inputs: BlocksInputs,
  label: string,
  active: boolean,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const tab = figma.createFrame();
  tab.name = active ? "Tab (active)" : "Tab";
  tab.layoutMode = "HORIZONTAL";
  tab.primaryAxisSizingMode = "AUTO";
  tab.counterAxisSizingMode = "FIXED";
  tab.primaryAxisAlignItems = "CENTER";
  tab.counterAxisAlignItems = "CENTER";
  tab.resize(10, 24);
  tab.paddingLeft = 10;
  tab.paddingRight = 10;
  tab.cornerRadius = 6;
  bindCornerRadii(tab, p.get("radius/md"));
  if (active) {
    bindFill(tab, t.get("background"));
  } else {
    tab.fills = [];
  }
  tab.strokes = [];

  const text = createBody(
    inputs,
    label,
    14,
    active ? "foreground" : "muted-foreground",
    "Medium",
  );
  tab.appendChild(text);
  return tab;
}

// --- Sizing helpers --------------------------------------------------------

function fillHeight(node: SceneNode): void {
  try {
    (node as unknown as { layoutSizingVertical: string }).layoutSizingVertical =
      "FILL";
  } catch {
    // Keep the node's intrinsic height.
  }
}

// ----- Fallbacks ------------------------------------------------------------
// `buildFallbackSidebar` always draws the dashboard's own left rail (the
// dashboard doesn't reuse the Sidebar block's variant set); the Badge / panel
// fallbacks below are used only when the page has no matching components.

function buildFallbackSidebar(inputs: BlocksInputs): FrameNode {
  const t = inputs.theme.light;

  const rail = figma.createFrame();
  rail.name = "Sidebar";
  rail.layoutMode = "VERTICAL";
  rail.primaryAxisSizingMode = "FIXED";
  rail.counterAxisSizingMode = "FIXED";
  rail.resize(SIDEBAR_WIDTH, CANVAS_HEIGHT);
  rail.itemSpacing = 8;
  rail.paddingTop = 16;
  rail.paddingBottom = 16;
  rail.paddingLeft = 12;
  rail.paddingRight = 12;
  bindFill(rail, t.get("sidebar") ?? t.get("card"));
  bindStrokeColor(rail, t.get("sidebar-border") ?? t.get("border"));
  rail.strokeWeight = 1;
  rail.strokeAlign = "INSIDE";

  const brand = createBody(inputs, "Acme Inc.", 16, "foreground", "Medium");
  rail.appendChild(brand);
  for (const item of [
    "Dashboard",
    "Lifecycle",
    "Analytics",
    "Projects",
    "Team",
  ]) {
    rail.appendChild(createBody(inputs, item, 14, "muted-foreground"));
  }
  return rail;
}

function buildFallbackBadge(
  inputs: BlocksInputs,
  label: string,
  trendUp: boolean,
): FrameNode {
  const t = inputs.theme.light;
  const p = inputs.primitives;

  const badge = figma.createFrame();
  badge.name = "Badge";
  badge.layoutMode = "HORIZONTAL";
  badge.primaryAxisSizingMode = "AUTO";
  badge.counterAxisSizingMode = "FIXED";
  badge.counterAxisAlignItems = "CENTER";
  badge.itemSpacing = 4;
  badge.paddingLeft = 8;
  badge.paddingRight = 8;
  badge.resize(10, 20);
  badge.cornerRadius = 8;
  bindCornerRadii(badge, p.get("radius/lg"));
  badge.fills = [];
  bindStrokeColor(badge, t.get("border"));
  badge.strokeWeight = 1;

  const icon = createIcon({
    library: resolveIconLibrary(inputs.presetSummary),
    name: "arrow-right",
    size: 12,
    color: t.get("foreground"),
  });
  if (icon) {
    icon.name = "Icon";
    badge.appendChild(icon);
  }

  const text = figma.createText();
  applyFont(text, "body", "Medium");
  text.characters = label;
  text.fontSize = 12;
  bindFontSize(text, p.get("font/size/xs"));
  bindFill(text, t.get("foreground"));
  badge.appendChild(text);
  return badge;
}

async function buildFallbackPanel(
  inputs: BlocksInputs,
  title: string,
): Promise<FrameNode> {
  const surface = await createSurface(inputs, 720, {
    name: title,
    padding: 20,
    gap: 12,
  });
  const heading = createHeading(inputs, title, 16, "card-foreground");
  surface.appendChild(heading);
  fillWidth(heading);
  const body = createBody(
    inputs,
    "Content panel — replace with a chart or table.",
    14,
    "muted-foreground",
  );
  surface.appendChild(body);
  fillWidth(body);
  surface.resize(720, 240);
  surface.primaryAxisSizingMode = "FIXED";
  return surface;
}
