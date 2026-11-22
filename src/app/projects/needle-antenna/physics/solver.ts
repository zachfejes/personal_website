import { Complex, ZERO, abs, abs2, add, complex, conj, div, mul, polar, scale } from './complex';
import { Profile, capArea, profile, radiusAt } from './geometry';
import { NeedleGeometry, NeedleParams } from './model';
import { ThermalProfile, solveTemperature } from './thermal';

export const MU0 = 1.25663706212e-6;
export const EPS0 = 8.8541878128e-12;
export const C0 = 1 / Math.sqrt(MU0 * EPS0);
const TWO_PI = 2 * Math.PI;
/** Largest |γ|·h per integration step. */
const MAX_PHASE_STEP = 0.15;
/** Two-point Gauss–Legendre nodes on [0, 1]. */
const GAUSS = [0.5 - 0.5 / Math.sqrt(3), 0.5 + 0.5 / Math.sqrt(3)] as const;

/** Radius of the needle at height z above its base, 0 outside it. */
export const needleRadius = (g: NeedleGeometry, z: number) => radiusAt(profile(g), z);

/**
 * Nodes along the needle, from the base to where the cone meets the cap. Uniform in the shaft
 * (fine enough for the wavelength) and graded geometrically down the cone so steps near the
 * apex are comparable to the tip radius. The line equations are integrated continuously between
 * nodes; the nodes only set where results are stored and how the quadrature is split.
 */
export function buildMesh(p: Profile, wavelength: number, baseCells = 160): number[] {
  const h0 = Math.min(p.length / baseCells, wavelength / 40);
  const nodes: number[] = [0];
  const nShaft = Math.max(1, Math.ceil(p.coneStart / h0));
  for (let i = 1; i <= nShaft; i++) nodes.push((p.coneStart * i) / nShaft);
  const cone = p.capStart - p.coneStart;
  if (cone > 0) {
    const hMin = Math.max(Math.min(p.capRadius, h0), p.length * 1e-7);
    const sizes: number[] = [];
    let total = 0;
    let s = hMin;
    while (total < cone) {
      sizes.push(s);
      total += s;
      s = Math.min(s * 1.25, h0);
    }
    const fit = cone / total;
    let z = p.coneStart;
    for (let i = sizes.length - 1; i >= 0; i--) {
      z += sizes[i] * fit;
      nodes.push(i === 0 ? p.capStart : z);
    }
  }
  return nodes;
}

/** Distributed parameters of the line at one point, per meter of needle. */
export interface LineCoefficients {
  /** Characteristic impedance of the arm against the dipole's midplane (Ω). */
  z0: number;
  /** Ohmic resistance with skin effect (Ω/m). */
  resistance: number;
  /** External inductance (H/m). */
  inductance: number;
  /** Internal (in-metal) inductance (H/m). */
  internalInductance: number;
  /** Capacitance (F/m). */
  capacitance: number;
}

/** A quadrature point along the needle, carrying the continuous solution there. */
export interface LineSample {
  /** Height above the base (m). */
  z: number;
  /** Quadrature weight: the length of needle this point stands for (m). */
  w: number;
  radius: number;
  /** Current phasor (A, peak). */
  current: Complex;
  /** Charge per meter, λ = C′V (C/m, peak). */
  lineCharge: Complex;
  /** Ohmic resistance per meter (Ω/m). */
  resistance: number;
  /** Time-averaged Joule heat per meter, ½|I|²R′ (W/m). */
  heat: number;
}

export interface FarField {
  /** Polar angles from the needle axis, 0 to π/2; the pattern mirrors across the midplane. */
  theta: number[];
  /** Radiation intensity U(θ) (W/sr). */
  intensity: number[];
  /** Peak directivity over an isotropic radiator. */
  directivity: number;
}

