import { linearRegression, logFit, powerFit, rmse } from './regression';

/** Exact data has an exact fit, up to floating-point rounding. */
const DIGITS = 9;

const XS = [1, 2, 4, 8, 16];

describe('linearRegression', () => {
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
