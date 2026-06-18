// Chart renderers: the shared Figma/SVG geometry that turns a ChartPattern into
// one card-shaped ComponentNode. Bars are real Figma rectangles (editable);
// curves, areas, pies, radar polygons, and radial arcs are drawn with
// figma.createNodeFromSvg and recoloured through the shared icon-recolour pass
// so each series binds to a `chart-*` theme variable — sandbox-safe, no
// Recharts runtime, no DOM, no network.
//
// Every family reads its dimensions from the single CHART_CONFIG. The set ships
// one size; the card is laid out to flow on resize — the header, month axis,
// and legend are auto-layout (FILL / SPACE_BETWEEN / WRAP) and the plot frame
// fills the card width and clips, so resizing the instance reflows the chrome
// around the (fixed) drawn geometry.
//
// The renderer intentionally understands a superset of the curated catalogue's
// flags (labels, per-bar colours, expand-stack, extra radar grid styles, …) so
// trimmed-back variants can be re-added in data.ts without touching this engine.

import {
  bindCornerRadii,
  bindFill,
  bindFontSize,
  bindStrokeColor,
} from "../../../componentsPage/bindings";
import { applyFont } from "../../../fonts";
import { recolorIcon } from "../../../icons";
import type { BlocksInputs } from "../../types";
import {
  MONTHS,
  PIE_SERIES,
  RADAR_A,
  RADAR_AXES,
  RADAR_B,
  RADIAL_VALUES,
  SERIES_A,
  SERIES_A_LABELS,
  SERIES_B,
  SERIES_C,
  type ChartPattern,
} from "./data";
import { CHART_CONFIG, plotWidth, type ChartConfig } from "./sizes";

const CHART_KEYS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
// Bar chart with positive + negative datapoints (chart-bar-negative).
const BAR_NEG = [0.5, -0.35, 0.62, -0.22, 0.42, -0.5];

type Ctx = {
  inputs: BlocksInputs;
  t: Map<string, Variable>;
  size: ChartConfig;
  // Plot drawing area.
  w: number;
  h: number;
};

// Build one chart card as a ComponentNode (the unit the component set combines
// into a `Family`/`Variant` variant).
export function buildChartCard(
  inputs: BlocksInputs,
  pattern: ChartPattern,
): ComponentNode {
  const size = CHART_CONFIG;
  const ctx: Ctx = {
    inputs,
    t: inputs.theme.light,
    size,
    w: plotWidth(size),
    h: size.plotHeight,
  };

  const comp = figma.createComponent();
  comp.name = `Family=${pattern.family}, Variant=${pattern.variant}`;
  comp.layoutMode = "VERTICAL";
  comp.resize(size.cardWidth, 10);
  comp.primaryAxisSizingMode = "AUTO";
  comp.counterAxisSizingMode = "FIXED";
  comp.itemSpacing = size.gap;
  comp.paddingTop = size.pad;
  comp.paddingBottom = size.pad;
  comp.paddingLeft = size.pad;
  comp.paddingRight = size.pad;
  comp.cornerRadius = 12;
  bindCornerRadii(comp, inputs.primitives.get("radius/xl"));
  bindFill(comp, ctx.t.get("card"));
  bindStrokeColor(comp, ctx.t.get("border"));
  comp.strokeWeight = 1;
  comp.strokeAlign = "INSIDE";

  // Header (title + supporting copy).
  const header = column(ctx, "Header", 4);
  const title = text(
    ctx,
    header,
    pattern.title,
    size.titleSize,
    "card-foreground",
    "Medium",
    "heading",
  );
  title.layoutSizingHorizontal = "FILL";
  text(ctx, header, pattern.subtitle, size.subtitleSize, "muted-foreground");
  comp.appendChild(header);
  header.layoutSizingHorizontal = "FILL";

  // Plot — fills the card width and clips so the chrome reflows on resize.
  const plot = buildPlot(ctx, pattern);
  comp.appendChild(plot);
  plot.layoutSizingHorizontal = "FILL";
  plot.clipsContent = true;

  // Footer: cartesian charts get a month axis; everything with a legend gets
  // a swatch legend (interactive charts read as a legend too).
  if (isCartesian(pattern) && !pattern.horizontal) {
    const axis = buildMonthAxis(ctx);
    comp.appendChild(axis);
    axis.layoutSizingHorizontal = "FILL";
  }
  if (pattern.legend) {
    const legend = buildLegend(ctx, pattern);
    comp.appendChild(legend);
    legend.layoutSizingHorizontal = "FILL";
  } else {
    const trend = buildTrend(ctx, pattern);
    comp.appendChild(trend);
    trend.layoutSizingHorizontal = "FILL";
  }

  return comp;
}

