/** A straight line y = slope · x + intercept. */
export interface Line {
  slope: number;
  intercept: number;
}

export interface Point {
  x: number;
  y: number;
}

/** A fitted model: its coefficients and how to evaluate it. */
export interface Fit {
  /** The coefficients a and b, as they appear in the fit's formula. */
  a: number;
  b: number;
  predict: (x: number) => number;
}

/** Ordinary least-squares line through the points. Needs at least two distinct x values. */
export function linearRegression(points: readonly Point[]): Line {
  const n = points.length;
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;
  let covariance = 0;
  let variance = 0;
  for (const { x, y } of points) {
    covariance += (x - meanX) * (y - meanY);
    variance += (x - meanX) ** 2;
  }
  const slope = covariance / variance;
  return { slope, intercept: meanY - slope * meanX };
}

/**
 * Power fit y = a · x^b, found by linear regression on log10(y) = log10(a) + b · log10(x).
 * x and y must be positive.
 */
export function powerFit(points: readonly Point[]): Fit {
  const line = linearRegression(points.map((p) => ({ x: Math.log10(p.x), y: Math.log10(p.y) })));
  const a = 10 ** line.intercept;
  const b = line.slope;
  return { a, b, predict: (x) => a * x ** b };
}

/** Logarithmic fit y = a · ln(x) + b, by linear regression on ln(x). x must be positive. */
export function logFit(points: readonly Point[]): Fit {
  const line = linearRegression(points.map((p) => ({ x: Math.log(p.x), y: p.y })));
  const a = line.slope;
  const b = line.intercept;
  return { a, b, predict: (x) => a * Math.log(x) + b };
}

/** Root-mean-square error of a model over the points. */
export function rmse(points: readonly Point[], predict: (x: number) => number): number {
  const squared = points.reduce((sum, { x, y }) => sum + (predict(x) - y) ** 2, 0);
  return Math.sqrt(squared / points.length);
}

const PERCENT = 100;

/**
 * Mean absolute percentage error: on average, how far off the model is as a share of the real
 * value. Unlike RMSE, big values don't dominate it. Real values (y) must be non-zero.
 */
export function meanPercentError(points: readonly Point[], predict: (x: number) => number): number {
  const total = points.reduce((sum, { x, y }) => sum + Math.abs(predict(x) - y) / Math.abs(y), 0);
  return (total / points.length) * PERCENT;
}
