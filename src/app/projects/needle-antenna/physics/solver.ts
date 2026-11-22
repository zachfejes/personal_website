import {
  Complex,
  ZERO,
  abs,
  abs2,
  add,
  complex,
  conj,
  cosh,
  div,
  mul,
  polar,
  scale,
  sinh,
  sqrt,
} from './complex';
import { NeedleGeometry, NeedleParams } from './model';
import { ThermalProfile, solveTemperature } from './thermal';

export const MU0 = 1.25663706212e-6;
export const EPS0 = 8.8541878128e-12;
export const C0 = 1 / Math.sqrt(MU0 * EPS0);
const TWO_PI = 2 * Math.PI;

/**
 * Radius of the needle at height z, including the hemispherical cap on the apex. 0 outside the
 * needle. The shaft runs from 0 to L − Lt, the cone from there down to the tip radius, and the
 * cap rounds the last tip radius off.
 */
export function needleRadius(g: NeedleGeometry, z: number): number {
  if (z < 0 || z > g.length) return 0;
  const rTip = Math.min(g.tipRadius, g.radius);
  const taper = Math.min(Math.max(g.taperLength, 0), g.length);
  const capCenter = g.length - (taper > 0 ? rTip : 0);
  if (taper > 0 && z > capCenter) {
    const d = z - capCenter;
    return Math.sqrt(Math.max(0, rTip * rTip - d * d));
  }
  const shaftEnd = g.length - taper;
  if (z <= shaftEnd) return g.radius;
  const coneLength = Math.max(capCenter - shaftEnd, 1e-30);
  return g.radius + ((rTip - g.radius) * (z - shaftEnd)) / coneLength;
}

/** Radius used by the line model: like needleRadius, but never thinner than the tip radius. */
function lineRadius(g: NeedleGeometry, z: number): number {
  const rTip = g.taperLength > 0 ? Math.min(g.tipRadius, g.radius) : g.radius;
  return Math.max(needleRadius(g, z), rTip);
}

/**
 * Node positions along the needle. Uniform in the shaft (fine enough for the wavelength) and
 * graded geometrically down the point, so cells near the apex are comparable to the tip radius.
 */
export function buildMesh(g: NeedleGeometry, wavelength: number, baseCells = 160): number[] {
  const L = g.length;
  const h0 = Math.min(L / baseCells, wavelength / 40);
  const taper = Math.min(Math.max(g.taperLength, 0), L);
  const shaftEnd = L - taper;
  const nodes: number[] = [0];
  const nShaft = Math.max(shaftEnd > 0 ? 1 : 0, Math.ceil(shaftEnd / h0));
  for (let i = 1; i <= nShaft; i++) nodes.push((shaftEnd * i) / nShaft);
  if (taper > 0) {
    const hMin = Math.max(Math.min(g.tipRadius, g.radius), L * 1e-6, h0 / 400);
    const sizes: number[] = [];
    let total = 0;
    let s = Math.min(hMin, h0);
    while (total < taper) {
      sizes.push(s);
      total += s;
      s = Math.min(s * 1.25, h0);
    }
    const fit = taper / total;
    let z = shaftEnd;
    for (let i = sizes.length - 1; i >= 0; i--) {
      z += sizes[i] * fit;
      nodes.push(i === 0 ? L : z);
    }
  }
  return nodes;
}

/** One cell of the discretized line, between two nodes. */
export interface Cell {
  /** Center height (m). */
  z: number;
  /** Length (m). */
  h: number;
  /** Line-model radius at the center (m). */
  radius: number;
  /** Characteristic impedance of the local line against the ground plane (Ω). */
  z0: number;
  /** Ohmic resistance per meter, with skin effect (Ω/m). */
  resistance: number;
  /** External inductance per meter (H/m). */
  inductance: number;
  /** Internal (in-metal) inductance per meter (H/m). */
  internalInductance: number;
  /** Capacitance per meter (F/m). */
  capacitance: number;
  /** Current phasor at the cell center (A, peak). */
  current: Complex;
  /** Total charge phasor carried by the cell (C, peak). */
  charge: Complex;
  /** Time-averaged Joule heat per meter (W/m). */
  heat: number;
}

export interface FarField {
  /** Polar angles from the needle axis, 0 to π/2 (rad). */
  theta: number[];
  /** Radiation intensity U(θ) (W/sr). */
  intensity: number[];
  /** Peak directivity over an isotropic radiator in full space. */
  directivity: number;
}