function isCartesian(p: ChartPattern): boolean {
  return p.family === "Area" || p.family === "Bar" || p.family === "Line";
}

// --- Plot dispatch ---------------------------------------------------------

function buildPlot(ctx: Ctx, p: ChartPattern): FrameNode {
  switch (p.family) {
    case "Bar":
      return buildBarPlot(ctx, p);
    case "Line":
      return buildLinePlot(ctx, p);
    case "Area":
      return buildAreaPlot(ctx, p);
    case "Pie":
      return buildPiePlot(ctx, p);
    case "Radar":
      return buildRadarPlot(ctx, p);
    case "Radial":
      return buildRadialPlot(ctx, p);
  }
}

// --- Bar -------------------------------------------------------------------

function buildBarPlot(ctx: Ctx, p: ChartPattern): FrameNode {
  const plot = canvasPlot(ctx, "Plot");
  if (p.horizontal) return buildHorizontalBars(ctx, plot, p);

  const radius = 6;
  const n = MONTHS.length;
  const slot = ctx.w / n;
  const baseY = p.negative ? ctx.h / 2 : ctx.h;
  if (p.negative) addAxisLine(ctx, plot, 0, baseY, ctx.w, baseY);

  for (let i = 0; i < n; i++) {
    const cx = slot * i + slot / 2;
    if (p.stacked && p.multiple) {
      // Two stacked segments per column (chart-1 bottom, chart-2 on top).
      const bw = slot * 0.5;
      const h1 = SERIES_B[i]! * ctx.h * 0.6;
      const h2 = SERIES_C[i]! * ctx.h * 0.6;
      addBar(ctx, plot, cx - bw / 2, ctx.h - h1, bw, h1, "chart-1", {
        radius: 0,
      });
      addBar(ctx, plot, cx - bw / 2, ctx.h - h1 - h2, bw, h2, "chart-2", {
        radius,
        top: true,
      });
    } else if (p.multiple) {
      // Grouped pair (chart-1 / chart-2) sharing the slot.
      const bw = slot * 0.28;
      const gap = slot * 0.08;
      const h1 = SERIES_A[i]! * ctx.h;
      const h2 = SERIES_B[i]! * ctx.h;
      addBar(ctx, plot, cx - bw - gap / 2, ctx.h - h1, bw, h1, "chart-1", {
        radius,
        top: true,
      });
      addBar(ctx, plot, cx + gap / 2, ctx.h - h2, bw, h2, "chart-2", {
        radius,
        top: true,
      });
    } else if (p.negative) {
      const v = BAR_NEG[i]!;
      const bw = slot * 0.5;
      const mag = Math.abs(v) * (ctx.h / 2);
      const y = v >= 0 ? baseY - mag : baseY;
      addBar(
        ctx,
        plot,
        cx - bw / 2,
        y,
        bw,
        mag,
        v >= 0 ? "chart-1" : "chart-2",
        { radius: 4, top: v >= 0 },
      );
    } else {
      const bw = slot * 0.56;
      const hv = SERIES_A[i]! * ctx.h;
      const key = p.perBarColor
        ? CHART_KEYS[i % CHART_KEYS.length]!
        : "chart-1";
      const dim = p.active && i !== 3;
      addBar(ctx, plot, cx - bw / 2, ctx.h - hv, bw, hv, key, {
        radius,
        top: true,
        opacity: dim ? 0.4 : 1,
      });
      if (p.labels)
        addBarLabel(ctx, plot, cx, ctx.h - hv - 4, SERIES_A_LABELS[i]!);
    }
  }
  return plot;
}

