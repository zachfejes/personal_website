import { Measured, analyzeScale, logFitZeroM, modelNeighbors } from './analysis';
import { Fit } from './regression';

/** Exact data has an exact fit, up to floating-point rounding. */
const DIGITS = 9;
const CANON_LENGTHS_M = [10, 50, 150, 400, 900, 1600];

const onCurve = (model: (canonM: number) => number): Measured[] =>
  CANON_LENGTHS_M.map((canonM) => ({ canonM, modelMm: model(canonM) }));

describe('analyzeScale', () => {
  describe('with ships that follow a power law exactly', () => {
    const A = 2;
    const B = 0.5;
    const result = analyzeScale(onCurve((x) => A * x ** B));

    it('recovers the power fit', () => {
      expect(result.power.a).toBeCloseTo(A, DIGITS);
      expect(result.power.b).toBeCloseTo(B, DIGITS);
      expect(result.powerRmse).toBeCloseTo(0, DIGITS);
      expect(result.powerPercentError).toBeCloseTo(0, DIGITS);
    });

    it('finds the logarithmic fit worse', () => {
      expect(result.logRmse).toBeGreaterThan(result.powerRmse);
      expect(result.logPercentError).toBeGreaterThan(result.powerPercentError);
    });

    it('predicts model sizes from the power fit', () => {
      const CANON_M = 100;
      expect(result.predictModelMm(CANON_M)).toBeCloseTo(A * CANON_M ** B, DIGITS);
    });
  });

  describe('with ships that follow a logarithm exactly', () => {
    // Positive across CANON_LENGTHS_M: the power fit takes logarithms of model lengths.
    const A = 30;
    const B = 10;
    const result = analyzeScale(onCurve((x) => A * Math.log(x) + B));

    it('recovers the logarithmic fit', () => {
      expect(result.log.a).toBeCloseTo(A, DIGITS);
      expect(result.log.b).toBeCloseTo(B, DIGITS);
      expect(result.logRmse).toBeCloseTo(0, DIGITS);
      expect(result.logPercentError).toBeCloseTo(0, DIGITS);
    });

    it('finds the power fit worse', () => {
      expect(result.powerRmse).toBeGreaterThan(result.logRmse);
      expect(result.powerPercentError).toBeGreaterThan(result.logPercentError);
    });
  });
});

describe('logFitZeroM', () => {
  const fit = (a: number, b: number): Fit => ({ a, b, predict: (x) => a * Math.log(x) + b });

  it('finds where a rising log fit crosses zero', () => {
    // a·ln(x) + b = 0 where ln(x) = -b/a.
    const A = 10;
    const B = -20;
    const zero = logFitZeroM(fit(A, B));
    expect(zero).toBeCloseTo(Math.exp(-B / A), DIGITS);
    expect(fit(A, B).predict(zero ?? 0)).toBeCloseTo(0, DIGITS);
  });

  it('has no crossing for a fit that never rises', () => {
    const FLAT = 0;
    const B = 5;
    expect(logFitZeroM(fit(FLAT, B))).toBeNull();
  });
});

describe('modelNeighbors', () => {
  const SMALL = { name: 'Small', canonM: 10, modelMm: 10 };
  const MEDIUM = { name: 'Medium', canonM: 100, modelMm: 40 };
  const LARGE = { name: 'Large', canonM: 1000, modelMm: 150 };
  // Listed out of order, so the search can't rely on sorting.
  const SHIPS = [LARGE, SMALL, MEDIUM];

  it('finds the nearest model on each side', () => {
    const BETWEEN_MEDIUM_AND_LARGE_MM = 100;
    expect(modelNeighbors(SHIPS, BETWEEN_MEDIUM_AND_LARGE_MM)).toEqual({
      below: MEDIUM,
      above: LARGE,
    });
  });

  it('has nothing below the smallest or above the largest', () => {
    const TINY_MM = 1;
    const HUGE_MM = 1000;
    expect(modelNeighbors(SHIPS, TINY_MM)).toEqual({ below: null, above: SMALL });
    expect(modelNeighbors(SHIPS, HUGE_MM)).toEqual({ below: LARGE, above: null });
  });
});
