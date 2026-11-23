const STEFAN_BOLTZMANN = 5.670374419e-8;

export interface ThermalProfile {
  /** Node heights (m), as in the electrical solution. */
  nodes: number[];
  /** Steady temperature at each node (K). */
  temperature: number[];
  maxTemperature: number;
}

/** One stretch of needle between two nodes. */
export interface ThermalInterval {
  /** Conductance along the metal between the two nodes (W/K). */
  conductance: number;
  /** Heat generated in the stretch (W). */
  heat: number;
  /** Surface area radiating to the surroundings (m²). */
  area: number;
  /** Convective conductance to the surrounding fluid, h·area (W/K); 0 in vacuum. */
  convection?: number;
}

export interface ThermalProblem {
  nodes: number[];
  intervals: ThermalInterval[];
  /** Radiating area beyond the last node (the apex cap) (m²). */
  endArea: number;
  /** Convective conductance of the cap (W/K). */
  endConvection?: number;
  emissivity: number;
  /** Temperature of the surroundings (K). */
  ambient: number;
  /** Hold the base at ambient (a heat-sunk feed); otherwise no heat leaves through the base. */
  clampBase: boolean;
}

/**
 * Steady temperature along the needle. Heat flows along the metal by conduction and leaves the
 * surface by grey-body radiation εσ(T⁴ − T₀⁴) and by convection h(T − T₀) to the surrounding
 * fluid (none in vacuum). The base is
 * either held at ambient or insulated (by symmetry nothing crosses the feed gap from the mirror
 * needle, which is at the same temperature). Finite volumes on the nodes, Newton iteration on
 * the T⁴ term, a tridiagonal solve each step.
 */
export function solveTemperature(problem: ThermalProblem): ThermalProfile {
  const { nodes, intervals, ambient, clampBase } = problem;
  const n = nodes.length;
  const emissivity = Math.max(problem.emissivity, 1e-4);
  const source = new Array<number>(n).fill(0);
  const area = new Array<number>(n).fill(0);
  const convective = new Array<number>(n).fill(0);
  intervals.forEach((s, i) => {
    source[i] += 0.5 * s.heat;
    source[i + 1] += 0.5 * s.heat;
    area[i] += 0.5 * s.area;
    area[i + 1] += 0.5 * s.area;
    convective[i] += 0.5 * (s.convection ?? 0);
    convective[i + 1] += 0.5 * (s.convection ?? 0);
  });
  area[n - 1] += problem.endArea;
  convective[n - 1] += problem.endConvection ?? 0;
  const radiative = area.map((a) => emissivity * STEFAN_BOLTZMANN * a);
  const ambient4 = ambient ** 4;
  // Start from each node shedding its own heat by radiation, or by convection if that's
  // stronger; Newton takes it from there.
  const t = source.map((q, i) => {
    if (clampBase && i === 0) return ambient;
    const byRadiation = Math.pow(q / Math.max(radiative[i], 1e-300) + ambient4, 0.25);
    const byConvection = convective[i] > 0 ? ambient + q / convective[i] : Infinity;
    return Math.min(byRadiation, byConvection);
  });

  const lower = new Array<number>(n).fill(0);
  const diag = new Array<number>(n).fill(0);
  const upper = new Array<number>(n).fill(0);
  const rhs = new Array<number>(n).fill(0);
  for (let iter = 0; iter < 200; iter++) {
    for (let i = 0; i < n; i++) {
      if (i === 0 && clampBase) {
        diag[0] = 1;
        upper[0] = 0;
        rhs[0] = ambient;
        continue;
      }
      const gl = i > 0 ? intervals[i - 1].conductance : 0;
      const gu = i < n - 1 ? intervals[i].conductance : 0;
      const ti = t[i];
      // Radiation linearized about the current guess: f(T) ≈ f(Ti) + f'(Ti)(T − Ti).
      const f = radiative[i] * (ti ** 4 - ambient4);
      const df = 4 * radiative[i] * ti ** 3;
      lower[i] = -gl;
      upper[i] = -gu;
      diag[i] = gl + gu + df + convective[i];
      rhs[i] = source[i] - f + df * ti + convective[i] * ambient;
    }
    const next = thomas(lower, diag, upper, rhs).map((x) => Math.max(x, ambient));
    let change = 0;
    for (let i = 0; i < n; i++) change = Math.max(change, Math.abs(next[i] - t[i]) / next[i]);
    for (let i = 0; i < n; i++) t[i] = next[i];
    if (change < 1e-10) break;
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