export interface Solution {
  params: NeedleParams;
  omega: number;
  /** Wavenumber in the medium (rad/m). */
  k: number;
  wavelength: number;
  /** Wave impedance of the medium (Ω). */
  eta: number;
  epsilon: number;
  mu: number;
  /** Node heights from base (0) to apex (L). */
  nodes: number[];
  /** Voltage phasor between needle and ground plane at each node (V, peak). */
  voltage: Complex[];
  /** Current phasor up the needle at each node (A, peak). */
  current: Complex[];
  cells: Cell[];
  /** Charge on the apex cap (C, peak). */
  tipCharge: Complex;
  /** Capacitance of the apex cap to infinity (F). */
  endCapacitance: number;
  /** Source phasor V̂·e^{jφ}. */
  sourceVoltage: Complex;
  /** Current drawn from the source (A, peak). */
  sourceCurrent: Complex;
  /** Impedance looking into the needle at its base (Ω). */
  inputImpedance: Complex;
  /** Impedance the ideal source sees, feed network included (Ω). */
  sourceImpedance: Complex;
  /** Equivalent series radiation resistance spread along the needle (Ω/m). */
  radiationResistancePerMeter: number;
  /** Radiation resistance referred to the base current (Ω). */
  radiationResistance: number;
  /** Ohmic loss resistance referred to the base current (Ω). */
  lossResistance: number;
  power: {
    /** Delivered by the ideal source (W). */
    source: number;
    /** Dissipated in the feed resistance (W). */
    feed: number;
    /** Delivered into the needle's base (W). */
    input: number;
    /** Radiated into the half-space above the plane (W). */
    radiated: number;
    /** Joule heat in the needle (W). */
    ohmic: number;
  };
  /** Radiated ÷ (radiated + ohmic). */
  efficiency: number;
  skinDepth: number;
  /** Largest surface electric field amplitude along the needle (V/m), and where it is. */
  peakSurfaceField: { value: number; z: number };
  farField: FarField;
  thermal: ThermalProfile;
  /** How many radiation-loss iterations ran, and the final relative change. */
  convergence: { iterations: number; change: number };
}

/** Per-meter internal impedance of a round wire, blending the DC and skin-effect limits. */
function internalImpedance(
  radius: number,
  resistivity: number,
  mu: number,
  omega: number,
): { r: number; x: number; delta: number } {
  const rDc = resistivity / (Math.PI * radius * radius);
  const delta = Math.sqrt((2 * resistivity) / (omega * mu));
  const x = radius / delta;
  const blend = Math.pow(1 + Math.pow(x / 2, 4), 0.25);
  return { r: rDc * blend, x: (rDc * (x * x)) / 4 / blend, delta };
}

interface LineState {
  voltage: Complex[];
  current: Complex[];
  sourceCurrent: Complex;
  inputImpedance: Complex;
  tipCharge: Complex;
}

/**
 * Solves the telegrapher's equations on the non-uniform line from the open apex back to the
 * base, then scales the result to the source and feed network.
 */
function solveLine(
  cells: Cell[],
  radiationR: number,
  omega: number,
  endCapacitance: number,
  feedZ: Complex,
  baseCapacitance: number,
  sourceVoltage: Complex,
): LineState {
  const n = cells.length;
  const v: Complex[] = new Array<Complex>(n + 1);
  const i: Complex[] = new Array<Complex>(n + 1);
  v[n] = complex(1);
  i[n] = complex(0, omega * endCapacitance);
  for (let c = n - 1; c >= 0; c--) {
    const cell = cells[c];
    const zs = complex(
      cell.resistance + radiationR,
      omega * (cell.inductance + cell.internalInductance),
    );
    const ys = complex(0, omega * cell.capacitance);
    const gamma = sqrt(mul(zs, ys));
    const zc = div(zs, gamma);
    const gl = scale(gamma, cell.h);
    const ch = cosh(gl);
    const sh = sinh(gl);
    v[c] = add(mul(v[c + 1], ch), mul(mul(zc, i[c + 1]), sh));
    i[c] = add(mul(i[c + 1], ch), mul(div(v[c + 1], zc), sh));
  }
  const shunt = mul(complex(0, omega * baseCapacitance), v[0]);
  const srcCurrentUnit = add(i[0], shunt);
  const srcVoltageUnit = add(v[0], mul(feedZ, srcCurrentUnit));
  const s = div(sourceVoltage, srcVoltageUnit);
  for (let k = 0; k <= n; k++) {
    v[k] = mul(v[k], s);
    i[k] = mul(i[k], s);
  }
  return {
    voltage: v,
    current: i,
    sourceCurrent: mul(srcCurrentUnit, s),
    inputImpedance: div(v[0], i[0]),
    tipCharge: div(i[n], complex(0, omega)),
  };
}

