/** The plotting area, in SVG units. */
export interface PlotBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Where an annotation's leader ends and which way its text runs from there. */
export interface LabelPlacement {
  x: number;
  y: number;
  anchor: 'start' | 'end';
}

/** Points in the last part of the plot (this fraction of its width) are labelled to their left. */
const RIGHT_SIDE = 0.3;

/**
 * Where to put a point's label: a leader out to one side and down, into the open space below and
 * right of the rising line of ships. Points near the right edge, or whose label (`textWidth` long)
 * wouldn't fit to their right, are labelled to their left; points too near the bottom are labelled
 * upward, so labels stay inside the plot.
 */
export function placeLabel(
  point: { cx: number; cy: number },
  plot: PlotBox,
  offset: { dx: number; dy: number },
  textWidth = 0,
): LabelPlacement {
  const nearRight = point.cx > plot.right - (plot.right - plot.left) * RIGHT_SIDE;
  const overflows = point.cx + offset.dx + textWidth > plot.right;
  const toLeft = nearRight || overflows;
  const up = point.cy + offset.dy > plot.bottom;
  return {
    x: point.cx + (toLeft ? -offset.dx : offset.dx),
    y: point.cy + (up ? -offset.dy : offset.dy),
    anchor: toLeft ? 'end' : 'start',
  };
}
