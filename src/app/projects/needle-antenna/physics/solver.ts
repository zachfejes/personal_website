import { Complex, ZERO, abs, abs2, add, complex, conj, div, mul, polar, scale } from './complex';
import { Profile, capArea, profile, radiusAt } from './geometry';
import { ArmShape, NeedleParams, armShapes } from './model';
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

/** A quadrature point along an arm, carrying the continuous solution there. */
export interface LineSample {
  /** Height above the gap (m): positive on the needle, negative on the other arm. */
  z: number;
  /** Quadrature weight: the length of wire this point stands for (m). */
  w: number;
  radius: number;
  /** Current phasor along +z (A, peak); continuous through the gap. */
  current: Complex;
  /** Charge per meter, λ = C′V (C/m, peak). */
  lineCharge: Complex;
  /** Ohmic resistance per meter (Ω/m). */
  resistance: number;
  /** Time-averaged Joule heat per meter, ½|I|²R′ (W/m). */
  heat: number;
}

/** The solution on one arm of the dipole. */
export interface Arm {
  /** +1 for the needle (pointing up from the gap), −1 for the other arm (pointing down). */
  direction: 1 | -1;
  geometry: ArmShape;
  profile: Profile;
  /** Distances from the gap (m), from the gap out to where the end cap begins. */
  nodes: number[];
  /** The same points as heights: direction × distance. */
  z: number[];
  /** Potential at each node (V, peak). */
  voltage: Complex[];
  /** Current along +z at each node (A, peak). */
  current: Complex[];
  samples: LineSample[];
  /** Charge on the end cap (C, peak), centered on the cap's sphere. */
  tipCharge: Complex;
  /** Capacitance of the end cap (F). */
  capCapacitance: number;
  /** Impedance looking into this arm from the gap (Ω); the arms add in series. */
  impedance: Complex;
  /** Joule heat in this arm (W). */
  ohmic: number;
  thermal: ThermalProfile;
}

export interface FarField {
  /** Polar angles from the +z axis, 0 to π (rad). */
  theta: number[];
  /** Radiation intensity U(θ) (W/sr). */
  intensity: number[];
  /** Peak directivity over an isotropic radiator. */
  directivity: number;
}

export interface Solution {
  params: NeedleParams;
  /** The needle's own profile (arm 0). */
  profile: Profile;
  omega: number;
  /** Wavenumber in the medium (rad/m). */
  k: number;
  wavelength: number;
  /** Wave impedance of the medium (Ω). */
  eta: number;
  epsilon: number;
  mu: number;
  /** [the needle, the other arm]. */
  arms: [Arm, Arm];
  /** Whether both arms are the same shape, so the fields mirror across the gap. */
  symmetric: boolean;
  /** Line parameters of the shaft (both arms share it). */
  shaft: LineCoefficients;
  /** Source phasor V̂·e^{jφ}. */
  sourceVoltage: Complex;
  /** Voltage across the feed gap, needle minus other arm (V, peak). */
  gapVoltage: Complex;
  /** Current through the gap, up into the needle (A, peak). */
  gapCurrent: Complex;
  /** Current drawn from the source (A, peak). */
  sourceCurrent: Complex;
  /** Impedance across the dipole's feed gap (Ω). */
  inputImpedance: Complex;
  /** Impedance the ideal source sees, feed network included (Ω). */
  sourceImpedance: Complex;
  /** Equivalent series radiation resistance spread along both arms (Ω/m). */
  radiationResistancePerMeter: number;
  /** Radiation resistance referred to the gap current (Ω). */
  radiationResistance: number;
  /** Ohmic loss resistance of both arms, referred to the gap current (Ω). */
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
  };
  /** Radiated ÷ (radiated + ohmic). */
  efficiency: number;
  skinDepth: number;
  /** Largest surface electric field amplitude anywhere on the antenna (V/m), and its height. */
  peakSurfaceField: { value: number; z: number };
  farField: FarField;
  /** How many radiation-loss iterations ran, and the final relative change. */
  convergence: { iterations: number; change: number };
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
 * impedance of a thin dipole arm, Z₀ = (η/2π)(ln(2L/a) − 1), with L half the dipole's total
 * length (shared by both arms, wherever the feed is) and a the local radius. The
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

/** One arm's line, set up once per solve. */
interface ArmPlan {
  direction: 1 | -1;
  geometry: ArmShape;
  profile: Profile;
  nodes: number[];
  steps: Step[][];
  capCapacitance: number;
}

/** Voltage and current along an arm, normalized to 1 A flowing out of the gap into it. */
interface UnitLine {
  voltage: Complex[];
  /** Current flowing away from the gap. */
  current: Complex[];
}

