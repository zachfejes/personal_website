import { LOG_FIT, LOG_RMSE, POWER_FIT, POWER_RMSE, predictModelMm } from './analysis';
import { XQ2 } from './ships';

/**
 * The 2018 write-up's results, which the port must reproduce. Each is checked to the precision
 * it was published at. (The write-up printed the log fit's a as 3.84, a typo for 31.84: its own
 * chart and error used 31.84.)
 */
const PUBLISHED = {
  power: { a: 3.42, b: 0.553, rmse: 6.64 },
  log: { a: 31.84, b: -78.25, rmse: 24.8 },
  xq2ModelMm: 146,
} as const;

/** toBeCloseTo precision: within half a unit of the last published digit. */
const HUNDREDTHS = 2;
const THOUSANDTHS = 3;
const TENTHS = 1;
const WHOLE = 0;

describe('Armada scale analysis', () => {
  it('reproduces the power fit', () => {
    expect(POWER_FIT.a).toBeCloseTo(PUBLISHED.power.a, HUNDREDTHS);
    expect(POWER_FIT.b).toBeCloseTo(PUBLISHED.power.b, THOUSANDTHS);
    expect(POWER_RMSE).toBeCloseTo(PUBLISHED.power.rmse, HUNDREDTHS);
  });

  it('reproduces the logarithmic fit', () => {
    expect(LOG_FIT.a).toBeCloseTo(PUBLISHED.log.a, HUNDREDTHS);
    expect(LOG_FIT.b).toBeCloseTo(PUBLISHED.log.b, HUNDREDTHS);
    expect(LOG_RMSE).toBeCloseTo(PUBLISHED.log.rmse, TENTHS);
  });

  it('finds the power fit is the better one', () => {
    expect(POWER_RMSE).toBeLessThan(LOG_RMSE);
  });

  it('sizes the XQ2 Platform model as published', () => {
    expect(predictModelMm(XQ2.canonM)).toBeCloseTo(PUBLISHED.xq2ModelMm, WHOLE);
  });
});
