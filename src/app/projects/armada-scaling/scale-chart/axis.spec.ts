import { axisTicks, makeScale, sampleRange } from './axis';

const RANGE: [number, number] = [0, 100];
const DIGITS = 9;

describe('makeScale', () => {
  it('starts a linear axis at zero and covers the largest value', () => {
    const VALUES = [12, 340, 1600];
    const [low, high] = makeScale('linear', VALUES, RANGE).domain();
    expect(low).toBe(0);
    expect(high).toBeGreaterThanOrEqual(Math.max(...VALUES));
  });

  it('fits a log axis around the data, above zero', () => {
    const VALUES = [6.3, 884, 19000];
    const [low, high] = makeScale('log', VALUES, RANGE).domain();
    expect(low).toBeGreaterThan(0);
    expect(low).toBeLessThanOrEqual(Math.min(...VALUES));
    expect(high).toBeGreaterThanOrEqual(Math.max(...VALUES));
  });
});

describe('axisTicks', () => {
  const COUNT = 5;

  it('labels only powers of ten across a wide log axis', () => {
    const scale = makeScale('log', [6.3, 19000], RANGE);
    expect(axisTicks('log', scale, COUNT)).toEqual([10, 100, 1000, 10000]);
  });

  it('adds 2s and 5s on a narrow log axis', () => {
    const scale = makeScale('log', [8, 120], RANGE);
    expect(axisTicks('log', scale, COUNT)).toEqual([10, 20, 50, 100]);
  });

  it('spaces ticks evenly on a log axis shorter than a power of ten', () => {
    // From just under 0.7 to just over 1.4, the tidy steps of about 5 ticks are 0.2 apart.
    const scale = makeScale('log', [0.7, 1.4], RANGE);
    const EXPECTED = [0.8, 1, 1.2, 1.4];
    axisTicks('log', scale, COUNT).forEach((t, i) => expect(t).toBeCloseTo(EXPECTED[i], DIGITS));
    expect(axisTicks('log', scale, COUNT)).toHaveLength(EXPECTED.length);
  });

  it('spaces linear ticks evenly from zero', () => {
    const scale = makeScale('linear', [100], RANGE);
    const ticks = axisTicks('linear', scale, COUNT);
    expect(ticks[0]).toBe(0);
    const gaps = ticks.slice(1).map((t, i) => t - ticks[i]);
    expect(new Set(gaps).size).toBe(1);
  });
});

describe('sampleRange', () => {
  const COUNT = 4;

  it('spaces linear samples evenly', () => {
    expect(sampleRange('linear', 0, 100, COUNT)).toEqual([0, 25, 50, 75, 100]);
  });

  it('spaces log samples by equal ratios', () => {
    const samples = sampleRange('log', 1, 10000, COUNT);
    [1, 10, 100, 1000, 10000].forEach((expected, i) => {
      expect(samples[i]).toBeCloseTo(expected, DIGITS);
    });
  });
});
