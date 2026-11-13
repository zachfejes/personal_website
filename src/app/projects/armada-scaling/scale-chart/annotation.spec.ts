import { PlotBox, placeCallout, placeLabel, placeLabelClear } from './annotation';

// A 1000 × 500 plot; labels go 60 across and 40 down from their point.
const PLOT: PlotBox = { left: 0, right: 1000, top: 0, bottom: 500 };
const OFFSET = { dx: 60, dy: 40 };

describe('placeLabel', () => {
  it('labels a point below and to its right, text running right', () => {
    expect(placeLabel({ cx: 200, cy: 200 }, PLOT, OFFSET)).toEqual({
      x: 260,
      y: 240,
      anchor: 'start',
    });
  });

  it('labels a point near the right edge to its left, text running left', () => {
    // The right 30% of this plot starts at x = 700.
    expect(placeLabel({ cx: 900, cy: 100 }, PLOT, OFFSET)).toEqual({
      x: 840,
      y: 140,
      anchor: 'end',
    });
  });

  it('keeps a label near the bottom just inside the plot, not back up across the ships', () => {
    // 40 down from y = 480 would be 520, past the bottom (500): it sits 10 above the bottom instead.
    expect(placeLabel({ cx: 200, cy: 480 }, PLOT, OFFSET)).toEqual({
      x: 260,
      y: 490,
      anchor: 'start',
    });
  });

  it('labels a point to its left when its label would run past the right edge', () => {
    // From x = 500 the label would start at 560 and, 500 long, end at 1060: past the edge.
    const LONG_LABEL = 500;
    expect(placeLabel({ cx: 500, cy: 100 }, PLOT, OFFSET, LONG_LABEL)).toEqual({
      x: 440,
      y: 140,
      anchor: 'end',
    });
  });
});

describe('placeLabelClear', () => {
  // A label 100 wide and 10 tall, 8 from its leader, keeping 2 clear of anything.
  const BOX = { width: 100, height: 10, gap: 8, clearance: 2 };
  const POINT = { cx: 200, cy: 200 };

  it('goes where placeLabel puts it when nothing is in the way', () => {
    expect(placeLabelClear(POINT, PLOT, OFFSET, BOX, [])).toEqual(placeLabel(POINT, PLOT, OFFSET));
  });

  it('moves further down when its first spot covers something', () => {
    // The first spot's text runs from x 268 to 368 at y 240; a point at (300, 240) is under it.
    const IN_THE_WAY = [{ x: 300, y: 240 }];
    expect(placeLabelClear(POINT, PLOT, OFFSET, BOX, IN_THE_WAY)).toEqual({
      x: 260,
      y: 280,
      anchor: 'start',
    });
  });

  it('goes upward when every spot below is covered', () => {
    // A wall of points from x 0 to 1000 at every height below the point.
    const BELOW = Array.from({ length: 101 }, (_, i) => i * 10).flatMap((x) =>
      [240, 280, 320].map((y) => ({ x, y })),
    );
    expect(placeLabelClear(POINT, PLOT, OFFSET, BOX, BELOW)).toEqual({
      x: 260,
      y: 160,
      anchor: 'start',
    });
  });
});

describe('placeCallout', () => {
  // A name 60 wide and 10 tall, 8 from a point of radius 5, keeping 2 clear of anything.
  const BOX = { width: 60, height: 10, gap: 8, clearance: 2 };
  const POINT = { cx: 500, cy: 250, r: 5 };

  it('centres the name above the point when nothing is in the way', () => {
    expect(placeCallout(POINT, PLOT, BOX, [])).toEqual({ x: 500, y: 237, anchor: 'middle' });
  });

  it('ignores anything drawn on the point itself', () => {
    expect(placeCallout(POINT, PLOT, BOX, [{ x: 500, y: 250 }])).toEqual({
      x: 500,
      y: 237,
      anchor: 'middle',
    });
  });

  it('stays inside the plot when nowhere is clear', () => {
    // At the top right corner, with the plot filled with points: the centred name would run past
    // the right edge, so it goes above and to the left instead.
    const CORNER = { cx: 990, cy: 30, r: 5 };
    const EVERYWHERE = Array.from({ length: 51 }, (_, i) => i * 20).flatMap((x) =>
      Array.from({ length: 26 }, (_, j) => ({ x, y: j * 20 })),
    );
    expect(placeCallout(CORNER, PLOT, BOX, EVERYWHERE)).toEqual({ x: 985, y: 17, anchor: 'end' });
  });

  it('moves above and to the left when the spot straight above is taken', () => {
    // Something at (520, 232) sits in the centred name's box (470–530 across, 227–237 down).
    expect(placeCallout(POINT, PLOT, BOX, [{ x: 520, y: 232 }])).toEqual({
      x: 495,
      y: 237,
      anchor: 'end',
    });
  });
});