function buildHorizontalBars(
  ctx: Ctx,
  plot: FrameNode,
  p: ChartPattern,
): FrameNode {
  const n = MONTHS.length;
  const slot = ctx.h / n;
  const radius = 6;
  addAxisLine(ctx, plot, 0, 0, 0, ctx.h);
  for (let i = 0; i < n; i++) {
    const cy = slot * i + slot / 2;
    const bh = slot * 0.56;
    const bw = SERIES_A[i]! * ctx.w;
    const key = p.perBarColor ? CHART_KEYS[i % CHART_KEYS.length]! : "chart-1";
    addBar(ctx, plot, 0, cy - bh / 2, bw, bh, key, { radius, right: true });
    addBarLabel(ctx, plot, 8, cy - 6, MONTHS[i]!, "left");
  }
  return plot;
}

function addBar(
  ctx: Ctx,
  plot: FrameNode,
  x: number,
  y: number,
  w: number,
  h: number,
  colorKey: string,
  opts: { radius?: number; top?: boolean; right?: boolean; opacity?: number },
): void {
  const bar = figma.createRectangle();
  bar.name = "Bar";
  bar.resize(Math.max(2, w), Math.max(2, h));
  bar.x = x;
  bar.y = y;
  const r = opts.radius ?? 0;
  if (r > 0) {
    if (opts.top) {
      bar.topLeftRadius = r;
      bar.topRightRadius = r;
    } else if (opts.right) {
      bar.topRightRadius = r;
      bar.bottomRightRadius = r;
    } else {
      bar.cornerRadius = r;
    }
  }
  if (opts.opacity !== undefined) bar.opacity = opts.opacity;
  bindFill(bar, ctx.t.get(colorKey));
  plot.appendChild(bar);
}

function addBarLabel(
  ctx: Ctx,
  plot: FrameNode,
  x: number,
  y: number,
  value: string,
  align: "center" | "left" = "center",
): void {
  const label = figma.createText();
  applyFont(label, "body", "Medium");
  label.characters = value;
  label.fontSize = ctx.size.labelSize;
  bindFontSize(label, ctx.inputs.primitives.get("font/size/xs"));
  bindFill(label, ctx.t.get("muted-foreground"));
  plot.appendChild(label);
  label.x = align === "center" ? x - label.width / 2 : x;
  label.y = y - label.height;
}

// --- Line ------------------------------------------------------------------

function buildLinePlot(ctx: Ctx, p: ChartPattern): FrameNode {
  const plot = canvasPlot(ctx, "Plot");
  addGridLines(ctx, plot);

  const seriesList: { values: number[]; key: string }[] = [
    { values: SERIES_A, key: "chart-1" },
  ];
  if (p.multiple) seriesList.push({ values: SERIES_B, key: "chart-2" });

  for (const series of seriesList) {
    addSvg(
      ctx,
      plot,
      pathSvg(ctx, linePath(ctx, series.values, p.curve), { stroke: 2 }),
      ctx.t.get(series.key),
    );
    if (p.dots && p.dots !== "none")
      addDots(ctx, plot, series.values, series.key, p.dots);
  }
  if (p.labels) {
    for (let i = 0; i < SERIES_A.length; i++) {
      const x = (i / (SERIES_A.length - 1)) * ctx.w;
      const y = ctx.h - SERIES_A[i]! * ctx.h;
      addBarLabel(ctx, plot, x, y - 8, SERIES_A_LABELS[i]!);
    }
  }
  return plot;
}

