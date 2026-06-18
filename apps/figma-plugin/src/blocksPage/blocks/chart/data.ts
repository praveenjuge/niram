// A curated subset of the shadcn/ui chart catalogue (ui.shadcn.com/charts),
// modelled as data so the renderer can stamp out one Figma variant per pattern.
// We keep ~4 visually-distinct patterns per family (the variants that read
// differently as a *static* Figma chart) rather than every official permutation
// — many official variants differ only in live/interactive or label-formatting
// behaviour that can't exist in a static frame. Each entry carries the registry
// id, the chart family, the Figma `Variant` label (unique within a family), and
// a compact bag of flags describing the variation (stacked / multiple /
// negative / donut / grid style / …). The renderer reads these flags and binds
// every series to the theme's `chart-1…5` variables, so the static Figma chart
// recolours with the preset exactly like the live ChartContainer does.

export type ChartFamily = "Area" | "Bar" | "Line" | "Pie" | "Radar" | "Radial";

export type DotStyle = "none" | "default" | "custom" | "colors";
export type CurveStyle = "natural" | "linear" | "step";
export type RadarGrid =
  | "default"
  | "none"
  | "circle"
  | "circle-no-lines"
  | "circle-fill"
  | "custom";

export type ChartPattern = {
  // Official registry id (e.g. "chart-area-stacked").
  id: string;
  family: ChartFamily;
  // Figma `Variant` value — unique within the family.
  variant: string;
  title: string;
  subtitle: string;
  // Cartesian (Area / Bar / Line / Tooltip) flags.
  curve?: CurveStyle;
  stacked?: boolean;
  expand?: boolean;
  multiple?: boolean;
  negative?: boolean;
  horizontal?: boolean;
  dots?: DotStyle;
  labels?: boolean;
  axes?: boolean;
  gradient?: boolean;
  perBarColor?: boolean;
  active?: boolean;
  // Pie / Radial flags.
  donut?: boolean;
  donutText?: boolean;
  centerLabel?: boolean;
  separator?: boolean;
  labelList?: boolean;
  ring?: boolean;
  series?: number;
  // Radar flags.
  grid?: RadarGrid;
  linesOnly?: boolean;
  // Shared.
  legend?: boolean;
  icons?: boolean;
  interactive?: boolean;
};

const AREA: ChartPattern[] = [
  {
    id: "chart-area-default",
    family: "Area",
    variant: "Default",
    title: "Area Chart",
    subtitle: "Showing total visitors for the last 6 months",
  },
  {
    id: "chart-area-stacked",
    family: "Area",
    variant: "Stacked",
    title: "Area Chart - Stacked",
    subtitle: "January - June 2024",
    multiple: true,
    stacked: true,
    legend: true,
  },
  {
    id: "chart-area-gradient",
    family: "Area",
    variant: "Gradient",
    title: "Area Chart - Gradient",
    subtitle: "January - June 2024",
    multiple: true,
    gradient: true,
    legend: true,
  },
  {
    id: "chart-area-interactive",
    family: "Area",
    variant: "Interactive",
    title: "Area Chart - Interactive",
    subtitle: "Showing total visitors for the last 3 months",
    multiple: true,
    stacked: true,
    gradient: true,
    legend: true,
    interactive: true,
  },
];

const BAR: ChartPattern[] = [
  {
    id: "chart-bar-default",
    family: "Bar",
    variant: "Default",
    title: "Bar Chart",
    subtitle: "January - June 2024",
  },
  {
    id: "chart-bar-horizontal",
    family: "Bar",
    variant: "Horizontal",
    title: "Bar Chart - Horizontal",
    subtitle: "January - June 2024",
    horizontal: true,
  },
  {
    id: "chart-bar-stacked",
    family: "Bar",
    variant: "Stacked",
    title: "Bar Chart - Stacked + Legend",
    subtitle: "January - June 2024",
    multiple: true,
    stacked: true,
    legend: true,
  },
  {
    id: "chart-bar-negative",
    family: "Bar",
    variant: "Negative",
    title: "Bar Chart - Negative",
    subtitle: "January - June 2024",
    negative: true,
  },
];

const LINE: ChartPattern[] = [
  {
    id: "chart-line-default",
    family: "Line",
    variant: "Default",
    title: "Line Chart",
    subtitle: "January - June 2024",
  },
  {
    id: "chart-line-multiple",
    family: "Line",
    variant: "Multiple",
    title: "Line Chart - Multiple",
    subtitle: "January - June 2024",
    multiple: true,
    legend: true,
  },
  {
    id: "chart-line-dots",
    family: "Line",
    variant: "Dots",
    title: "Line Chart - Dots",
    subtitle: "January - June 2024",
    dots: "default",
  },
  {
    id: "chart-line-step",
    family: "Line",
    variant: "Step",
    title: "Line Chart - Step",
    subtitle: "January - June 2024",
    curve: "step",
  },
];

