import data from './ships.json';

/** A ship with its length in canon and its model's measured length in Star Wars: Armada. */
export interface Ship {
  name: string;
  /** Canon length, m. */
  canonM: number;
  /** Armada model length, mm. */
  modelMm: number;
}

/** A ship I'd like to model: canon length only; its model size comes from the fit. */
export interface PlannedShip {
  name: string;
  canonM: number;
}

/**
 * The data lives in ships.json (sources noted there); add or correct ships there and every fit,
 * number, equation and chart on the page follows on the next build.
 */
export const SHIPS: readonly Ship[] = data.ships;

/** Ships I'd like to design, sized by the power fit. */
export const PLANNED_SHIPS: readonly PlannedShip[] = data.planned;

/** The station that started it all: the planned ship named as `station` in the data. */
export const XQ2: PlannedShip = stationFrom(data.planned, data.station);

function stationFrom(planned: readonly PlannedShip[], name: string): PlannedShip {
  const station = planned.find((s) => s.name === name);
  if (!station) throw new Error(`ships.json: station "${name}" isn't in the planned ships`);
  return station;
}
