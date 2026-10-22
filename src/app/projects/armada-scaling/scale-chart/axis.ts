import { ScaleContinuousNumeric, scaleLinear, scaleLog } from 'd3-scale';

export const SCALE_KINDS = ['linear', 'log'] as const;
export type ScaleKind = (typeof SCALE_KINDS)[number];

/** Headroom beyond the data at each end, as a fraction (for log, of the ratio). */
const PADDING = 0.06;
/** On log axes, label 1-2-5 steps when the data spans at most this many powers of ten. */
const MAX_DECADES_FOR_STEPS = 2.5;
const LOG_STEPS = [1, 2, 5];
const DECADE = 10;

/**
 * A scale for positive data. Linear axes start at zero and round out to a tidy end value; log
 * axes run from just below the smallest value (they can't reach zero) to just above the largest.
 */
export function makeScale(
  kind: ScaleKind,
  values: readonly number[],
  range: [number, number],
): ScaleContinuousNumeric<number, number> {
  const max = Math.max(...values);
  if (kind === 'linear') {
    return scaleLinear()
      .domain([0, max * (1 + PADDING)])
      .range(range)
      .nice();
  }
  const min = Math.min(...values);
  // Not rounded out: on a log axis that would add most of a power of ten of empty space.
  return scaleLog()
    .domain([min * (1 - PADDING), max * (1 + PADDING)])
    .range(range);
}

/**
 * Tick values for an axis. Linear: evenly spaced, about `count` of them. Log: powers of ten, plus
 * 2s and 5s between them when the axis spans only a couple of powers of ten.
 */
export function axisTicks(
  kind: ScaleKind,
  scale: ScaleContinuousNumeric<number, number>,
  count: number,
): number[] {
  if (kind === 'linear') return scale.ticks(count);
  const [low, high] = scale.domain();
  const decades = Math.log10(high / low);
  const steps = decades <= MAX_DECADES_FOR_STEPS ? LOG_STEPS : [1];
  const ticks: number[] = [];
  for (let power = Math.floor(Math.log10(low)); power <= Math.ceil(Math.log10(high)); power++) {
    for (const step of steps) {
      const value = step * DECADE ** power;
      if (value >= low && value <= high) ticks.push(value);
    }
  }
  return ticks;
}

/** `count` + 1 x values from `min` to `max`, evenly spaced on the given kind of axis. */
export function sampleRange(kind: ScaleKind, min: number, max: number, count: number): number[] {
  return Array.from({ length: count + 1 }, (_, i) =>
    kind === 'linear' ? min + ((max - min) * i) / count : min * (max / min) ** (i / count),
  );
}
