import { PlotBox, placeLabel } from './annotation';

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

  it('labels a point near the bottom upward, so the label stays in the plot', () => {
    expect(placeLabel({ cx: 200, cy: 480 }, PLOT, OFFSET)).toEqual({
      x: 260,
      y: 440,
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