export interface Solution {
  params: NeedleParams;
  profile: Profile;
  omega: number;
  /** Wavenumber in the medium (rad/m). */
  k: number;
  wavelength: number;
  /** Wave impedance of the medium (Ω). */
  eta: number;
  epsilon: number;
  mu: number;
  /** Node heights from the base (0) to where the cap begins. */
  nodes: number[];
  /** Potential of the needle relative to the dipole's midplane at each node (V, peak). */
  voltage: Complex[];
  /** Current up the needle at each node (A, peak). */
  current: Complex[];
  /** The continuous solution at quadrature points along the needle. */
  samples: LineSample[];
  /** Line parameters of the shaft. */
  shaft: LineCoefficients;
  /** Charge on the apex cap (C, peak), centered on the cap's sphere. */
  tipCharge: Complex;
  /** Capacitance of the apex cap (F). */
  capCapacitance: number;
  /** Source phasor V̂·e^{jφ}. */
  sourceVoltage: Complex;
  /** Voltage across the feed gap, between the needle and its mirror (V, peak). */
  gapVoltage: Complex;
  /** Current drawn from the source (A, peak). */
  sourceCurrent: Complex;
  /** Impedance across the dipole's feed gap (Ω). */
  inputImpedance: Complex;
  /** Impedance the ideal source sees, feed network included (Ω). */
  sourceImpedance: Complex;
  /** Equivalent series radiation resistance spread along each arm (Ω/m). */
  radiationResistancePerMeter: number;
  /** Radiation resistance referred to the feed current (Ω). */
  radiationResistance: number;
  /** Ohmic loss resistance of both arms, referred to the feed current (Ω). */
  lossResistance: number;
  power: {
    /** Delivered by the ideal source (W). */
    source: number;
    /** Dissipated in the feed resistance (W). */
    feed: number;
    /** Delivered into the feed gap (W). */
    input: number;
    /** Radiated into all space (W). */
    radiated: number;
    /** Joule heat in both arms (W). */
    ohmic: number;
    /** Joule heat in the needle alone (W): half of ohmic. */
    ohmicPerNeedle: number;
  };
  /** Radiated ÷ (radiated + ohmic). */
  efficiency: number;
  skinDepth: number;
  /** Largest surface electric field amplitude on the needle (V/m), and its height. */
  peakSurfaceField: { value: number; z: number };
  farField: FarField;
  thermal: ThermalProfile;
  /** How many radiation-loss iterations ran, and the final relative change. */
  convergence: { iterations: number; change: number };
}

interface Context {
  omega: number;
  velocity: number;
  eta: number;
  length: number;
  resistivity: number;
  metalMu: number;
}

/** Skin depth in the metal (m). */
const skinDepthOf = (ctx: Context) => Math.sqrt((2 * ctx.resistivity) / (ctx.omega * ctx.metalMu));

/**
 * Line parameters at a given radius. The external part is Schelkunoff's average characteristic
 * impedance of a thin dipole arm, Z₀ = (η/2π)(ln(2L/a) − 1), taken with the local radius. The
 * internal part blends the DC and thin-skin limits of a round wire's internal impedance.
 */
function coefficients(ctx: Context, a: number): LineCoefficients {
  const z0 = (ctx.eta / TWO_PI) * Math.max(Math.log((2 * ctx.length) / a) - 1, 0.5);
  const rDc = ctx.resistivity / (Math.PI * a * a);
  const x = a / skinDepthOf(ctx);
  const blend = Math.pow(1 + Math.pow(x / 2, 4), 0.25);
  return {
    z0,
    resistance: rDc * blend,
    inductance: z0 / ctx.velocity,
    internalInductance: (rDc * x * x) / 4 / blend / ctx.omega,
    capacitance: 1 / (z0 * ctx.velocity),
  };
}

/** Series impedance and shunt admittance per meter, before the radiation term. */
interface ZY {
  r: number;
  x: number;
  y: number;
}

const zyOf = (ctx: Context, c: LineCoefficients): ZY => ({
  r: c.resistance,
  x: ctx.omega * (c.inductance + c.internalInductance),
  y: ctx.omega * c.capacitance,
});

/** One RK4 step of the line, with the coefficients at its start, middle and end. */
interface Step {
  h: number;
  start: ZY;
  mid: ZY;
  end: ZY;
}

/**
 * Prepares the integration steps for every interval between nodes, walking down from the
 * apex: each interval is split so that |γ|·h stays small, and the coefficients are evaluated
 * from the exact profile radius at every RK4 stage, so the taper enters continuously.
 */
function planSteps(ctx: Context, p: Profile, nodes: number[]): Step[][] {
  const plan: Step[][] = [];
  const at = (z: number) => zyOf(ctx, coefficients(ctx, Math.max(radiusAt(p, z), 1e-12)));
  for (let n = 0; n < nodes.length - 1; n++) {
    const z0 = nodes[n];
    const z1 = nodes[n + 1];
    const mid = at((z0 + z1) / 2);
    const gamma = Math.sqrt(Math.hypot(mid.r, mid.x) * mid.y);
    const count = Math.max(1, Math.ceil((gamma * (z1 - z0)) / MAX_PHASE_STEP));
    const h = (z1 - z0) / count;
    const steps: Step[] = [];
    // Integrated from z1 downward.
    for (let s = 0; s < count; s++) {
      const top = z1 - s * h;
      steps.push({ h, start: at(top), mid: at(top - h / 2), end: at(top - h) });
    }
    plan.push(steps);
  }
  return plan;
}

