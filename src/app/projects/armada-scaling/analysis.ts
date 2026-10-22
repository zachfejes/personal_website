import { PLANNED_SHIPS, SHIPS } from './ships';
import { Fit, Point, logFit, powerFit, rmse } from './regression';

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
    predictModelMm: power.predict,
  };
}

/** The analysis of the page's data (ships.json). */
export const ARMADA = analyzeScale(SHIPS);

export const POWER_FIT = ARMADA.power;
export const LOG_FIT = ARMADA.log;
export const POWER_RMSE = ARMADA.powerRmse;
export const LOG_RMSE = ARMADA.logRmse;
export const predictModelMm = ARMADA.predictModelMm;

/** The planned ships, sized by the power fit. */
export const PLANNED_POINTS = PLANNED_SHIPS.map((s) => ({
  name: s.name,
  x: s.canonM,
  y: predictModelMm(s.canonM),
}));