/**
 * Integrates the telegrapher's equations dV/ds = −Z′(s)·I, dI/ds = −Y′(s)·V along one arm
 * (s = distance from the gap) from its end cap back to the gap, by RK4 with coefficients from
 * the exact radius at every stage, then normalizes to unit current leaving the gap. V(0) is
 * then the arm's impedance.
 */
function solveArm(plan: ArmPlan, radiationR: number, omega: number): UnitLine {
  const n = plan.steps.length;
  const v = new Array<Complex>(n + 1);
  const i = new Array<Complex>(n + 1);
  v[n] = complex(1);
  i[n] = complex(0, omega * plan.capCapacitance);
  const dv = (c: ZY, cur: Complex): Complex => mul(complex(-(c.r + radiationR), -c.x), cur);
  const di = (c: ZY, vol: Complex): Complex => mul(complex(0, -c.y), vol);
  for (let k = n - 1; k >= 0; k--) {
    let V = v[k + 1];
    let I = i[k + 1];
    for (const st of plan.steps[k]) {
      const h = -st.h;
      const k1v = dv(st.start, I);
      const k1i = di(st.start, V);
      const k2v = dv(st.mid, add(I, scale(k1i, h / 2)));
      const k2i = di(st.mid, add(V, scale(k1v, h / 2)));
      const k3v = dv(st.mid, add(I, scale(k2i, h / 2)));
      const k3i = di(st.mid, add(V, scale(k2v, h / 2)));
      const k4v = dv(st.end, add(I, scale(k3i, h)));
      const k4i = di(st.end, add(V, scale(k3v, h)));
      V = add(V, scale(add(add(k1v, scale(add(k2v, k3v), 2)), k4v), h / 6));
      I = add(I, scale(add(add(k1i, scale(add(k2i, k3i), 2)), k4i), h / 6));
    }
    v[k] = V;
    i[k] = I;
  }
  const norm = div(complex(1), i[0]);
  return { voltage: v.map((x) => mul(x, norm)), current: i.map((x) => mul(x, norm)) };
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
 * The continuous solution on one arm at Gauss points: V and I interpolated between nodes with
 * cubic Hermite polynomials whose slopes come from the line equations themselves, then the
 * charge density λ = C′V (continuity: jωλ = −dI/ds) and the heat ½|I|²R′ from the local radius.
 * Voltage and outward current are the actual values; samples report current along +z.
 */
function sampleArm(
  ctx: Context,
  plan: ArmPlan,
  voltage: Complex[],
  outward: Complex[],
  radiationR: number,
): LineSample[] {
  const { nodes, profile: p, direction } = plan;
  const samples: LineSample[] = [];
  const slopes = nodes.map((s, k) => {
    const c = coefficients(ctx, radiusAt(p, s));
    const zs = complex(
      c.resistance + radiationR,
      ctx.omega * (c.inductance + c.internalInductance),
    );
    return {
      v: mul(scale(zs, -1), outward[k]),
      i: mul(complex(0, -ctx.omega * c.capacitance), voltage[k]),
    };
  });
  for (let k = 0; k < nodes.length - 1; k++) {
    const h = nodes[k + 1] - nodes[k];
    for (const t of GAUSS) {
      const s = nodes[k] + t * h;
      const a = radiusAt(p, s);
      const c = coefficients(ctx, a);
      const V = hermite(
        voltage[k],
        voltage[k + 1],
        scale(slopes[k].v, h),
        scale(slopes[k + 1].v, h),
        t,
      );
      const I = hermite(
        outward[k],
        outward[k + 1],
        scale(slopes[k].i, h),
        scale(slopes[k + 1].i, h),
        t,
      );
      samples.push({
        z: direction * s,
        w: h / 2,
        radius: a,
        current: scale(I, direction),
        lineCharge: scale(V, c.capacitance),
        resistance: c.resistance,
        heat: 0.5 * abs2(I) * c.resistance,
      });
    }
  }
  return samples;
}

/** Far field of both arms over the full sphere, from the current along +z. */
export function farField(samples: LineSample[], k: number, eta: number, count = 180): FarField {
  const theta: number[] = [];
  const intensity: number[] = [];
  let power = 0;
  const dTheta = Math.PI / count;
  for (let s = 0; s < count; s++) {
    const t = (s + 0.5) * dTheta;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    let fr = 0;
    let fi = 0;
    for (const p of samples) {
      // e^{jkz cos θ} per current element.
      const ph = k * p.z * cosT;
      const c = Math.cos(ph) * p.w;
      const sn = Math.sin(ph) * p.w;
      fr += p.current.re * c - p.current.im * sn;
      fi += p.current.re * sn + p.current.im * c;
    }
    const u = ((eta * k * k) / (32 * Math.PI * Math.PI)) * (fr * fr + fi * fi) * sinT * sinT;
    theta.push(t);
    intensity.push(u);
    power += u * TWO_PI * sinT * dTheta;
  }
  const uMax = Math.max(...intensity);
  return { theta, intensity, directivity: power > 0 ? (4 * Math.PI * uMax) / power : 0 };
}

/** Power radiated into all space. */
const radiatedPower = (ff: FarField) =>
  ff.intensity.reduce(
    (sum, u, s) => sum + u * TWO_PI * Math.sin(ff.theta[s]) * (Math.PI / ff.theta.length),
    0,
  );

export interface SolveOptions {
  /** Shaft intervals per arm (a point adds more). */
  baseCells?: number;
  /** Skip the temperature profiles (e.g. for frequency sweeps). */
  skipThermal?: boolean;
  /** Far-field angles from 0 to π (default 180). */
  angles?: number;
}

/** Steady-state solution of the driven dipole. */
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
    // Schelkunoff's average impedance takes the dipole's half-length, shared by both arms.
    length: g.length / 2,
    resistivity: material.resistivity,
    metalMu: MU0 * material.relPermeability,
  };
  const shapes = armShapes(g);
  const plans = ([1, -1] as const).map((direction): ArmPlan => {
    const geometry = shapes[direction === 1 ? 0 : 1];
    const p = profile(geometry);
    const nodes = buildMesh(p, wavelength, options.baseCells);
    return {
      direction,
      geometry,
      profile: p,
      nodes,
      steps: planSteps(ctx, p, nodes),
      // The cap (a spherical zone) as a lumped load: its share of an isolated sphere's 4πεr.
      capCapacitance: 4 * Math.PI * epsilon * p.capRadius * ((1 - Math.sin(p.halfAngle)) / 2),
    };
  });
  const symmetric =
    plans[0].profile.length === plans[1].profile.length &&
    plans[0].profile.capRadius === plans[1].profile.capRadius &&
    plans[0].profile.coneStart === plans[1].profile.coneStart;
  const feedZ = complex(drive.feedResistance, drive.feedReactance);
  const sourceVoltage = polar(drive.voltage, (drive.phaseDeg * Math.PI) / 180);

  /**
   * Both arms for a given radiation resistance. The gap current I flows out of the gap into
   * the needle and back into the gap from the other arm, so the arms are in series:
   * V_gap = I·(Z_needle + Z_other). The source drives that through its feed network.
   */
  const run = (radiationR: number) => {
    const units = plans.map((pl) => solveArm(pl, radiationR, omega));
    const zArms = units.map((u) => u.voltage[0]);
    const zIn = add(zArms[0], zArms[1]);
    const unitSource = add(complex(1), mul(complex(0, omega * drive.baseCapacitance), zIn));
    const gapCurrent = div(sourceVoltage, add(zIn, mul(feedZ, unitSource)));
    const arms = plans.map((pl, a) => {
      // Outward current is +I on the needle and −I on the other arm (it flows into the gap).
      const factor = scale(gapCurrent, pl.direction);
      const voltage = units[a].voltage.map((x) => mul(x, factor));
      const outward = units[a].current.map((x) => mul(x, factor));
      return { voltage, outward, samples: sampleArm(ctx, pl, voltage, outward, radiationR) };
    });
    return { arms, zArms, zIn, gapCurrent, sourceCurrent: mul(gapCurrent, unitSource) };
  };

  // Radiation loss enters both arms as a uniform series resistance, iterated until the power
  // it absorbs matches the power the current distribution actually radiates.
  let radiationR = 0;
  let change = 1;
  let iterations = 0;
  for (let it = 1; it <= 30; it++) {
    iterations = it;
    const all = run(radiationR).arms.flatMap((a) => a.samples);
    const pFar = radiatedPower(farField(all, k, eta, options.angles));
    const sumI2 = all.reduce((s, q) => s + 0.5 * abs2(q.current) * q.w, 0);
    const target = sumI2 > 0 ? pFar / sumI2 : 0;
    const next = it === 1 ? target : 0.5 * radiationR + 0.5 * target;
    change = Math.abs(next - radiationR) / Math.max(next, 1e-300);
    radiationR = next;
    if (change < 1e-6) break;
  }
  const result = run(radiationR);
  const allSamples = result.arms.flatMap((a) => a.samples);
  const ff = farField(allSamples, k, eta, options.angles);

  const arms = plans.map((pl, a): Arm => {
    const { voltage, outward, samples } = result.arms[a];
    const ohmic = samples.reduce((s, q) => s + q.heat * q.w, 0);
    return {
      direction: pl.direction,
      geometry: pl.geometry,
      profile: pl.profile,
      nodes: pl.nodes,
      z: pl.nodes.map((s) => pl.direction * s),
      voltage,
      current: outward.map((x) => scale(x, pl.direction)),
      samples,
      tipCharge: scale(voltage[voltage.length - 1], pl.capCapacitance),
      capCapacitance: pl.capCapacitance,
      impedance: result.zArms[a],
      ohmic,
      thermal: options.skipThermal
        ? {
            nodes: pl.nodes,
            temperature: pl.nodes.map(() => medium.ambientTemperature),
            maxTemperature: medium.ambientTemperature,
          }
        : solveThermal(pl.profile, pl.nodes, samples, params),
    };
  }) as [Arm, Arm];

  const ohmic = arms[0].ohmic + arms[1].ohmic;
  const radiated = radiatedPower(ff);
  const gapVoltage = mul(result.gapCurrent, result.zIn);
  const i2 = abs2(result.gapCurrent);
  const input = 0.5 * mul(gapVoltage, conj(result.gapCurrent)).re;
  const source = 0.5 * mul(sourceVoltage, conj(result.sourceCurrent)).re;
  const feed = 0.5 * abs2(result.sourceCurrent) * drive.feedResistance;

  // Gauss's law at the surface of a thin wire, E = λ/(2πε·a), and on each cap, E = σ/ε.
  let peakSurfaceField = { value: 0, z: 0 };
  for (const arm of arms) {
    for (const q of arm.samples) {
      const e = abs(q.lineCharge) / (TWO_PI * epsilon * q.radius);
      if (e > peakSurfaceField.value) peakSurfaceField = { value: e, z: q.z };
    }
    const capField = abs(arm.tipCharge) / capArea(arm.profile) / epsilon;
    if (capField > peakSurfaceField.value)
      peakSurfaceField = { value: capField, z: arm.direction * arm.profile.length };
  }

  return {
    params,
    profile: arms[0].profile,
    omega,
    k,
    wavelength,
    eta,
    epsilon,
    mu,
    arms,
    symmetric,
    shaft: coefficients(ctx, g.radius),
    sourceVoltage,
    gapVoltage,
    gapCurrent: result.gapCurrent,
    sourceCurrent: result.sourceCurrent,
    inputImpedance: result.zIn,
    sourceImpedance: div(sourceVoltage, result.sourceCurrent),
    radiationResistancePerMeter: radiationR,
    radiationResistance: i2 > 0 ? (2 * radiated) / i2 : 0,
    lossResistance: i2 > 0 ? (2 * ohmic) / i2 : 0,
    power: { source, feed, input, radiated, ohmic },
    efficiency: radiated + ohmic > 0 ? radiated / (radiated + ohmic) : 0,
    skinDepth: skinDepthOf(ctx),
    peakSurfaceField,
    farField: ff,
    convergence: { iterations, change },
  };
}

