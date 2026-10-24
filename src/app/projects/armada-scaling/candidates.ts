import { Point, logFit, meanPercentError, powerFit } from './regression';

export type Predict = (x: number) => number;

/** A candidate shape for the scale: how to fit it to points, and how to describe it. */
export interface Candidate {
  id: string;
  name: string;
  /** TeX for the general form. */
  formula: string;
  /** Free parameters fitted to the data. */
  parameters: number;
  fit: (points: readonly Point[]) => Predict;
}

/** How well one candidate does. */
export interface CandidateScore {
  candidate: Candidate;
  /** Mean absolute % error on the data it was fitted to. */
  inSample: number;
  /** Mean absolute % error predicting each ship from a fit made without it. */
  leaveOneOut: number;
  /** Ships the fit gives a model length of zero or less. */
  impossible: number;
}

/**
 * Least-squares solution of rows · p ≈ targets, via the normal equations and Gaussian
 * elimination with partial pivoting. Fine for the few, well-scaled parameters used here.
 */
export function leastSquares(rows: readonly number[][], targets: readonly number[]): number[] {
  const size = rows[0].length;
  // Normal equations (AᵀA) p = Aᵀb, as an augmented matrix.
  const m = Array.from({ length: size }, (_, i) => [
    ...Array.from({ length: size }, (_, j) => rows.reduce((s, r) => s + r[i] * r[j], 0)),
    rows.reduce((s, r, k) => s + r[i] * targets[k], 0),
  ]);
  for (let col = 0; col < size; col++) {
    let pivot = col;
    for (let r = col + 1; r < size; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = col + 1; r < size; r++) {
      const factor = m[r][col] / m[col][col];
      for (let c = col; c <= size; c++) m[r][c] -= factor * m[col][c];
    }
  }
  const p = new Array<number>(size).fill(0);
  for (let r = size - 1; r >= 0; r--) {
    let sum = m[r][size];
    for (let c = r + 1; c < size; c++) sum -= m[r][c] * p[c];
    p[r] = sum / m[r][r];
  }
  return p;
}

/**
 * Fits y = A · shape(x, k) for the k in `grid` with the smallest error in log space (relative
 * error); A is then the geometric-mean ratio of y to shape. Values of k where the shape isn't
 * positive at every x are skipped.
 */
export function scanFit(
  points: readonly Point[],
  grid: readonly number[],
  shape: (x: number, k: number) => number,
): Predict {
  let best: { error: number; k: number; logA: number } | null = null;
  for (const k of grid) {
    const logShape = points.map((p) => Math.log(shape(p.x, k)));
    if (logShape.some((v) => !Number.isFinite(v))) continue;
    const logA = points.reduce((s, p, i) => s + Math.log(p.y) - logShape[i], 0) / points.length;
    const error = points.reduce((s, p, i) => s + (Math.log(p.y) - logA - logShape[i]) ** 2, 0);
    if (!best || error < best.error) best = { error, k, logA };
  }
  if (!best) throw new Error('scanFit: no grid value gives a positive shape');
  const { k, logA } = best;
  return (x) => Math.exp(logA) * shape(x, k);
}

/** Mean absolute % error predicting each point from a fit made on all the others. */
export function leaveOneOut(
  points: readonly Point[],
  fit: (points: readonly Point[]) => Predict,
): number {
  const predictions = points.map((p, i) => fit(points.filter((_, j) => j !== i))(p.x));
  // Look predictions up by position: several ships share a length.
  const byIndex = points.map((p, i) => ({ x: i, y: p.y }));
  return meanPercentError(byIndex, (i) => predictions[i]);
}

const GRID_SIZE = 200;
const geometric = (from: number, to: number) =>
  Array.from({ length: GRID_SIZE }, (_, i) => from * (to / from) ** (i / (GRID_SIZE - 1)));
const QUARTER_TURN = Math.PI / 2;
/** Ranges scanned for each form's shape parameter, wide enough to contain any sensible fit. */
const SCAN = {
  shiftedLogC: { from: 0.1, to: 1e5 },
  saturatingK: { from: 1, to: 1e7 },
} as const;
/** Lengths for polynomials are divided by the largest one, so powers of x stay well scaled. */
const maxX = (points: readonly Point[]) => Math.max(...points.map((p) => p.x));

/** Polynomial in x of the given degree, fitted to minimize relative error. */
function polynomial(degree: number): Candidate['fit'] {
  return (points) => {
    const scale = maxX(points);
    const powers = (x: number) => Array.from({ length: degree + 1 }, (_, d) => (x / scale) ** d);
    // Dividing each row by y turns absolute error into relative error.
    const p = leastSquares(
      points.map((pt) => powers(pt.x).map((v) => v / pt.y)),
      points.map(() => 1),
    );
    return (x) => powers(x).reduce((s, v, d) => s + v * p[d], 0);
  };
}

