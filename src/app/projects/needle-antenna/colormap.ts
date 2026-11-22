/** 256-entry RGB lookup tables for the field maps and heat strips. */
export type Lut = Uint8ClampedArray;

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function build(stops: readonly string[]): Lut {
  const rgb = stops.map(hex);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (rgb.length - 1);
    const k = Math.min(Math.floor(t), rgb.length - 2);
    const f = t - k;
    for (let ch = 0; ch < 3; ch++) lut[i * 3 + ch] = rgb[k][ch] + (rgb[k + 1][ch] - rgb[k][ch]) * f;
  }
  return lut;
}

/** Dark to lamplight: field magnitude, heat. */
export const EMBER = build([
  '#0c0f0e',
  '#1d1830',
  '#4a1d4a',
  '#8c2a45',
  '#c8503a',
  '#e88a3c',
  '#f4c766',
  '#fbf1cf',
]);

/** Teal for negative, near-black for zero, amber for positive: signed fields. */
export const TIDE = build([
  '#bdf0f2',
  '#4bb3c4',
  '#1b5560',
  '#0e1312',
  '#6b4214',
  '#d99a45',
  '#fae3b0',
]);

/** CSS color for a value in [0, 1]. */
export function lutColor(lut: Lut, t: number): string {
  const i = Math.round(Math.min(1, Math.max(0, t)) * 255) * 3;
  return `rgb(${lut[i]} ${lut[i + 1]} ${lut[i + 2]})`;
}

/** CSS linear-gradient through a table, for legends. */
export function lutGradient(lut: Lut, direction = 'to right'): string {
  const stops: string[] = [];
  for (let s = 0; s <= 8; s++) stops.push(`${lutColor(lut, s / 8)} ${(s / 8) * 100}%`);
  return `linear-gradient(${direction}, ${stops.join(', ')})`;
}
