/** A complex number. Phasors in this simulation use the e^{jωt} convention. */
export interface Complex {
  re: number;
  im: number;
}

export const complex = (re: number, im = 0): Complex => ({ re, im });
export const ZERO: Complex = { re: 0, im: 0 };

export const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
export const sub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
export const mul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const scale = (a: Complex, s: number): Complex => ({ re: a.re * s, im: a.im * s });
export const div = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};
export const abs = (a: Complex): number => Math.hypot(a.re, a.im);
export const abs2 = (a: Complex): number => a.re * a.re + a.im * a.im;
export const arg = (a: Complex): number => Math.atan2(a.im, a.re);
export const conj = (a: Complex): Complex => ({ re: a.re, im: -a.im });
export const polar = (r: number, theta: number): Complex => ({
  re: r * Math.cos(theta),
  im: r * Math.sin(theta),
});

/** Principal square root (non-negative real part). */
export function sqrt(a: Complex): Complex {
  const r = abs(a);
  if (r === 0) return ZERO;
  const re = Math.sqrt((r + a.re) / 2);
  const im = Math.sqrt(Math.max(0, (r - a.re) / 2));
  return { re, im: a.im < 0 ? -im : im };
}

export const cosh = (a: Complex): Complex => ({
  re: Math.cosh(a.re) * Math.cos(a.im),
  im: Math.sinh(a.re) * Math.sin(a.im),
});
export const sinh = (a: Complex): Complex => ({
  re: Math.sinh(a.re) * Math.cos(a.im),
  im: Math.cosh(a.re) * Math.sin(a.im),
});

/** Instantaneous value Re{a·e^{jωt}} at phase ωt. */
export const instant = (a: Complex, wt: number): number =>
  a.re * Math.cos(wt) - a.im * Math.sin(wt);
