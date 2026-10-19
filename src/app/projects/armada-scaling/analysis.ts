import { PLANNED_SHIPS, SHIPS } from './ships';
import { Point, logFit, powerFit, rmse } from './regression';

/** Canon length (m) against model length (mm), one point per ship. */
export const SHIP_POINTS: readonly Point[] = SHIPS.map((s) => ({ x: s.canonM, y: s.modelMm }));

export const POWER_FIT = powerFit(SHIP_POINTS);
export const LOG_FIT = logFit(SHIP_POINTS);

export const POWER_RMSE = rmse(SHIP_POINTS, POWER_FIT.predict);
export const LOG_RMSE = rmse(SHIP_POINTS, LOG_FIT.predict);

/** Model size for any canon length, from the power fit (the better of the two). */
export const predictModelMm = (canonM: number): number => POWER_FIT.predict(canonM);

/** The planned ships, sized by the power fit. */
export const PLANNED_POINTS = PLANNED_SHIPS.map((s) => ({
  name: s.name,
  x: s.canonM,
  y: predictModelMm(s.canonM),
}));
