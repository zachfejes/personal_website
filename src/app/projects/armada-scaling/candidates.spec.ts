import {
  CANDIDATES,
  Candidate,
  bandRatios,
  curvedPowerFit,
  leastSquares,
  leaveOneOut,
  scanFit,
  scoreCandidates,
  splitPowerFit,
} from './candidates';
import { Point } from './regression';

/** Exact data has an exact fit, up to floating-point rounding. */
const DIGITS = 6;

const XS = [1, 2, 4, 8, 16, 32, 64];
const sample = (f: (x: number) => number, xs: readonly number[] = XS): Point[] =>
  xs.map((x) => ({ x, y: f(x) }));

describe('leastSquares', () => {
  it('recovers the coefficients of points on a quadratic', () => {
    const COEFFICIENTS = [2, -3, 0.5];
    const rows = XS.map((x) => [1, x, x ** 2]);
    const targets = rows.map((r) => r.reduce((s, v, i) => s + v * COEFFICIENTS[i], 0));
    const p = leastSquares(rows, targets);
    COEFFICIENTS.forEach((c, i) => expect(p[i]).toBeCloseTo(c, DIGITS));
  });
});

describe('scanFit', () => {
  it('picks the grid value and scale that reproduce the data', () => {
    const A = 5;
    const K = 2;
    const GRID = [1, K, 3];
    const predict = scanFit(
      sample((x) => A * x ** K),
      GRID,
      (x, k) => x ** k,
    );
    const X = 3;
    expect(predict(X)).toBeCloseTo(A * X ** K, DIGITS);
  });

  it('refuses a grid where the shape is never positive', () => {
    expect(() =>
      scanFit(
        sample((x) => x),
        [1],
        () => 0,
      ),
    ).toThrow();
  });
});

describe('leaveOneOut', () => {
  /**
   * A worked example: a "fit" that predicts the mean of what it was given. Leaving out 1
   * predicts 2.5 (150% off), leaving out 2 predicts 2 (exact), leaving out 3 predicts 1.5
   * (50% off): 200% / 3 on average. The points share an x, as several ships share a length.
   */
  const SHARED_X = 10;
  const POINTS = [1, 2, 3].map((y) => ({ x: SHARED_X, y }));
  const MEAN_PERCENT_ERROR = 200 / 3;
  const mean = (points: readonly Point[]) => () =>
    points.reduce((s, p) => s + p.y, 0) / points.length;

  it('scores each point by a fit made without it (worked example)', () => {
    expect(leaveOneOut(POINTS, mean)).toBeCloseTo(MEAN_PERCENT_ERROR, DIGITS);
  });
});

describe('CANDIDATES', () => {
  /** Data on each candidate's own form, with parameters it can reach exactly. */
  const SINE_STEPS_OF_GRID = 0.5;
  const ON_FORM: Record<string, (x: number) => number> = {
    power: (x) => 3 * x ** 0.5,
    log: (x) => 4 * Math.log(x) + 10,
    sine: (x) => 7 * Math.sin(((Math.PI / 2) * SINE_STEPS_OF_GRID * x) / Math.max(...XS)),
    // c is the first value scanned (0.1 and 1), which the grid holds exactly.
    'shifted-log': (x) => 6 * Math.log1p(x / 0.1),
    saturating: (x) => (9 * x) / (1 + x),
    quadratic: (x) => 1 + 2 * x + 0.5 * x ** 2,
    cubic: (x) => 1 + 2 * x + 0.5 * x ** 2 + 0.01 * x ** 3,
    'curved-power': (x) => 2 * Math.exp(0.6 * Math.log(x) - 0.02 * Math.log(x) ** 2),
  };

  it('has a known-answer case for every candidate', () => {
    expect(CANDIDATES.map((c) => c.id).sort()).toEqual(Object.keys(ON_FORM).sort());
  });

  for (const candidate of CANDIDATES) {
    it(`${candidate.id} fits data on its own form exactly`, () => {
      const f = ON_FORM[candidate.id];
      const predict = candidate.fit(sample(f));
      const X = 10;
      expect(predict(X) / f(X)).toBeCloseTo(1, DIGITS);
    });
  }
});

describe('scoreCandidates', () => {
  it('reports no error for a candidate on its own form', () => {
    const [score] = scoreCandidates(
      sample((x) => 2 * x ** 0.7),
      CANDIDATES.filter((c) => c.id === 'power'),
    );
    expect(score.inSample).toBeCloseTo(0, DIGITS);
    expect(score.leaveOneOut).toBeCloseTo(0, DIGITS);
    expect(score.impossible).toBe(0);
  });

  it('counts the points given a length of zero or less', () => {
    const THRESHOLD = 4;
    const shifted: Candidate = {
      id: 'shifted',
      name: 'Shifted',
      formula: 'x - c',
      parameters: 0,
      fit: () => (x) => x - THRESHOLD,
    };
    const [score] = scoreCandidates(
      sample((x) => x),
      [shifted],
    );
    expect(score.impossible).toBe(XS.filter((x) => x <= THRESHOLD).length);
  });
});

describe('curvedPowerFit', () => {
  it('recovers the bend in a power law', () => {
    const CURVATURE = -0.03;
    const fit = curvedPowerFit(
      sample((x) => Math.exp(1 + 0.5 * Math.log(x) + CURVATURE * Math.log(x) ** 2)),
    );
    expect(fit.curvature).toBeCloseTo(CURVATURE, DIGITS);
  });

  it('finds no bend in a plain power law', () => {
    expect(curvedPowerFit(sample((x) => 3 * x ** 0.5)).curvature).toBeCloseTo(0, DIGITS);
  });
});

describe('bandRatios', () => {
  const BANDS = 2;

  it('gives a ratio of 1 in every band for an exact prediction', () => {
    const f = (x: number) => 3 * x;
    for (const band of bandRatios(sample(f), f, BANDS)) expect(band.ratio).toBeCloseTo(1, DIGITS);
  });

  it('shows a band the prediction undershoots', () => {
    const FACTOR = 2;
    const SPLIT = 8;
    const real = (x: number) => (x > SPLIT ? FACTOR * x : x);
    const XS_EVEN = [1, 2, 4, 8, 16, 32, 64, 128];
    const [low, high] = bandRatios(sample(real, XS_EVEN), (x) => x, BANDS);
    expect(low).toEqual({ fromX: 1, toX: SPLIT, ratio: 1 });
    expect(high.fromX).toBeGreaterThan(SPLIT);
    expect(high.ratio).toBeCloseTo(FACTOR, DIGITS);
  });
});

describe('splitPowerFit', () => {
  const BREAK = 10;
  const BELOW = 0.5;
  const ABOVE = 0.8;
  const real = (x: number) => (x < BREAK ? x ** BELOW : 2 * x ** ABOVE);
  const XS_WIDE = [1, 2, 3, 5, 7, 10, 20, 40, 80, 160];
  const MIN_SIDE = 3;

  it('finds the break and the exponent on each side', () => {
    const split = splitPowerFit(sample(real, XS_WIDE), [4, BREAK, 30], MIN_SIDE);
    expect(split).not.toBeNull();
    expect(split?.breakX).toBe(BREAK);
    expect(split?.below).toBeCloseTo(BELOW, DIGITS);
    expect(split?.above).toBeCloseTo(ABOVE, DIGITS);
  });

  it('gives up when no break leaves enough points on both sides', () => {
    expect(splitPowerFit(sample(real, XS_WIDE), [2], MIN_SIDE)).toBeNull();
  });
});
