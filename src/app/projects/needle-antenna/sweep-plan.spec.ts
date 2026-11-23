import { sweepPasses } from './sweep-plan';

describe('sweepPasses', () => {
  const passes = sweepPasses(1e6, 1e9, 12, 4);
  const all = passes.flat().sort((a, b) => a - b);

  it('starts coarse and doubles the resolution each pass', () => {
    expect(passes.map((p) => p.length)).toEqual([13, 12, 24, 48]);
    expect(all.length).toBe(97);
  });

  it('never repeats a frequency', () => {
    expect(new Set(all.map((f) => f.toPrecision(12))).size).toBe(all.length);
  });

  it('ends on an even log-spaced grid over the whole range', () => {
    expect(all[0]).toBeCloseTo(1e6, 0);
    expect(all[all.length - 1] / 1e9).toBeCloseTo(1, 12);
    const ratios = all.slice(1).map((f, i) => f / all[i]);
    for (const r of ratios) expect(r / ratios[0]).toBeCloseTo(1, 10);
  });

  it('puts each later point midway (in log frequency) between earlier ones', () => {
    const first = passes[0];
    const mid = Math.sqrt(first[0] * first[1]);
    expect(passes[1][0] / mid).toBeCloseTo(1, 12);
  });
});
