import { linearRegression, logFit, meanPercentError, powerFit, rmse } from './regression';

/** Exact data has an exact fit, up to floating-point rounding. */
const DIGITS = 9;

const XS = [1, 2, 4, 8, 16];

/**
 * A worked example with scattered points. Means are (2, 2); covariance 1 and variance 2 give
 * slope 1/2 and intercept 2 - 2·(1/2) = 1. That line predicts 1.5, 2, 2.5 against 1, 3, 2:
 * errors 0.5, -1, 0.5, so the mean square error is 0.5. As shares of the real values those
 * errors are 1/2, 1/3 and 1/4, which average 13/36.
 */
const WORKED = {
  points: [
    { x: 1, y: 1 },
    { x: 2, y: 3 },
    { x: 3, y: 2 },
  ],
  slope: 0.5,
  intercept: 1,
  meanSquareError: 0.5,
  meanPercentError: (13 / 36) * 100,
};

describe('linearRegression', () => {
  it('fits scattered points (worked example)', () => {
    const line = linearRegression(WORKED.points);
    expect(line.slope).toBeCloseTo(WORKED.slope, DIGITS);
    expect(line.intercept).toBeCloseTo(WORKED.intercept, DIGITS);
  });

  it('recovers the line through points that lie on it', () => {
    const SLOPE = 2;
    const INTERCEPT = -3;
    const line = linearRegression(XS.map((x) => ({ x, y: SLOPE * x + INTERCEPT })));
    expect(line.slope).toBeCloseTo(SLOPE, DIGITS);
    expect(line.intercept).toBeCloseTo(INTERCEPT, DIGITS);
  });
});

describe('powerFit', () => {
  it('recovers a and b from points on y = a·x^b', () => {
    const A = 3;
    const B = 0.5;
    const fit = powerFit(XS.map((x) => ({ x, y: A * x ** B })));
    expect(fit.a).toBeCloseTo(A, DIGITS);
    expect(fit.b).toBeCloseTo(B, DIGITS);
    const X = 9;
    expect(fit.predict(X)).toBeCloseTo(A * X ** B, DIGITS);
  });
});

describe('logFit', () => {
  it('recovers a and b from points on y = a·ln(x) + b', () => {
    const A = 4;
    const B = -1;
    const fit = logFit(XS.map((x) => ({ x, y: A * Math.log(x) + B })));
    expect(fit.a).toBeCloseTo(A, DIGITS);
    expect(fit.b).toBeCloseTo(B, DIGITS);
  });
});

describe('rmse', () => {
  it('matches the worked example', () => {
    const line = (x: number) => WORKED.slope * x + WORKED.intercept;
    expect(rmse(WORKED.points, line)).toBeCloseTo(Math.sqrt(WORKED.meanSquareError), DIGITS);
  });

  it('is zero for a perfect model', () => {
    const points = XS.map((x) => ({ x, y: x }));
    expect(rmse(points, (x) => x)).toBe(0);
  });

  it('is the size of a constant error', () => {
    const OFFSET = 2.5;
    const points = XS.map((x) => ({ x, y: x }));
    expect(rmse(points, (x) => x + OFFSET)).toBeCloseTo(OFFSET, DIGITS);
  });
});

describe('meanPercentError', () => {
  it('matches the worked example', () => {
    const line = (x: number) => WORKED.slope * x + WORKED.intercept;
    expect(meanPercentError(WORKED.points, line)).toBeCloseTo(WORKED.meanPercentError, DIGITS);
  });

  it('is zero for a perfect model', () => {
    const points = XS.map((x) => ({ x, y: x }));
    expect(meanPercentError(points, (x) => x)).toBe(0);
  });

  it('weighs a miss by the size of the value, not in absolute terms', () => {
    // The same 5-unit miss is 50% of a 10 and 0.5% of a 1000.
    const MISS = 5;
    const SMALL = { x: 1, y: 10, percent: 50 };
    const LARGE = { x: 1, y: 1000, percent: 0.5 };
    for (const { x, y, percent } of [SMALL, LARGE]) {
      expect(meanPercentError([{ x, y }], () => y + MISS)).toBeCloseTo(percent, DIGITS);
    }
  });
});