function addDots(
  ctx: Ctx,
  plot: FrameNode,
  values: number[],
  key: string,
  style: string,
): void {
  const last = values.length - 1;
  const r = style === "custom" ? 5 : 3.5;
  for (let i = 0; i < values.length; i++) {
    const cx = (i / last) * ctx.w;
    const cy = ctx.h - values[i]! * ctx.h;
    const dotKey =
      style === "colors" ? CHART_KEYS[i % CHART_KEYS.length]! : key;
    const dot = figma.createEllipse();
    dot.name = "Dot";
    dot.resize(r * 2, r * 2);
    dot.x = cx - r;
    dot.y = cy - r;
    bindFill(dot, ctx.t.get(dotKey));
    if (style === "custom") {
      bindStrokeColor(dot, ctx.t.get("card"));
      dot.strokeWeight = 2;
    }
    plot.appendChild(dot);
  }
}

// --- Area ------------------------------------------------------------------

function buildAreaPlot(ctx: Ctx, p: ChartPattern): FrameNode {
  const plot = canvasPlot(ctx, "Plot");
  if (p.axes) addAxisLine(ctx, plot, 0, 0, 0, ctx.h);
  addGridLines(ctx, plot);

  if (p.multiple) {
    const base = p.stacked
      ? SERIES_A.map((v, i) => v + SERIES_B[i]!)
      : SERIES_A;
    const top = p.expand ? base.map(() => 0.9) : base;
    addSvg(
      ctx,
      plot,
      pathSvg(ctx, areaPath(ctx, top, p.curve), { fill: true }),
      ctx.t.get("chart-1"),
      p.gradient ? 0.35 : 0.45,
    );
    addSvg(
      ctx,
      plot,
      pathSvg(ctx, areaPath(ctx, SERIES_B, p.curve), { fill: true }),
      ctx.t.get("chart-2"),
      p.gradient ? 0.45 : 0.6,
    );
  } else {
    addSvg(
      ctx,
      plot,
      pathSvg(ctx, areaPath(ctx, SERIES_A, p.curve), { fill: true }),
      ctx.t.get("chart-1"),
      p.gradient ? 0.4 : 0.5,
    );
    addSvg(
      ctx,
      plot,
      pathSvg(ctx, linePath(ctx, SERIES_A, p.curve), { stroke: 2 }),
      ctx.t.get("chart-1"),
    );
  }
  return plot;
}

// --- Pie -------------------------------------------------------------------

function buildPiePlot(ctx: Ctx, p: ChartPattern): FrameNode {
  const plot = canvasPlot(ctx, "Plot");
  const cx = ctx.w / 2;
  const cy = ctx.h / 2;
  const outer = Math.min(ctx.w, ctx.h) / 2 - 8;
  const gap = p.separator ? 3 : 0;

  let angle = 0;
  for (let i = 0; i < PIE_SERIES.length; i++) {
    const sweep = PIE_SERIES[i]!.value * 360;
    const a0 = angle + gap / 2;
    const a1 = angle + sweep - gap / 2;
    const r = p.active && i === 0 ? outer + 6 : outer;
    addSvg(
      ctx,
      plot,
      pathSvg(ctx, wedgePath(cx, cy, r, a0, a1), { fill: true }),
      ctx.t.get(PIE_SERIES[i]!.key),
    );
    if (p.labels) {
      const mid = (a0 + a1) / 2;
      const pos = polar(cx, cy, outer * 0.6, mid);
      addBarLabel(
        ctx,
        plot,
        pos.x,
        pos.y + 6,
        String(Math.round(PIE_SERIES[i]!.value * 100)),
      );
    }
    angle += sweep;
  }

  if (p.donut) {
    const innerR = outer * (p.ring ? 0.62 : 0.58);
    const hole = figma.createEllipse();
    hole.name = "Hole";
    hole.resize(innerR * 2, innerR * 2);
    hole.x = cx - innerR;
    hole.y = cy - innerR;
    bindFill(hole, ctx.t.get("card"));
    plot.appendChild(hole);
    if (p.ring) drawRing(ctx, plot, cx, cy, innerR - 4, "chart-3", 6);
    if (p.donutText) addCenterText(ctx, plot, cx, cy, "1,125", "Visitors");
  }
  return plot;
}

