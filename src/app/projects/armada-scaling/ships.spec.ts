import { PLANNED_SHIPS, SHIPS, XQ2 } from './ships';

/** Checks that keep hand-edited data in ships.json sane. */
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