interface LineState {
  voltage: Complex[];
  current: Complex[];
  sourceCurrent: Complex;
  gapVoltage: Complex;
  tipCharge: Complex;
}

/**
 * Integrates the telegrapher's equations dV/dz = −Z′(z)·I, dI/dz = −Y′(z)·V from the cap back
 * to the base (RK4 with continuous coefficients), then scales the result to the source: the gap
 * voltage is twice the arm's potential at its base, the base current flows through the gap.
 */
function solveLine(
  plan: Step[][],
  radiationR: number,
  omega: number,
  capCapacitance: number,
  feedZ: Complex,
  baseCapacitance: number,
  sourceVoltage: Complex,
): LineState {
  const n = plan.length;
  const v = new Array<Complex>(n + 1);
  const i = new Array<Complex>(n + 1);
  v[n] = complex(1);
  i[n] = complex(0, omega * capCapacitance);
  // Derivatives with respect to z of (V, I) at coefficients c.
  const dv = (c: ZY, cur: Complex): Complex => mul(complex(-(c.r + radiationR), -c.x), cur);
  const di = (c: ZY, vol: Complex): Complex => mul(complex(0, -c.y), vol);
  for (let k = n - 1; k >= 0; k--) {
    let V = v[k + 1];
    let I = i[k + 1];
    for (const st of plan[k]) {
      const h = -st.h;
      const k1v = dv(st.start, I);
      const k1i = di(st.start, V);
      const V2 = add(V, scale(k1v, h / 2));
      const I2 = add(I, scale(k1i, h / 2));
      const k2v = dv(st.mid, I2);
      const k2i = di(st.mid, V2);
      const V3 = add(V, scale(k2v, h / 2));
      const I3 = add(I, scale(k2i, h / 2));
      const k3v = dv(st.mid, I3);
      const k3i = di(st.mid, V3);
      const V4 = add(V, scale(k3v, h));
      const I4 = add(I, scale(k3i, h));
      const k4v = dv(st.end, I4);
      const k4i = di(st.end, V4);
      V = add(V, scale(add(add(k1v, scale(add(k2v, k3v), 2)), k4v), h / 6));
      I = add(I, scale(add(add(k1i, scale(add(k2i, k3i), 2)), k4i), h / 6));
    }
    v[k] = V;
    i[k] = I;
  }
  const gapUnit = scale(v[0], 2);
  const srcCurrentUnit = add(i[0], mul(complex(0, omega * baseCapacitance), gapUnit));
  const s = div(sourceVoltage, add(gapUnit, mul(feedZ, srcCurrentUnit)));
  for (let k = 0; k <= n; k++) {
    v[k] = mul(v[k], s);
    i[k] = mul(i[k], s);
  }
  return {
    voltage: v,
    current: i,
    sourceCurrent: mul(srcCurrentUnit, s),
    gapVoltage: mul(gapUnit, s),
    tipCharge: scale(v[n], capCapacitance),
  };
}

/** Cubic Hermite interpolation of a complex function on [0, 1], given ends and slopes·h. */
function hermite(f0: Complex, f1: Complex, d0: Complex, d1: Complex, t: number): Complex {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return {
    re: h00 * f0.re + h10 * d0.re + h01 * f1.re + h11 * d1.re,
    im: h00 * f0.im + h10 * d0.im + h01 * f1.im + h11 * d1.im,
  };
}

/**
 * The continuous solution at Gauss points: V and I interpolated between nodes with cubic
 * Hermite polynomials whose slopes come from the line equations themselves, then the charge
 * density λ = C′V (continuity: jωλ = −dI/dz) and the heat ½|I|²R′ from the local radius.
 */