function drawRing(
  ctx: Ctx,
  plot: FrameNode,
  cx: number,
  cy: number,
  r: number,
  key: string,
  width: number,
): void {
  addSvg(ctx, plot, arcSvg(ctx, cx, cy, r, 0, 250, width), ctx.t.get(key));
}

// --- Radar -----------------------------------------------------------------

function buildRadarPlot(ctx: Ctx, p: ChartPattern): FrameNode {
  const plot = canvasPlot(ctx, "Plot");
  const cx = ctx.w / 2;
  const cy = ctx.h / 2;
  const R = ctx.h / 2 - 14;
  const n = RADAR_AXES.length;
  const circle = p.grid && p.grid.indexOf("circle") === 0;

  if (p.grid === "circle-fill") {
    const bg = figma.createEllipse();
    bg.name = "Grid Fill";
    bg.resize(R * 2, R * 2);
    bg.x = cx - R;
    bg.y = cy - R;
    bindFill(bg, ctx.t.get("muted"));
    bg.opacity = 0.5;
    plot.appendChild(bg);
  }

  if (p.grid !== "none") {
    let grid = "";
    const levels = p.grid === "custom" ? [0.5, 1] : [0.33, 0.66, 1];
    for (const level of levels) {
      grid += circle
        ? `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * level)}" fill="none" stroke="currentColor" stroke-width="1"/>`
        : `<path d="${radarPolygon(cx, cy, R, level, n)}" fill="none" stroke="currentColor" stroke-width="1"/>`;
    }
    const spokes =
      !circle || (p.grid !== "circle-no-lines" && p.grid !== "circle-fill");
    if (spokes) {
      for (let i = 0; i < n; i++) {
        const pt = polar(cx, cy, R, i * (360 / n));
        grid += `<line x1="${f(cx)}" y1="${f(cy)}" x2="${f(pt.x)}" y2="${f(pt.y)}" stroke="currentColor" stroke-width="1"/>`;
      }
    }
    addSvg(ctx, plot, svg(ctx, grid), ctx.t.get("border"), 0.7);
  }

  const seriesList = [{ values: RADAR_A, key: "chart-1" }];
  if (p.multiple) seriesList.push({ values: RADAR_B, key: "chart-2" });
  for (const series of seriesList) {
    const d = radarData(cx, cy, R, series.values, n);
    addSvg(
      ctx,
      plot,
      `<svg width="${ctx.w}" height="${ctx.h}" viewBox="0 0 ${ctx.w} ${ctx.h}" xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="${p.linesOnly ? "none" : "currentColor"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
      ctx.t.get(series.key),
      p.linesOnly ? 1 : 0.5,
    );
    if (p.dots && p.dots !== "none") {
      for (let i = 0; i < n; i++) {
        const pt = polar(cx, cy, R * series.values[i]!, i * (360 / n));
        const dot = figma.createEllipse();
        dot.resize(6, 6);
        dot.x = pt.x - 3;
        dot.y = pt.y - 3;
        bindFill(dot, ctx.t.get(series.key));
        plot.appendChild(dot);
      }
    }
  }
  return plot;
}

// --- Radial ----------------------------------------------------------------

function buildRadialPlot(ctx: Ctx, p: ChartPattern): FrameNode {
  const plot = canvasPlot(ctx, "Plot");
  const cx = ctx.w / 2;
  const cy = ctx.h / 2;
  const outer = ctx.h / 2 - 8;
  const thickness = 14;
  const gapR = 6;
  const count = p.series ?? 3;

  if (p.stacked) {
    // Two values stacked end-to-end on a single ring (chart-1 then chart-2).
    drawTrack(ctx, plot, cx, cy, outer - thickness, thickness);
    addSvg(
      ctx,
      plot,
      arcSvg(ctx, cx, cy, outer - thickness, 0, 130, thickness),
      ctx.t.get("chart-1"),
    );
    addSvg(
      ctx,
      plot,
      arcSvg(ctx, cx, cy, outer - thickness, 130, 250, thickness),
      ctx.t.get("chart-2"),
    );
    addCenterText(ctx, plot, cx, cy - thickness, "1,125", "Visitors");
    return plot;
  }

  for (let i = 0; i < count; i++) {
    const r = outer - i * (thickness + gapR);
    drawTrack(ctx, plot, cx, cy, r, thickness);
    addSvg(
      ctx,
      plot,
      arcSvg(
        ctx,
        cx,
        cy,
        r,
        0,
        RADIAL_VALUES[i % RADIAL_VALUES.length]! * 360,
        thickness,
      ),
      ctx.t.get(CHART_KEYS[i]!),
    );
    if (p.labels) {
      const pos = polar(cx, cy, r, 0);
      addBarLabel(ctx, plot, pos.x + 10, pos.y, PIE_SERIES[i]!.label, "left");
    }
  }
  if (p.grid) {
    // A faint outer polar grid circle behind the rings.
    addSvg(
      ctx,
      plot,
      `<svg width="${ctx.w}" height="${ctx.h}" viewBox="0 0 ${ctx.w} ${ctx.h}" xmlns="http://www.w3.org/2000/svg"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(outer + 2)}" fill="none" stroke="currentColor" stroke-width="1"/></svg>`,
      ctx.t.get("border"),
      0.6,
    );
  }
  if (p.donutText) addCenterText(ctx, plot, cx, cy, "1,125", "Visitors");
  return plot;
}

