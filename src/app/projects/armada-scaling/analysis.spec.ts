import { Measured, analyzeScale } from './analysis';

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
    });

    it('finds the logarithmic fit worse', () => {
      expect(result.logRmse).toBeGreaterThan(result.powerRmse);
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
    });

    it('finds the power fit worse', () => {
      expect(result.powerRmse).toBeGreaterThan(result.logRmse);
    });
  });
});