function sampleLine(
  ctx: Context,
  p: Profile,
  nodes: number[],
  line: LineState,
  radiationR: number,
): LineSample[] {
  const samples: LineSample[] = [];
  const coefficientsAt = nodes.map((z) => coefficients(ctx, radiusAt(p, z)));
  const slopes = nodes.map((_, k) => {
    const c = coefficientsAt[k];
    const zs = complex(
      c.resistance + radiationR,
      ctx.omega * (c.inductance + c.internalInductance),
    );
    return {
      v: mul(scale(zs, -1), line.current[k]),
      i: mul(complex(0, -ctx.omega * c.capacitance), line.voltage[k]),
    };
  });
  for (let k = 0; k < nodes.length - 1; k++) {
    const h = nodes[k + 1] - nodes[k];
    for (const t of GAUSS) {
      const z = nodes[k] + t * h;
      const a = radiusAt(p, z);
      const c = coefficients(ctx, a);
      const V = hermite(
        line.voltage[k],
        line.voltage[k + 1],
        scale(slopes[k].v, h),
        scale(slopes[k + 1].v, h),
        t,
      );
      const I = hermite(
        line.current[k],
        line.current[k + 1],
        scale(slopes[k].i, h),
        scale(slopes[k + 1].i, h),
        t,
      );
      samples.push({
        z,
        w: h / 2,
        radius: a,
        current: I,
        lineCharge: scale(V, c.capacitance),
        resistance: c.resistance,
        heat: 0.5 * abs2(I) * c.resistance,
      });
    }
  }
  return samples;
}

/**
 * Far field of the dipole (the needle and its mirror), from the current along the needle.
 * The pattern is symmetric about the midplane, so only 0 ≤ θ ≤ π/2 is sampled.
 */
export function farField(samples: LineSample[], k: number, eta: number, count = 90): FarField {
  const theta: number[] = [];
  const intensity: number[] = [];
  let half = 0;
  const dTheta = Math.PI / 2 / count;
  for (let s = 0; s < count; s++) {
    const t = (s + 0.5) * dTheta;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    let fr = 0;
    let fi = 0;
    for (const p of samples) {
      // Needle and mirror together: 2·cos(k z cos θ) per element.
      const f = 2 * p.w * Math.cos(k * p.z * cosT);
      fr += p.current.re * f;
      fi += p.current.im * f;
    }
    const u = ((eta * k * k) / (32 * Math.PI * Math.PI)) * (fr * fr + fi * fi) * sinT * sinT;
    theta.push(t);
    intensity.push(u);
    half += u * TWO_PI * sinT * dTheta;
  }
  const uMax = Math.max(...intensity);
  return { theta, intensity, directivity: half > 0 ? (4 * Math.PI * uMax) / (2 * half) : 0 };
}

/** Power radiated into all space (both hemispheres). */
const radiatedPower = (ff: FarField) =>
  2 *
  ff.intensity.reduce(
    (sum, u, s) => sum + u * TWO_PI * Math.sin(ff.theta[s]) * (Math.PI / 2 / ff.theta.length),
    0,
  );

export interface SolveOptions {
  /** Shaft intervals (the point adds more). */
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
  const ctx: Context = {
    omega,
    velocity,
    eta,
    length: g.length,
    resistivity: material.resistivity,
    metalMu: MU0 * material.relPermeability,
  };
  const p = profile(g);
  const nodes = buildMesh(p, wavelength, options.baseCells);
  const plan = planSteps(ctx, p, nodes);

  // The cap (a spherical zone) as a lumped load: its share of an isolated sphere's 4πεr.
  const capCapacitance = 4 * Math.PI * epsilon * p.capRadius * ((1 - Math.sin(p.halfAngle)) / 2);
  const feedZ = complex(drive.feedResistance, drive.feedReactance);
  const sourceVoltage = polar(drive.voltage, (drive.phaseDeg * Math.PI) / 180);
  const run = (radiationR: number) =>
    solveLine(plan, radiationR, omega, capCapacitance, feedZ, drive.baseCapacitance, sourceVoltage);

  // Radiation loss enters each arm as a uniform series resistance, iterated until the power it
  // absorbs matches the power the current distribution actually radiates.
  let radiationR = 0;
  let change = 1;
  let iterations = 0;
  for (let it = 1; it <= 30; it++) {
    iterations = it;
    const line = run(radiationR);
    const samples = sampleLine(ctx, p, nodes, line, radiationR);
    const pFar = radiatedPower(farField(samples, k, eta));
    // Both arms absorb ½|I|²R′ per meter.
    const sumI2 = samples.reduce((s, q) => s + abs2(q.current) * q.w, 0);
    const target = sumI2 > 0 ? pFar / sumI2 : 0;
    const next = it === 1 ? target : 0.5 * radiationR + 0.5 * target;
    change = Math.abs(next - radiationR) / Math.max(next, 1e-300);
    radiationR = next;
    if (change < 1e-6) break;
  }
  const line = run(radiationR);
  const samples = sampleLine(ctx, p, nodes, line, radiationR);
  const ff = farField(samples, k, eta);