function drawTrack(
  ctx: Ctx,
  plot: FrameNode,
  cx: number,
  cy: number,
  r: number,
  width: number,
): void {
  addSvg(
    ctx,
    plot,
    arcSvg(ctx, cx, cy, r, 0, 359.99, width),
    ctx.t.get("muted"),
    0.6,
  );
}

// --- Shared frames + axis/legend -------------------------------------------

// A fixed-size, non-auto-layout plot frame the SVG/rectangle series are
// positioned inside.
function canvasPlot(ctx: Ctx, name: string): FrameNode {
  const plot = figma.createFrame();
  plot.name = name;
  plot.layoutMode = "NONE";
  plot.resize(ctx.w, ctx.h);
  plot.fills = [];
  plot.strokes = [];
  plot.clipsContent = false;
  plot.layoutAlign = "STRETCH";
  return plot;
}

function addAxisLine(
  ctx: Ctx,
  plot: FrameNode,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const line = figma.createRectangle();
  line.name = "Axis";
  const horizontal = y1 === y2;
  line.resize(
    horizontal ? Math.max(1, x2 - x1) : 1,
    horizontal ? 1 : Math.max(1, y2 - y1),
  );
  line.x = x1;
  line.y = y1 - (horizontal ? 0 : 0);
  bindFill(line, ctx.t.get("border"));
  plot.appendChild(line);
}

function addGridLines(ctx: Ctx, plot: FrameNode): void {
  let inner = "";
  for (let i = 1; i <= 3; i++) {
    const y = (i / 4) * ctx.h;
    inner += `<line x1="0" y1="${f(y)}" x2="${f(ctx.w)}" y2="${f(y)}" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>`;
  }
  addSvg(ctx, plot, svg(ctx, inner), ctx.t.get("border"), 0.5);
}

function buildMonthAxis(ctx: Ctx): FrameNode {
  const row = figma.createFrame();
  row.name = "Axis";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "AUTO";
  row.primaryAxisAlignItems = "SPACE_BETWEEN";
  row.resize(ctx.w, 16);
  row.fills = [];
  row.strokes = [];
  for (const month of MONTHS) {
    text(ctx, row, month, ctx.size.labelSize, "muted-foreground");
  }
  return row;
}