/** Far field of the needle plus its image, over the upper hemisphere. */
export function farField(cells: Cell[], k: number, eta: number, samples = 90): FarField {
  const theta: number[] = [];
  const intensity: number[] = [];
  let power = 0;
  const dTheta = Math.PI / 2 / samples;
  for (let s = 0; s < samples; s++) {
    const t = (s + 0.5) * dTheta;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    let fr = 0;
    let fi = 0;
    for (const c of cells) {
      // Needle and image together: 2·cos(k z cos θ) per element.
      const f = 2 * c.h * Math.cos(k * c.z * cosT);
      fr += c.current.re * f;
      fi += c.current.im * f;
    }
    const u = ((eta * k * k) / (32 * Math.PI * Math.PI)) * (fr * fr + fi * fi) * sinT * sinT;
    theta.push(t);
    intensity.push(u);
    power += u * TWO_PI * sinT * dTheta;
  }
  const uMax = Math.max(...intensity);
  return { theta, intensity, directivity: power > 0 ? (4 * Math.PI * uMax) / power : 0 };
}

const radiatedPower = (ff: FarField) =>
  ff.intensity.reduce(
    (sum, u, s) => sum + u * TWO_PI * Math.sin(ff.theta[s]) * (Math.PI / 2 / ff.theta.length),
    0,
  );

export interface SolveOptions {
  /** Shaft cells (the point adds more). */
  baseCells?: number;
  /** Skip the temperature profile (e.g. for frequency sweeps). */
  skipThermal?: boolean;
}

