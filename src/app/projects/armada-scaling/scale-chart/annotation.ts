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
/** A label kept off the bottom edge sits this far above it, so its text clears the axis. */
const BOTTOM_GAP = 10;

/**
 * Where to put a point's label: a leader out to one side and down, into the open space below and
 * right of the rising line of ships. Points near the right edge, or whose label (`textWidth` long)
 * wouldn't fit to their right, are labelled to their left. Near the bottom the label runs out low
 * along the axis, just inside the plot, rather than back up across the line of ships.
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
  return {
    x: point.cx + (toLeft ? -offset.dx : offset.dx),
    y: Math.min(point.cy + offset.dy, plot.bottom - BOTTOM_GAP),
    anchor: toLeft ? 'end' : 'start',
  };
}

/** Something a label shouldn't cover: a plotted point, or a sample along a curve or band edge. */
export interface Obstacle {
  x: number;
  y: number;
}

/** The label's text box: its size, its gap from the leader's end, and the clearance it keeps. */
export interface LabelBox {
  width: number;
  height: number;
  gap: number;
  clearance: number;
}

/** How far down (then up) a label may move to find clear space, in multiples of the offset. */
const REACH = [1, 2, 3] as const;

/**
 * Like `placeLabel`, but moved out of the way when its text would cover a point, a curve or a band
 * edge: further down, then to the other side, then upward, keeping inside the plot. If nowhere is
 * clear, the label goes where `placeLabel` puts it.
 */
export function placeLabelClear(
  point: { cx: number; cy: number },
  plot: PlotBox,
  offset: { dx: number; dy: number },
  box: LabelBox,
  obstacles: readonly Obstacle[],
): LabelPlacement {
  const preferred = placeLabel(point, plot, offset, box.width);
  const sides =
    preferred.anchor === 'start' ? (['start', 'end'] as const) : (['end', 'start'] as const);
  const half = box.height / 2;
  const candidates = [1, -1].flatMap((direction) =>
    sides.flatMap((anchor) =>
      REACH.map((reach): LabelPlacement => {
        const y = point.cy + direction * reach * offset.dy;
        return {
          x: point.cx + (anchor === 'start' ? offset.dx : -offset.dx),
          y: Math.max(plot.top + half, Math.min(y, plot.bottom - BOTTOM_GAP)),
          anchor,
        };
      }),
    ),
  );
  const clear = candidates.find((c) => {
    const left = c.anchor === 'start' ? c.x + box.gap : c.x - box.gap - box.width;
    const right = left + box.width;
    if (left < plot.left || right > plot.right) return false;
    return obstacles.every(
      (o) =>
        o.x < left - box.clearance ||
        o.x > right + box.clearance ||
        o.y < c.y - half - box.clearance ||
        o.y > c.y + half + box.clearance,
    );
  });
  return clear ?? preferred;
}
