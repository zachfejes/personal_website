/** A coefficient written as a term after another, with its own sign: "+ 1.25" or "- 1.25". */
export function signedTerm(value: number, decimals: number): string {
  const sign = value < 0 ? '-' : '+';
  return `${sign} ${Math.abs(value).toFixed(decimals)}`;
}
