import { PLANNED_SHIPS, SHIPS } from './ships';
import {
  Predict,
  bandRatios,
  curvedPowerFit,
  leaveOneOut,
  scoreCandidates,
  splitPowerFit,
} from './candidates';
import {
  Fit,
  Point,
  linearRegression,
  logFit,
  meanPercentError,
  powerFit,
  rmse,
} from './regression';

/** What the analysis needs from a ship: canon length (m) and measured model length (mm). */
export interface Measured {
  canonM: number;
  modelMm: number;
}

export interface ScaleAnalysis {
  power: Fit;
  log: Fit;
  powerRmse: number;
  logRmse: number;
  /** Mean absolute percentage error of each fit, %. */
  powerPercentError: number;
  logPercentError: number;
  /** Model size for any canon length, from the power fit. */
  predictModelMm: (canonM: number) => number;
}

/** Fits both candidate functions to the ships and measures how well each does. */
export function analyzeScale(ships: readonly Measured[]): ScaleAnalysis {
  const points: Point[] = ships.map((s) => ({ x: s.canonM, y: s.modelMm }));
  const power = powerFit(points);
  const log = logFit(points);
  return {
    power,
    log,
    powerRmse: rmse(points, power.predict),
    logRmse: rmse(points, log.predict),
    powerPercentError: meanPercentError(points, power.predict),
    logPercentError: meanPercentError(points, log.predict),
    predictModelMm: power.predict,
  };
}

/**
 * Where a logarithmic fit y = a·ln(x) + b crosses zero: below this canon length it predicts a
 * model of negative length. Null if it never does (a fit that doesn't rise with x).
 */
export function logFitZeroM(fit: Fit): number | null {
  return fit.a > 0 ? Math.exp(-fit.b / fit.a) : null;
}

/**
 * The measured ships whose models are nearest in size to `modelMm`: the largest one smaller and
 * the smallest one larger. Either is null when nothing lies on that side.
 */
export function modelNeighbors<T extends Measured>(
  ships: readonly T[],
  modelMm: number,
): { below: T | null; above: T | null } {
  let below: T | null = null;
  let above: T | null = null;
  for (const ship of ships) {
    if (ship.modelMm < modelMm && (!below || ship.modelMm > below.modelMm)) below = ship;
    if (ship.modelMm > modelMm && (!above || ship.modelMm < above.modelMm)) above = ship;
  }
  return { below, above };
}

/** Canon lengths are in metres and model lengths in millimetres. */
const MM_PER_M = 1000;

/**
 * How many times smaller the model is than the ship it stands for: canon length ÷ model length,
 * both in the same unit, rounded to `significantDigits` (scales are approximate).
 */
export function scaleRatio(canonM: number, modelMm: number, significantDigits: number): number {
  return Number(((canonM * MM_PER_M) / modelMm).toPrecision(significantDigits));
}

/** The measured ship closest in canon length to `canonM`, by ratio rather than difference. */
export function nearestByCanon<T extends Measured>(ships: readonly T[], canonM: number): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const ship of ships) {
    const distance = Math.abs(Math.log(ship.canonM / canonM));
    if (distance < bestDistance) {
      best = ship;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * How far ships typically sit from a fit, by size: a straight-line trend of each ship's miss,
 * |actual ÷ predicted − 1|, against the log of its canon length. `at(x)` gives the typical miss
 * (a fraction) for a ship of canon length x.
 */
export function missTrend(
  points: readonly Point[],
  predict: (x: number) => number,
): { intercept: number; slope: number; at: (x: number) => number } {
  const line = linearRegression(
    points.map((p) => ({ x: Math.log10(p.x), y: Math.abs(p.y / predict(p.x) - 1) })),
  );
  return {
    intercept: line.intercept,
    slope: line.slope,
    at: (x) => line.intercept + line.slope * Math.log10(x),
  };
}

/** The analysis of the page's data (ships.json). */
export const ARMADA = analyzeScale(SHIPS);

export const POWER_FIT = ARMADA.power;
export const LOG_FIT = ARMADA.log;
export const POWER_RMSE = ARMADA.powerRmse;
export const LOG_RMSE = ARMADA.logRmse;
export const POWER_PERCENT_ERROR = ARMADA.powerPercentError;
export const LOG_PERCENT_ERROR = ARMADA.logPercentError;
export const predictModelMm = ARMADA.predictModelMm;

/** The planned ships, sized by the power fit. */
export const PLANNED_POINTS = PLANNED_SHIPS.map((s) => ({
  name: s.name,
  x: s.canonM,
  y: predictModelMm(s.canonM),
}));

/** The page's data as points: canon length (m) against model length (mm). */
export const SHIP_POINTS: readonly Point[] = SHIPS.map((s) => ({ x: s.canonM, y: s.modelMm }));

/** Every candidate form, fitted to the page's data and scored. */
export const CANDIDATE_SCORES = scoreCandidates(SHIP_POINTS);

/**
 * How much the power law's exponent drifts with size: c in a·x^(b + c·ln x). Zero means a plain
 * power law; the exponent changes by c for each factor of e in length.
 */
export const POWER_CURVATURE = curvedPowerFit(SHIP_POINTS).curvature;

/** Small, medium and large ships: does the power fit lean one way at any size? */
const SIZE_BAND_COUNT = 3;
export const POWER_SIZE_BANDS = bandRatios(SHIP_POINTS, POWER_FIT.predict, SIZE_BAND_COUNT);

/** Each ship's model length as a multiple of what the power fit predicts. */
export const POWER_RESIDUALS = SHIPS.map((s) => ({
  name: s.name,
  x: s.canonM,
  y: s.modelMm / predictModelMm(s.canonM),
}));

/**
 * Separate power laws for small and large ships (squadrons sit at the small end), split at
 * whichever ship length fits best, with at least this many ships on each side.
 */
const MIN_SPLIT_SIDE = 3;
const splitAtBest = (points: readonly Point[]) =>
  splitPowerFit(points, [...new Set(points.map((p) => p.x))], MIN_SPLIT_SIDE);
const split = splitAtBest(SHIP_POINTS);
export const SPLIT_POWER = split && {
  ...split,
  inSample: meanPercentError(SHIP_POINTS, split.predict),
  leaveOneOut: leaveOneOut(SHIP_POINTS, (points): Predict => {
    const fit = splitAtBest(points);
    if (!fit) throw new Error('splitAtBest: too few points to split');
    return fit.predict;
  }),
};