  const ohmicPerNeedle = samples.reduce((s, q) => s + q.heat * q.w, 0);
  const ohmic = 2 * ohmicPerNeedle;
  const radiated = radiatedPower(ff);
  const iBase2 = abs2(line.current[0]);
  const input = 0.5 * mul(line.gapVoltage, conj(line.current[0])).re;
  const source = 0.5 * mul(sourceVoltage, conj(line.sourceCurrent)).re;
  const feed = 0.5 * abs2(line.sourceCurrent) * drive.feedResistance;

  // Gauss's law at the surface of a thin wire, E = λ/(2πε·a), and on the cap, E = σ/ε.
  let peakSurfaceField = { value: 0, z: 0 };
  for (const q of samples) {
    const e = abs(q.lineCharge) / (TWO_PI * epsilon * q.radius);
    if (e > peakSurfaceField.value) peakSurfaceField = { value: e, z: q.z };
  }
  const capField = abs(line.tipCharge) / capArea(p) / epsilon;
  if (capField > peakSurfaceField.value) peakSurfaceField = { value: capField, z: g.length };

  const thermal = options.skipThermal
    ? {
        nodes,
        temperature: nodes.map(() => medium.ambientTemperature),
        maxTemperature: medium.ambientTemperature,
      }
    : solveThermal(p, nodes, samples, params);

  return {
    params,
    profile: p,
    omega,
    k,
    wavelength,
    eta,
    epsilon,
    mu,
    nodes,
    voltage: line.voltage,
    current: line.current,
    samples,
    shaft: coefficients(ctx, g.radius),
    tipCharge: line.tipCharge,
    capCapacitance,
    sourceVoltage,
    gapVoltage: line.gapVoltage,
    sourceCurrent: line.sourceCurrent,
    inputImpedance: div(line.gapVoltage, line.current[0]),
    sourceImpedance: div(sourceVoltage, line.sourceCurrent),
    radiationResistancePerMeter: radiationR,
    radiationResistance: iBase2 > 0 ? (2 * radiated) / iBase2 : 0,
    lossResistance: iBase2 > 0 ? (2 * ohmic) / iBase2 : 0,
    power: { source, feed, input, radiated, ohmic, ohmicPerNeedle },
    efficiency: radiated + ohmic > 0 ? radiated / (radiated + ohmic) : 0,
    skinDepth: skinDepthOf(ctx),
    peakSurfaceField,
    farField: ff,
    thermal,
    convergence: { iterations, change },
  };
}

/** Builds the thermal problem from the exact profile: conductances, heat and radiating area. */
function solveThermal(
  p: Profile,
  nodes: number[],
  samples: LineSample[],
  params: NeedleParams,
): ThermalProfile {
  const { material, medium } = params;
  const intervals = nodes.slice(0, -1).map((z0, k) => {
    const z1 = nodes[k + 1];
    const h = z1 - z0;
    const a0 = radiusAt(p, z0);
    const a1 = radiusAt(p, z1);
    const heat =
      samples[2 * k].heat * samples[2 * k].w + samples[2 * k + 1].heat * samples[2 * k + 1].w;
    return {
      // Exact for a linear radius: ∫dz/(kπa²) = h/(kπ·a₀a₁).
      conductance: (material.thermalConductivity * Math.PI * a0 * a1) / h,
      heat,
      // Lateral area of a conical frustum.
      area: Math.PI * (a0 + a1) * Math.hypot(h, a0 - a1),
    };
  });
  return solveTemperature({
    nodes,
    intervals,
    endArea: capArea(p),
    emissivity: material.emissivity,
    ambient: medium.ambientTemperature,
    clampBase: medium.feedHeatSunk,
  });
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

/** Total charge on the needle (line plus cap); balances the charge the gap current delivers. */
export function needleCharge(sol: Solution): Complex {
  return add(
    sol.samples.reduce<Complex>((q, s) => add(q, scale(s.lineCharge, s.w)), ZERO),
    sol.tipCharge,
  );
}
