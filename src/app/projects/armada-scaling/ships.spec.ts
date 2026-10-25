import { PLANNED_SHIPS, RawShipData, SHIPS, XQ2, parseShipData } from './ships';

const SOURCE = { title: 'Test source', url: 'https://example.com' };
const VALID: RawShipData = {
  sources: { test: SOURCE },
  station: 'Station',
  ships: [
    {
      name: 'Cruiser',
      canonM: 150,
      modelMm: 57.6,
      faction: 'Rebel Alliance',
      era: 'Galactic Civil War Era',
      measurementSource: 'test',
      canonSource: 'test',
      dateSourced: '2018-09-08',
    },
  ],
  planned: [
    {
      name: 'Station',
      canonM: 884,
      faction: 'Galactic Empire',
      era: 'Galactic Civil War Era',
      canonSource: 'test',
      dateSourced: '2018-09-10',
    },
  ],
};

/** VALID with one field of the first measured ship replaced. */
const withShip = (change: Partial<RawShipData['ships'][number]>): RawShipData => ({
  ...VALID,
  ships: [{ ...VALID.ships[0], ...change }],
});

describe('parseShipData', () => {
  it('resolves sources and finds the station', () => {
    const data = parseShipData(VALID);
    expect(data.ships[0].measurementSource).toEqual(SOURCE);
    expect(data.ships[0].canonSource).toEqual(SOURCE);
    expect(data.station.name).toBe(VALID.station);
  });

  it('lists each measurement source once, for crediting', () => {
    const OTHER = { title: 'Other source' };
    const data = parseShipData({
      ...VALID,
      sources: { ...VALID.sources, other: OTHER },
      ships: [
        VALID.ships[0],
        { ...VALID.ships[0], name: 'Second', measurementSource: 'other' },
        { ...VALID.ships[0], name: 'Third' },
      ],
    });
    expect(data.measurementSources).toEqual([SOURCE, OTHER]);
  });

  it('rejects a faction outside the list, naming the ship', () => {
    expect(() => parseShipData(withShip({ faction: 'Trade Guild' }))).toThrow(
      /Cruiser.*Trade Guild/,
    );
  });

  it('rejects an era outside the list', () => {
    expect(() => parseShipData(withShip({ era: 'High Republic Era' }))).toThrow(/era/);
  });

  it('rejects an unknown source id', () => {
    expect(() => parseShipData(withShip({ measurementSource: 'missing' }))).toThrow(/missing/);
  });

  it('rejects a date that isn’t YYYY-MM-DD', () => {
    expect(() => parseShipData(withShip({ dateSourced: 'Sept 2018' }))).toThrow(/YYYY-MM-DD/);
  });

  it('rejects a station that isn’t a planned ship', () => {
    expect(() => parseShipData({ ...VALID, station: 'Nowhere' })).toThrow(/station/);
  });
});

/** Checks that keep the hand-edited data in ships.json usable. */
describe('Armada ship data', () => {
  const ALL = [...SHIPS, ...PLANNED_SHIPS];

  it('names every ship once', () => {
    const names = ALL.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has positive lengths (the fits take logarithms)', () => {
    for (const s of ALL) expect(s.canonM).toBeGreaterThan(0);
    for (const s of SHIPS) expect(s.modelMm).toBeGreaterThan(0);
  });

  it('has enough measured ships to fit a curve', () => {
    const MIN_POINTS = 3;
    expect(SHIPS.length).toBeGreaterThanOrEqual(MIN_POINTS);
  });

  it('finds the station among the planned ships', () => {
    expect(PLANNED_SHIPS).toContain(XQ2);
  });
});
