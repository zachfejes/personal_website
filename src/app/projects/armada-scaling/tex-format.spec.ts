import { signedTerm } from './tex-format';

const DECIMALS = 2;

describe('signedTerm', () => {
  it('writes a negative value as a subtraction', () => {
    expect(signedTerm(-78.254, DECIMALS)).toBe('- 78.25');
  });

  it('writes a positive value as an addition', () => {
    expect(signedTerm(12.5, DECIMALS)).toBe('+ 12.50');
  });

  it('writes zero as an addition', () => {
    expect(signedTerm(0, DECIMALS)).toBe('+ 0.00');
  });
});