function buildLegend(ctx: Ctx, p: ChartPattern): FrameNode {
  const legend = figma.createFrame();
  legend.name = "Legend";
  legend.layoutMode = "HORIZONTAL";
  legend.layoutWrap = "WRAP";
  legend.primaryAxisSizingMode = "FIXED";
  legend.counterAxisSizingMode = "AUTO";
  legend.counterAxisAlignItems = "CENTER";
  legend.itemSpacing = 12;
  legend.counterAxisSpacing = 6;
  legend.resize(ctx.w, 10);
  legend.fills = [];
  legend.strokes = [];

  const items =
    p.family === "Pie" || p.family === "Radial"
      ? PIE_SERIES.map((s) => ({ label: s.label, key: s.key }))
      : [
          { label: "Desktop", key: "chart-1" },
          { label: "Mobile", key: "chart-2" },
        ];
  for (const item of items) {
    legend.appendChild(buildLegendItem(ctx, item.label, item.key, p.icons));
  }
  return legend;
}

function buildLegendItem(
  ctx: Ctx,
  label: string,
  colorKey: string,
  icons?: boolean,
): FrameNode {
  const item = figma.createFrame();
  item.name = "Legend Item";
  item.layoutMode = "HORIZONTAL";
  item.primaryAxisSizingMode = "AUTO";
  item.counterAxisSizingMode = "AUTO";
  item.counterAxisAlignItems = "CENTER";
  item.itemSpacing = 6;
  item.fills = [];
  item.strokes = [];

  const swatch = figma.createRectangle();
  swatch.name = "Swatch";
  swatch.resize(10, 10);
  swatch.cornerRadius = icons ? 5 : 2;
  bindCornerRadii(
    swatch as unknown as FrameNode,
    ctx.inputs.primitives.get("radius/xs"),
  );
  bindFill(swatch, ctx.t.get(colorKey));
  item.appendChild(swatch);

  text(ctx, item, label, ctx.size.labelSize, "muted-foreground");
  return item;
}

// A two-line trend footer (the CardFooter shadcn charts ship without a legend).
function buildTrend(ctx: Ctx, p: ChartPattern): FrameNode {
  const col = column(ctx, "Footer", 2);
  text(
    ctx,
    col,
    "Trending up by 5.2% this month",
    ctx.size.labelSize,
    "card-foreground",
    "Medium",
  );
  text(ctx, col, p.subtitle, ctx.size.labelSize, "muted-foreground");
  return col;
}

function addCenterText(
  ctx: Ctx,
  plot: FrameNode,
  cx: number,
  cy: number,
  value: string,
  label: string,
): void {
  const big = figma.createText();
  applyFont(big, "heading", "Bold");
  big.characters = value;
  big.fontSize = ctx.size.titleSize + 6;
  bindFill(big, ctx.t.get("card-foreground"));
  plot.appendChild(big);
  big.x = cx - big.width / 2;
  big.y = cy - big.height;

  const small = figma.createText();
  applyFont(small, "body", "Regular");
  small.characters = label;
  small.fontSize = ctx.size.labelSize;
  bindFill(small, ctx.t.get("muted-foreground"));
  plot.appendChild(small);
  small.x = cx - small.width / 2;
  small.y = cy + 2;
}

// --- Text + frame helpers --------------------------------------------------

function column(ctx: Ctx, name: string, gap: number): FrameNode {
  const col = figma.createFrame();
  col.name = name;
  col.layoutMode = "VERTICAL";
  col.primaryAxisSizingMode = "AUTO";
  col.counterAxisSizingMode = "AUTO";
  col.itemSpacing = gap;
  col.fills = [];
  col.strokes = [];
  return col;
}

function text(
  ctx: Ctx,
  parent: FrameNode,
  chars: string,
  size: number,
  colorKey: string,
  weight: "Regular" | "Medium" | "Bold" = "Regular",
  kind: "body" | "heading" = "body",
): TextNode {
  const node = figma.createText();
  applyFont(node, kind, weight);
  node.characters = chars;
  node.fontSize = size;
  bindFill(node, ctx.t.get(colorKey));
  parent.appendChild(node);
  return node;
}

// --- SVG geometry ----------------------------------------------------------

function addSvg(
  ctx: Ctx,
  plot: FrameNode,
  markup: string,
  colorVar: Variable | undefined,
  opacity?: number,
): void {
  const node = figma.createNodeFromSvg(markup);
  node.name = "Series";
  recolorIcon(node, colorVar);
  if (opacity !== undefined) node.opacity = opacity;
  plot.appendChild(node);
  node.x = 0;
  node.y = 0;
}

