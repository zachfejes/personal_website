import { Complex } from './physics/complex';

const PREFIXES: readonly [number, string][] = [
  [1e12, 'T'],
  [1e9, 'G'],
  [1e6, 'M'],
  [1e3, 'k'],
  [1, ''],
  [1e-3, 'm'],
  [1e-6, 'µ'],
  [1e-9, 'n'],
  [1e-12, 'p'],
  [1e-15, 'f'],
  [1e-18, 'a'],
];

/** Trims a fixed-precision number: "12.0" → "12", "0.500" → "0.5". */
function trim(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

/** "2.4 GHz", "−31.7 mA", "0 V": three significant figures with an SI prefix. */
export function si(value: number, unit: string, digits = 3): string {
  if (!Number.isFinite(value)) return `— ${unit}`.trim();
  if (value === 0) return `0 ${unit}`.trim();
  const mag = Math.abs(value);
  const [factor, prefix] =
    PREFIXES.find(([f]) => mag >= f * 0.9995) ?? PREFIXES[PREFIXES.length - 1];
  const scaled = value / factor;
  const decimals = Math.max(0, digits - 1 - Math.floor(Math.log10(Math.abs(scaled))));
  const sign = scaled < 0 ? '−' : '';
  return `${sign}${trim(Math.abs(scaled).toFixed(decimals))} ${prefix}${unit}`.trim();
}

/** A plain number to three significant figures, with a proper minus sign. */
export function num(value: number, digits = 3): string {
  if (value === 0) return '0';
  const text =
    Math.abs(value) >= 1e5 || Math.abs(value) < 1e-3
      ? Math.abs(value)
          .toExponential(digits - 1)
          .replace('e+', 'e')
      : trim(Math.abs(value).toPrecision(digits));
  return `${value < 0 ? '−' : ''}${text}`;
}

/** "31.7 + j24.4 Ω" or "31.7 − j24.4 Ω". */
export function impedance(z: Complex): string {
  const re = si(z.re, 'Ω').replace(' Ω', '');
  const im = si(Math.abs(z.im), 'Ω').replace(' Ω', '');
  return `${re} ${z.im < 0 ? '−' : '+'} j${im} Ω`;
}

export const percent = (fraction: number) => `${trim((fraction * 100).toFixed(1))} %`;
export const kelvinToCelsius = (k: number) => k - 273.15;