/** Builds one arm's thermal problem from its exact profile: conductances, heat, areas. */
function solveThermal(
  p: Profile,
  nodes: number[],
  samples: LineSample[],
  params: NeedleParams,
): ThermalProfile {
  const { material, medium } = params;
  const intervals = nodes.slice(0, -1).map((s0, k) => {
    const h = nodes[k + 1] - s0;
    const a0 = radiusAt(p, s0);
    const a1 = radiusAt(p, nodes[k + 1]);
    const heat =
      samples[2 * k].heat * samples[2 * k].w + samples[2 * k + 1].heat * samples[2 * k + 1].w;
    return {
      // Exact for a linear radius: ∫ds/(kπa²) = h/(kπ·a₀a₁).
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
}

/** Input impedance and powers over a log-spaced frequency range, other parameters fixed. */
export function sweep(params: NeedleParams, fMin: number, fMax: number, n: number): SweepPoint[] {
  const out: SweepPoint[] = [];
  for (let s = 0; s < n; s++) {
    const frequency = n > 1 ? fMin * Math.pow(fMax / fMin, s / (n - 1)) : fMin;
    const sol = solve(
      { ...params, drive: { ...params.drive, frequency } },
      { baseCells: 60, skipThermal: true, angles: 48 },
    );
    out.push({
      frequency,
      inputImpedance: sol.inputImpedance,
      radiated: sol.power.radiated,
      ohmic: sol.power.ohmic,
    });
  }
  return out;
}

/** Total charge on one arm (line plus cap). */
export function armCharge(arm: Arm): Complex {
  return add(
    arm.samples.reduce<Complex>((q, s) => add(q, scale(s.lineCharge, s.w)), ZERO),
    arm.tipCharge,
  );
}