/** Fits log y = c0 + c1·ln x + c2·(ln x)²: a power law whose exponent may drift with size. */
export function curvedPowerFit(points: readonly Point[]): { predict: Predict; curvature: number } {
  const [c0, c1, c2] = leastSquares(
    points.map((p) => [1, Math.log(p.x), Math.log(p.x) ** 2]),
    points.map((p) => Math.log(p.y)),
  );
  return { predict: (x) => Math.exp(c0 + c1 * Math.log(x) + c2 * Math.log(x) ** 2), curvature: c2 };
}

export const CANDIDATES: readonly Candidate[] = [
  {
    id: 'power',
    name: 'Power law',
    formula: 'a x^{b}',
    parameters: 2,
    fit: (points) => powerFit(points).predict,
  },
  {
    id: 'log',
    name: 'Logarithmic',
    formula: 'a \\ln(x) + b',
    parameters: 2,
    fit: (points) => logFit(points).predict,
  },
  {
    id: 'sine',
    name: 'Quarter sine wave',
    formula: 'a \\sin(kx)',
    parameters: 2,
    // Every ship must sit within the first quarter wave, so k ≤ (π/2) / longest ship.
    fit: (points) => {
      const kMax = QUARTER_TURN / maxX(points);
      const grid = Array.from({ length: GRID_SIZE }, (_, i) => (kMax * (i + 1)) / GRID_SIZE);
      return scanFit(points, grid, (x, k) => Math.sin(k * x));
    },
  },
  {
    id: 'shifted-log',
    name: 'Logarithm through zero',
    formula: 'a \\ln(1 + x / c)',
    parameters: 2,
    fit: (points) =>
      scanFit(points, geometric(SCAN.shiftedLogC.from, SCAN.shiftedLogC.to), (x, c) =>
        Math.log1p(x / c),
      ),
  },
  {
    id: 'saturating',
    name: 'Levelling off',
    formula: 'a x / (c + x)',
    parameters: 2,
    fit: (points) =>
      scanFit(points, geometric(SCAN.saturatingK.from, SCAN.saturatingK.to), (x, c) => x / (c + x)),
  },
  {
    id: 'quadratic',
    name: 'Quadratic',
    formula: 'a + bx + cx^2',
    parameters: 3,
    fit: polynomial(2),
  },
  {
    id: 'cubic',
    name: 'Cubic',
    formula: 'a + bx + cx^2 + dx^3',
    parameters: 4,
    fit: polynomial(3),
  },
  {
    id: 'curved-power',
    name: 'Power law with a bend',
    formula: 'a x^{\\,b + c \\ln x}',
    parameters: 3,
    fit: (points) => curvedPowerFit(points).predict,
  },
];

/** Fits and scores every candidate on the same points. */
export function scoreCandidates(
  points: readonly Point[],
  candidates: readonly Candidate[] = CANDIDATES,
): CandidateScore[] {
  return candidates.map((candidate) => {
    const predict = candidate.fit(points);
    return {
      candidate,
      inSample: meanPercentError(points, predict),
      leaveOneOut: leaveOneOut(points, candidate.fit),
      impossible: points.filter((p) => !(predict(p.x) > 0)).length,
    };
  });
}

/**
 * Splits points into `count` size bands (by x, equal numbers of points) and gives each band's
 * typical ratio of real to predicted value (geometric mean): 1 means no bias at that size.
 */
export function bandRatios(
  points: readonly Point[],
  predict: Predict,
  count: number,
): { fromX: number; toX: number; ratio: number }[] {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  return Array.from({ length: count }, (_, i) => {
    const band = sorted.slice(
      Math.round((i * sorted.length) / count),
      Math.round(((i + 1) * sorted.length) / count),
    );
    const logRatio = band.reduce((s, p) => s + Math.log(p.y / predict(p.x)), 0) / band.length;
    return { fromX: band[0].x, toX: band[band.length - 1].x, ratio: Math.exp(logRatio) };
  });
}

/**
 * Separate power laws below and above a break length, with the break chosen to minimize
 * relative error. Each side needs at least `minSide` points.
 */
export function splitPowerFit(
  points: readonly Point[],
  breaks: readonly number[],
  minSide: number,
): { breakX: number; below: number; above: number; predict: Predict } | null {
  let best: {
    error: number;
    breakX: number;
    low: Predict;
    high: Predict;
    below: number;
    above: number;
  } | null = null;
  for (const breakX of breaks) {
    const lowPoints = points.filter((p) => p.x < breakX);
    const highPoints = points.filter((p) => p.x >= breakX);
    if (lowPoints.length < minSide || highPoints.length < minSide) continue;
    const low = powerFit(lowPoints);
    const high = powerFit(highPoints);
    const predict = (x: number) => (x < breakX ? low.predict(x) : high.predict(x));
    const error = points.reduce((s, p) => s + Math.log(p.y / predict(p.x)) ** 2, 0);
    if (!best || error < best.error) {
      best = { error, breakX, low: low.predict, high: high.predict, below: low.b, above: high.b };
    }
  }
  if (!best) return null;
  const { breakX, low, high, below, above } = best;
  return { breakX, below, above, predict: (x) => (x < breakX ? low(x) : high(x)) };
}