const PIE: ChartPattern[] = [
  {
    id: "chart-pie-simple",
    family: "Pie",
    variant: "Simple",
    title: "Pie Chart",
    subtitle: "January - June 2024",
    separator: true,
  },
  {
    id: "chart-pie-legend",
    family: "Pie",
    variant: "Legend",
    title: "Pie Chart - Legend",
    subtitle: "January - June 2024",
    legend: true,
  },
  {
    id: "chart-pie-donut",
    family: "Pie",
    variant: "Donut",
    title: "Pie Chart - Donut",
    subtitle: "January - June 2024",
    donut: true,
  },
  {
    id: "chart-pie-donut-text",
    family: "Pie",
    variant: "Donut Text",
    title: "Pie Chart - Donut with Text",
    subtitle: "January - June 2024",
    donut: true,
    donutText: true,
  },
];

const RADAR: ChartPattern[] = [
  {
    id: "chart-radar-default",
    family: "Radar",
    variant: "Default",
    title: "Radar Chart",
    subtitle: "January - June 2024",
  },
  {
    id: "chart-radar-dots",
    family: "Radar",
    variant: "Dots",
    title: "Radar Chart - Dots",
    subtitle: "January - June 2024",
    dots: "default",
  },
  {
    id: "chart-radar-grid-circle",
    family: "Radar",
    variant: "Grid Circle",
    title: "Radar Chart - Grid Circle",
    subtitle: "January - June 2024",
    grid: "circle",
  },
  {
    id: "chart-radar-multiple",
    family: "Radar",
    variant: "Multiple",
    title: "Radar Chart - Multiple",
    subtitle: "January - June 2024",
    multiple: true,
    legend: true,
  },
];

const RADIAL: ChartPattern[] = [
  {
    id: "chart-radial-simple",
    family: "Radial",
    variant: "Simple",
    title: "Radial Chart",
    subtitle: "January - June 2024",
    series: 3,
  },
  {
    id: "chart-radial-text",
    family: "Radial",
    variant: "Text",
    title: "Radial Chart - Text",
    subtitle: "January - June 2024",
    series: 1,
    donutText: true,
  },
  {
    id: "chart-radial-stacked",
    family: "Radial",
    variant: "Stacked",
    title: "Radial Chart - Stacked",
    subtitle: "January - June 2024",
    series: 2,
    donutText: true,
    stacked: true,
  },
];

// The curated catalogue: ~4 visually-distinct patterns per family (the
// official shadcn/ui variants that read differently as a static Figma chart).
// Tooltip examples are not chart shapes, so they live in the Components-page
// Tooltip section instead of here.
export const CHART_PATTERNS: ChartPattern[] = [
  ...AREA,
  ...BAR,
  ...LINE,
  ...PIE,
  ...RADAR,
  ...RADIAL,
];

// Shared sample data (0–1 fractions of the plot height), reused across the
// cartesian families so a designer reads the same dataset at every variant.
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
export const SERIES_A = [0.45, 0.62, 0.5, 0.78, 0.66, 0.86];
export const SERIES_B = [0.3, 0.42, 0.36, 0.52, 0.46, 0.62];
export const SERIES_C = [0.2, 0.3, 0.26, 0.38, 0.32, 0.45];
// Bar/area absolute-ish labels matching the fractions above.
export const SERIES_A_LABELS = ["186", "305", "237", "373", "309", "414"];

// Pie / radial series: label + chart variable key. Five entries so a designer
// sees every `chart-*` colour in use.
export type SeriesItem = { label: string; key: string; value: number };
export const PIE_SERIES: SeriesItem[] = [
  { label: "Chrome", key: "chart-1", value: 0.34 },
  { label: "Safari", key: "chart-2", value: 0.24 },
  { label: "Firefox", key: "chart-3", value: 0.2 },
  { label: "Edge", key: "chart-4", value: 0.13 },
  { label: "Other", key: "chart-5", value: 0.09 },
];

// Radial track values (0–1), one per ring.
export const RADIAL_VALUES = [0.78, 0.62, 0.45];

// Radar axis values (0–1 fraction of the outer radius).
export const RADAR_AXES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
export const RADAR_A = [0.85, 0.6, 0.75, 0.55, 0.9, 0.65];
export const RADAR_B = [0.6, 0.8, 0.5, 0.7, 0.55, 0.78];
