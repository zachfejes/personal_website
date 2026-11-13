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
    const area = { left, right: left + box.width, top: c.y - half, bottom: c.y + half };
    return isClear(area, plot, obstacles, box.clearance);
  });
  return clear ?? preferred;
}

/** Whether a text box sits inside the plot with nothing within `clearance` of it. */
export function isClear(
  area: PlotBox,
  plot: PlotBox,
  obstacles: readonly Obstacle[],
  clearance: number,
): boolean {
  const inside =
    area.left >= plot.left &&
    area.right <= plot.right &&
    area.top >= plot.top &&
    area.bottom <= plot.bottom;
  return (
    inside &&
    obstacles.every(
      (o) =>
        o.x < area.left - clearance ||
        o.x > area.right + clearance ||
        o.y < area.top - clearance ||
        o.y > area.bottom + clearance,
    )
  );
}

/** Where a point's own name goes (no leader): `y` is the text's baseline. */
export interface CalloutPlacement {
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
}

/**
 * Where to write a highlighted point's name, right beside it: above it, then above to the left or
 * right, then below, then level with it, taking the first spot whose text covers nothing. Anything
 * at the point itself (the point, or another drawn on the same spot) doesn't count. If nowhere is
 * clear, the name takes the first of those spots that at least stays inside the plot.
 */
export function placeCallout(
  point: { cx: number; cy: number; r: number },
  plot: PlotBox,
  box: LabelBox,
  obstacles: readonly Obstacle[],
): CalloutPlacement {
  const { cx, cy, r } = point;
  const above = cy - r - box.gap;
  const below = cy + r + box.gap + box.height;
  const level = cy + box.height / 2;
  const candidates: CalloutPlacement[] = [
    { x: cx, y: above, anchor: 'middle' },
    { x: cx - r, y: above, anchor: 'end' },
    { x: cx + r, y: above, anchor: 'start' },
    { x: cx, y: below, anchor: 'middle' },
    { x: cx - r, y: below, anchor: 'end' },
    { x: cx + r, y: below, anchor: 'start' },
    { x: cx - r - box.gap, y: level, anchor: 'end' },
    { x: cx + r + box.gap, y: level, anchor: 'start' },
  ];
  const others = obstacles.filter((o) => Math.hypot(o.x - cx, o.y - cy) > r + box.clearance);
  const areaOf = (c: CalloutPlacement) => {
    const left =
      c.anchor === 'start' ? c.x : c.anchor === 'end' ? c.x - box.width : c.x - box.width / 2;
    return { left, right: left + box.width, top: c.y - box.height, bottom: c.y };
  };
  return (
    candidates.find((c) => isClear(areaOf(c), plot, others, box.clearance)) ??
    candidates.find((c) => isClear(areaOf(c), plot, [], 0)) ??
    candidates[0]
  );
}
