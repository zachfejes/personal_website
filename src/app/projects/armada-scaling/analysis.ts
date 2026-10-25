import { PLANNED_SHIPS, SHIPS } from './ships';
import {
  Predict,
  bandRatios,
  curvedPowerFit,
  leaveOneOut,
  scoreCandidates,
  splitPowerFit,
} from './candidates';
import { Fit, Point, logFit, meanPercentError, powerFit, rmse } from './regression';

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