function linePath(ctx: Ctx, values: number[], curve?: string): string {
  const last = values.length - 1;
  const pt = (i: number) => ({
    x: (i / last) * ctx.w,
    y: ctx.h - values[i]! * ctx.h,
  });
  if (curve === "step") {
    let d = "";
    for (let i = 0; i < values.length; i++) {
      const c = pt(i);
      if (i === 0) d += `M ${f(c.x)} ${f(c.y)} `;
      else {
        const prev = pt(i - 1);
        d += `L ${f(c.x)} ${f(prev.y)} L ${f(c.x)} ${f(c.y)} `;
      }
    }
    return d.trim();
  }
  if (curve === "linear") {
    let d = "";
    for (let i = 0; i < values.length; i++) {
      const c = pt(i);
      d += (i === 0 ? "M " : "L ") + f(c.x) + " " + f(c.y) + " ";
    }
    return d.trim();
  }
  // Natural (smoothed) — horizontal-tangent cubic between points.
  let d = `M ${f(pt(0).x)} ${f(pt(0).y)} `;
  for (let i = 0; i < last; i++) {
    const a = pt(i);
    const b = pt(i + 1);
    const mx = (a.x + b.x) / 2;
    d += `C ${f(mx)} ${f(a.y)} ${f(mx)} ${f(b.y)} ${f(b.x)} ${f(b.y)} `;
  }
  return d.trim();
}

function areaPath(ctx: Ctx, values: number[], curve?: string): string {
  return (
    linePath(ctx, values, curve) +
    ` L ${f(ctx.w)} ${f(ctx.h)} L 0 ${f(ctx.h)} Z`
  );
}

function wedgePath(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
): string {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${f(cx)} ${f(cy)} L ${f(p0.x)} ${f(p0.y)} A ${f(r)} ${f(r)} 0 ${large} 1 ${f(p1.x)} ${f(p1.y)} Z`;
}

function arcSvg(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  width: number,
): string {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  const d = `M ${f(p0.x)} ${f(p0.y)} A ${f(r)} ${f(r)} 0 ${large} 1 ${f(p1.x)} ${f(p1.y)}`;
  return `<svg width="${ctx.w}" height="${ctx.h}" viewBox="0 0 ${ctx.w} ${ctx.h}" xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round"/></svg>`;
}

function radarPolygon(
  cx: number,
  cy: number,
  R: number,
  scale: number,
  n: number,
): string {
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = polar(cx, cy, R * scale, i * (360 / n));
    d += (i === 0 ? "M " : "L ") + f(p.x) + " " + f(p.y) + " ";
  }
  return d.trim() + " Z";
}

function radarData(
  cx: number,
  cy: number,
  R: number,
  values: number[],
  n: number,
): string {
  let d = "M ";
  for (let i = 0; i < n; i++) {
    const p = polar(cx, cy, R * values[i]!, i * (360 / n));
    d += (i === 0 ? "" : "L ") + f(p.x) + " " + f(p.y) + " ";
  }
  return d.trim() + " Z";
}

function svg(ctx: Ctx, inner: string): string {
  return `<svg width="${ctx.w}" height="${ctx.h}" viewBox="0 0 ${ctx.w} ${ctx.h}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

function pathSvg(
  ctx: Ctx,
  d: string,
  opts: { stroke?: number; fill?: boolean },
): string {
  const fillAttr = opts.fill ? `fill="currentColor"` : `fill="none"`;
  const strokeAttr =
    opts.stroke !== undefined
      ? `stroke="currentColor" stroke-width="${opts.stroke}" stroke-linecap="round" stroke-linejoin="round"`
      : `stroke="none"`;
  return svg(ctx, `<path d="${d}" ${fillAttr} ${strokeAttr}/>`);
}

function polar(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function f(value: number): string {
  return String(Math.round(value * 100) / 100);
}