/** Steady-state solution of the driven needle. */
export function solve(params: NeedleParams, options: SolveOptions = {}): Solution {
  const { geometry: g, drive, material, medium } = params;
  const omega = TWO_PI * drive.frequency;
  const epsilon = EPS0 * medium.relPermittivity;
  const mu = MU0 * medium.relPermeability;
  const velocity = 1 / Math.sqrt(epsilon * mu);
  const eta = Math.sqrt(mu / epsilon);
  const k = omega / velocity;
  const wavelength = velocity / drive.frequency;
  const metalMu = MU0 * material.relPermeability;

  const nodes = buildMesh(g, wavelength, options.baseCells);
  let skinDepth = 0;
  const cells: Cell[] = [];
  for (let c = 0; c < nodes.length - 1; c++) {
    const z = (nodes[c] + nodes[c + 1]) / 2;
    const h = nodes[c + 1] - nodes[c];
    const radius = lineRadius(g, z);
    // Schelkunoff's average characteristic impedance of a monopole, with the local radius.
    const z0 = (eta / TWO_PI) * Math.max(Math.log((2 * g.length) / radius) - 1, 0.5);
    const zi = internalImpedance(radius, material.resistivity, metalMu, omega);
    skinDepth = zi.delta;
    cells.push({
      z,
      h,
      radius,
      z0,
      resistance: zi.r,
      inductance: z0 / velocity,
      internalInductance: zi.x / omega,
      capacitance: 1 / (z0 * velocity),
      current: ZERO,
      charge: ZERO,
      heat: 0,
    });
  }

  const rEnd = g.taperLength > 0 ? Math.min(g.tipRadius, g.radius) : g.radius;
  // Capacitance of a hemispherical cap: half that of an isolated sphere.
  const endCapacitance = TWO_PI * epsilon * rEnd;
  const feedZ = complex(drive.feedResistance, drive.feedReactance);
  const sourceVoltage = polar(drive.voltage, (drive.phaseDeg * Math.PI) / 180);

  // Radiation loss enters the line as a uniform series resistance, iterated until the power it
  // absorbs matches the power the current distribution actually radiates.
  let radiationR = 0;
  let line!: LineState;
  let ff!: FarField;
  let change = 1;
  let iterations = 0;
  for (let it = 1; it <= 30; it++) {
    iterations = it;
    line = solveLine(
      cells,
      radiationR,
      omega,
      endCapacitance,
      feedZ,
      drive.baseCapacitance,
      sourceVoltage,
    );
    setCellCurrents(cells, line.current, omega);
    ff = farField(cells, k, eta);
    const pFar = radiatedPower(ff);
    const sumI2 = cells.reduce((s, c) => s + 0.5 * abs2(c.current) * c.h, 0);
    const target = sumI2 > 0 ? pFar / sumI2 : 0;
    const next = it === 1 ? target : 0.5 * radiationR + 0.5 * target;
    change = Math.abs(next - radiationR) / Math.max(next, 1e-300);
    radiationR = next;
    if (change < 1e-6) break;
  }
  line = solveLine(
    cells,
    radiationR,
    omega,
    endCapacitance,
    feedZ,
    drive.baseCapacitance,
    sourceVoltage,
  );
  setCellCurrents(cells, line.current, omega);
  ff = farField(cells, k, eta);

  let ohmic = 0;
  for (const c of cells) {
    c.heat = 0.5 * abs2(c.current) * c.resistance;
    ohmic += c.heat * c.h;
  }
  const radiated = radiatedPower(ff);
  const iBase2 = abs2(line.current[0]);
  const input = 0.5 * mul(line.voltage[0], conj(line.current[0])).re;
  const source = 0.5 * mul(sourceVoltage, conj(line.sourceCurrent)).re;
  const feed = 0.5 * abs2(line.sourceCurrent) * drive.feedResistance;

  // Gauss's law at the surface of a thin wire: E = λ / (2πε·a), plus the cap's own charge.
  let peakSurfaceField = { value: 0, z: 0 };
  for (const c of cells) {
    const e = abs(c.charge) / c.h / (TWO_PI * epsilon * c.radius);
    if (e > peakSurfaceField.value) peakSurfaceField = { value: e, z: c.z };
  }
  const capField = abs(line.tipCharge) / (TWO_PI * rEnd * rEnd * epsilon);
  if (capField > peakSurfaceField.value) peakSurfaceField = { value: capField, z: g.length };

  const thermal = options.skipThermal
    ? { nodes, temperature: nodes.map(() => medium.ambientTemperature), maxTemperature: 0 }
    : solveTemperature(nodes, cells, material, medium.ambientTemperature, rEnd);

  return {
    params,
    omega,
    k,
    wavelength,
    eta,
    epsilon,
    mu,
    nodes,
    voltage: line.voltage,
    current: line.current,
    cells,
    tipCharge: line.tipCharge,
    endCapacitance,
    sourceVoltage,
    sourceCurrent: line.sourceCurrent,
    inputImpedance: line.inputImpedance,
    sourceImpedance: div(sourceVoltage, line.sourceCurrent),
    radiationResistancePerMeter: radiationR,
    radiationResistance: iBase2 > 0 ? (2 * radiated) / iBase2 : 0,
    lossResistance: iBase2 > 0 ? (2 * ohmic) / iBase2 : 0,
    power: { source, feed, input, radiated, ohmic },
    efficiency: radiated + ohmic > 0 ? radiated / (radiated + ohmic) : 0,
    skinDepth,
    peakSurfaceField,
    farField: ff,
    thermal,
    convergence: { iterations, change },
  };
}

/** Cell-center currents and, from continuity (jωQ = −ΔI), the charge on each cell. */
function setCellCurrents(cells: Cell[], current: Complex[], omega: number): void {
  for (let c = 0; c < cells.length; c++) {
    const a = current[c];
    const b = current[c + 1];
    cells[c].current = scale(add(a, b), 0.5);
    // Q = −(I_{c+1} − I_c)/(jω) = j(I_{c+1} − I_c)/ω
    const dI = { re: b.re - a.re, im: b.im - a.im };
    cells[c].charge = { re: -dI.im / omega, im: dI.re / omega };
  }
}

export interface SweepPoint {
  frequency: number;
  inputImpedance: Complex;
  radiated: number;
  ohmic: number;
  baseCurrent: number;
}

/** Input impedance and powers over a log-spaced frequency range, other parameters fixed. */
export function sweep(params: NeedleParams, fMin: number, fMax: number, n: number): SweepPoint[] {
  const out: SweepPoint[] = [];
  for (let s = 0; s < n; s++) {
    const frequency = n > 1 ? fMin * Math.pow(fMax / fMin, s / (n - 1)) : fMin;
    const sol = solve(
      { ...params, drive: { ...params.drive, frequency } },
      { baseCells: 60, skipThermal: true },
    );
    out.push({
      frequency,
      inputImpedance: sol.inputImpedance,
      radiated: sol.power.radiated,
      ohmic: sol.power.ohmic,
      baseCurrent: abs(sol.current[0]),
    });
  }
  return out;
}
