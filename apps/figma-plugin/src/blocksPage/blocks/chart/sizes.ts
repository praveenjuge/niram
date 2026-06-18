// Chart block sizing. The Chart set ships a single size rather than a `Size`
// variant: a designer resizes the instance in Figma instead. The card is built
// to flow on resize — the header, month axis, and legend are auto-layout with
// FILL/SPACE_BETWEEN/WRAP so they reflow with the width, and the plot frame
// fills the card and clips. (The drawn plot geometry — bars, SVG curves, pie
// arcs — is fixed vector content and doesn't redraw on resize; the container
// around it is what flexes.)

export type ChartConfig = {
  // Default card width (the component's intrinsic width before resize).
  cardWidth: number;
  // Plot drawing height (the bars/lines/arcs region, excluding header/legend).
  plotHeight: number;
  // Card padding (also the gutter the plot width is inset by).
  pad: number;
  // Inner vertical gap between header, plot, and legend.
  gap: number;
  // Title / supporting-copy / axis-label font sizes.
  titleSize: number;
  subtitleSize: number;
  labelSize: number;
};

export const CHART_CONFIG: ChartConfig = {
  cardWidth: 360,
  plotHeight: 200,
  pad: 20,
  gap: 14,
  titleSize: 16,
  subtitleSize: 12,
  labelSize: 12,
};

// Plot drawing width: the card width minus the padding gutters on each side.
export function plotWidth(config: ChartConfig): number {
  return config.cardWidth - config.pad * 2;
}
