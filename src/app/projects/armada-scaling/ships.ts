import data from './ships.json';

export const FACTIONS = [
  'Rebel Alliance',
  'Galactic Empire',
  'Galactic Republic',
  'Separatist Alliance (CIS)',
] as const;
export type Faction = (typeof FACTIONS)[number];

export const ERAS = ['Galactic Civil War Era', 'Clone Wars Era'] as const;
export type Era = (typeof ERAS)[number];

/** Where a number came from, listed once in ships.json and referred to by id. */
export interface Source {
  title: string;
  url?: string;
}

/** What every ship records, measured or planned. */
interface ShipBase {
  name: string;
  /** Canon length, m. */
  canonM: number;
  faction: Faction;
  era: Era;
  canonSource: Source;
  /** When the numbers were collected, `YYYY-MM-DD`. */
  dateSourced: string;
}

/** A ship with its model's measured length in Star Wars: Armada. */
export interface Ship extends ShipBase {
  /** Armada model length, mm. */
  modelMm: number;
  measurementSource: Source;
}

/** A ship I'd like to model: canon length only; its model size comes from the fit. */
export type PlannedShip = ShipBase;

/** A ship as written in ships.json: sources by id, faction and era as plain strings. */
interface RawShip {
  name: string;
  canonM: number;
  faction: string;
  era: string;
  canonSource: string;
  dateSourced: string;
}

interface RawMeasuredShip extends RawShip {
  modelMm: number;
  measurementSource: string;
}

/** ships.json as written, before checking. */
export interface RawShipData {
  sources: Record<string, Source>;
  /** Name of the planned ship the page is about. */
  station: string;
  ships: RawMeasuredShip[];
  planned: RawShip[];
}

export interface ShipData {
  ships: Ship[];
  planned: PlannedShip[];
  station: PlannedShip;
  /** Every source the measured ships' numbers came from, once each, in first-use order. */
  measurementSources: Source[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Checks the hand-edited data and resolves source ids. Anything wrong (an unknown faction, era or
 * source, a malformed date, a missing station) stops the build with a message naming the ship.
 */
export function parseShipData(raw: RawShipData): ShipData {
  const { sources } = raw;
  const fail = (name: string, problem: string): never => {
    throw new Error(`ships.json: ${name}: ${problem}`);
  };
  const source = (name: string, id: string) => sources[id] ?? fail(name, `unknown source "${id}"`);
  const base = (s: RawShip): ShipBase => ({
    name: s.name,
    canonM: s.canonM,
    faction: oneOf(FACTIONS, s.faction) ?? fail(s.name, `unknown faction "${s.faction}"`),
    era: oneOf(ERAS, s.era) ?? fail(s.name, `unknown era "${s.era}"`),
    canonSource: source(s.name, s.canonSource),
    dateSourced: ISO_DATE.test(s.dateSourced)
      ? s.dateSourced
      : fail(s.name, `date "${s.dateSourced}" isn't YYYY-MM-DD`),
  });

  const ships = raw.ships.map((s) => ({
    ...base(s),
    modelMm: s.modelMm,
    measurementSource: source(s.name, s.measurementSource),
  }));
  const planned = raw.planned.map(base);
  const station =
    planned.find((s) => s.name === raw.station) ??
    fail(raw.station, 'the station isn’t among the planned ships');
  const measurementSources = [...new Set(ships.map((s) => s.measurementSource))];
  return { ships, planned, station, measurementSources };
}

function oneOf<T extends string>(allowed: readonly T[], value: string): T | undefined {
  return allowed.find((a) => a === value);
}

const parsed = parseShipData(data);

/** Armada's ships and squadrons: the data behind every fit on the page. */
export const SHIPS: readonly Ship[] = parsed.ships;
/** Ships I'd like to design, sized by the power fit. */
export const PLANNED_SHIPS: readonly PlannedShip[] = parsed.planned;
/** The station that started it all. */
export const XQ2: PlannedShip = parsed.station;
/** Where the measured data came from, for the page's references. */
export const MEASUREMENT_SOURCES: readonly Source[] = parsed.measurementSources;
