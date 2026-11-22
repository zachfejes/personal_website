import { NeedleMaterial } from './model';

const STEFAN_BOLTZMANN = 5.670374419e-8;

export interface ThermalProfile {
  /** Node heights (m), as in the electrical solution. */
  nodes: number[];
  /** Steady temperature at each node (K). */
  temperature: number[];
  maxTemperature: number;
}

/** What the thermal solver needs from each electrical cell. */
export interface HeatedCell {
  h: number;
  radius: number;
  /** Time-averaged Joule heat per meter (W/m). */
  heat: number;
}

/**
 * Steady temperature along the needle. Heat flows along the metal by conduction to the base,
 * which is held at ambient by the ground plane, and leaves the surface by thermal radiation (in
 * vacuum there is no convection). Finite volumes on the electrical nodes, Newton iteration on
 * the T⁴ radiation term, tridiagonal solve each step.
 */
export function solveTemperature(
  nodes: number[],
  cells: HeatedCell[],
  material: NeedleMaterial,
  ambient: number,
  tipRadius: number,
): ThermalProfile {
  const n = nodes.length;
  const conductance = cells.map(
    (c) => (material.thermalConductivity * Math.PI * c.radius * c.radius) / c.h,
  );
  const source = new Array<number>(n).fill(0);
  const area = new Array<number>(n).fill(0);
  cells.forEach((c, i) => {
    source[i] += 0.5 * c.heat * c.h;
    source[i + 1] += 0.5 * c.heat * c.h;
    const side = 2 * Math.PI * c.radius * c.h;
    area[i] += 0.5 * side;
    area[i + 1] += 0.5 * side;
  });
  area[n - 1] += 2 * Math.PI * tipRadius * tipRadius;
  const radiative = area.map((a) => material.emissivity * STEFAN_BOLTZMANN * a);
  const t = new Array<number>(n).fill(ambient);
  const ambient4 = ambient ** 4;

  const lower = new Array<number>(n).fill(0);
  const diag = new Array<number>(n).fill(0);
  const upper = new Array<number>(n).fill(0);
  const rhs = new Array<number>(n).fill(0);
  for (let iter = 0; iter < 200; iter++) {
    diag[0] = 1;
    upper[0] = 0;
    rhs[0] = ambient;
    for (let i = 1; i < n; i++) {
      const gl = conductance[i - 1];
      const gu = i < n - 1 ? conductance[i] : 0;
      const ti = t[i];
      // Radiation linearized about the current guess: f(T) ≈ f(Ti) + f'(Ti)(T − Ti).
      const f = radiative[i] * (ti ** 4 - ambient4);
      const df = 4 * radiative[i] * ti ** 3;
      lower[i] = -gl;
      upper[i] = -gu;
      diag[i] = gl + gu + df;
      rhs[i] = source[i] - f + df * ti;
    }
    const next = thomas(lower, diag, upper, rhs).map((x) => Math.max(x, ambient));
    let change = 0;
    for (let i = 0; i < n; i++) change = Math.max(change, Math.abs(next[i] - t[i]) / next[i]);
    for (let i = 0; i < n; i++) t[i] = next[i];
    if (change < 1e-9) break;
  }
  return { nodes, temperature: t, maxTemperature: Math.max(...t) };
}

/** Solves a tridiagonal system. */
function thomas(a: number[], b: number[], c: number[], d: number[]): number[] {
  const n = d.length;
  const cp = new Array<number>(n).fill(0);
  const dp = new Array<number>(n).fill(0);
  cp[0] = c[0] / b[0];
  dp[0] = d[0] / b[0];
  for (let i = 1; i < n; i++) {
    const m = b[i] - a[i] * cp[i - 1];
    cp[i] = c[i] / m;
    dp[i] = (d[i] - a[i] * dp[i - 1]) / m;
  }
  const x = new Array<number>(n).fill(0);
  x[n - 1] = dp[n - 1];
  for (let i = n - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
  return x;
}
