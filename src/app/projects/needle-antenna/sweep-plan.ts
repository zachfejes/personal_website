/**
 * Frequencies for a progressively refined, log-spaced sweep. The first pass covers the range
 * with `firstIntervals` equal steps (in log frequency); every later pass halves the step, so it
 * only adds the midpoints between frequencies already computed. After the last pass the sweep
 * has firstIntervals·2^(passes−1) + 1 points.
 */
export function sweepPasses(
  fMin: number,
  fMax: number,
  firstIntervals = 12,
  passes = 4,
): number[][] {
  const intervals = firstIntervals * 2 ** (passes - 1);
  const at = (i: number) => fMin * Math.pow(fMax / fMin, i / intervals);
  const out: number[][] = [];
  for (let p = 0; p < passes; p++) {
    const stride = 2 ** (passes - 1 - p);
    const pass: number[] = [];
    for (let i = 0; i <= intervals; i += stride) {
      // Pass 0 takes every point on its grid; later passes only the new (odd) ones.
      if (p === 0 || (i / stride) % 2 === 1) pass.push(at(i));
    }
    out.push(pass);
  }
  return out;
}
