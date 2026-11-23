import { abs, div } from './complex';
import { computeGrid, contourSegments, zAt } from './fields';
import { profile, radiusAt } from './geometry';
import { DEFAULT_PARAMS, NeedleParams } from './model';
import { C0, armCharge, solve, sweep } from './solver';
import { solveTemperature } from './thermal';

/** Both arms pointed: the symmetric dipole. */
const twin: NeedleParams = {
  ...DEFAULT_PARAMS,
  geometry: { ...DEFAULT_PARAMS.geometry, mirrorPointed: true },
};

const rod = (frequency: number): NeedleParams => ({
  ...DEFAULT_PARAMS,
  geometry: { ...DEFAULT_PARAMS.geometry, taperLength: 0 },
  drive: { ...DEFAULT_PARAMS.drive, frequency },
});

describe('needle geometry', () => {
  const p = profile(DEFAULT_PARAMS.geometry);
  const g = DEFAULT_PARAMS.geometry;

  it('runs shaft → cone → cap, ending at the apex', () => {
    expect(radiusAt(p, 0.01)).toBe(g.radius);
    expect(p.coneStart).toBeCloseTo(g.length - g.taperLength, 12);
    expect(p.capStart).toBeGreaterThan(p.capCenter);
    expect(radiusAt(p, g.length)).toBeLessThan(g.tipRadius / 1000);
    expect(radiusAt(p, g.length + 1e-6)).toBe(0);
  });

  it('meets the cap tangentially: radius and slope are continuous', () => {
    const eps = 1e-9;
    const z = p.capStart;
    expect(radiusAt(p, z - eps) / radiusAt(p, z + eps)).toBeCloseTo(1, 4);
    const slopeIn = (radiusAt(p, z - eps) - radiusAt(p, z - 2 * eps)) / eps;
    const slopeOut = (radiusAt(p, z + 2 * eps) - radiusAt(p, z + eps)) / eps;
    expect(slopeOut / slopeIn).toBeCloseTo(1, 2);
  });

  it('rounds a rod with no taper into a hemisphere', () => {
    const q = profile({ ...g, taperLength: 0 });
    expect(q.capRadius).toBe(g.radius);
    expect(radiusAt(q, g.length - g.radius)).toBeCloseTo(g.radius, 12);
  });
});

describe('needle solver (center-fed dipole in free space)', () => {
  it('balances power: source = radiated + Joule heat + feed loss', () => {
    const s = solve({ ...DEFAULT_PARAMS, drive: { ...DEFAULT_PARAMS.drive, feedResistance: 12 } });
    const { source, radiated, ohmic, feed, input } = s.power;
    expect((radiated + ohmic + feed) / source).toBeCloseTo(1, 3);
    expect((radiated + ohmic) / input).toBeCloseTo(1, 3);
  });

  it('conserves charge: each arm holds what the gap current delivers, and they cancel', () => {
    const s = solve(DEFAULT_PARAMS);
    const delivered = div(s.gapCurrent, { re: 0, im: s.omega });
    const [up, down] = s.arms.map(armCharge);
    const rel = (x: { re: number; im: number }) => abs(x) / abs(delivered);
    expect(rel({ re: up.re - delivered.re, im: up.im - delivered.im })).toBeLessThan(1e-3);
    expect(rel({ re: up.re + down.re, im: up.im + down.im })).toBeLessThan(1e-3);
  });

  it('puts the arms in series: Z_in = Z_needle + Z_other', () => {
    const s = solve(DEFAULT_PARAMS);
    const [a, b] = s.arms.map((arm) => arm.impedance);
    expect(
      abs({ re: a.re + b.re - s.inputImpedance.re, im: a.im + b.im - s.inputImpedance.im }),
    ).toBeLessThan(1e-9 * abs(s.inputImpedance));
    // Different ends: different arms.
    expect(abs({ re: a.re - b.re, im: a.im - b.im })).toBeGreaterThan(0.001 * abs(a));
  });

  it('reduces to the mirrored dipole when both arms are pointed', () => {
    const s = solve(twin);
    const [a, b] = s.arms.map((arm) => arm.impedance);
    expect(abs({ re: a.re - b.re, im: a.im - b.im }) / abs(a)).toBeLessThan(1e-12);
    expect(s.symmetric).toBe(true);
    // Current runs the same way up both arms; potentials are opposite.
    const [up, down] = s.arms;
    const k = 10;
    expect(
      abs({ re: up.current[k].re - down.current[k].re, im: up.current[k].im - down.current[k].im }),
    ).toBeLessThan(1e-9 * abs(up.current[k]));
    expect(
      abs({ re: up.voltage[k].re + down.voltage[k].re, im: up.voltage[k].im + down.voltage[k].im }),
    ).toBeLessThan(1e-9 * abs(up.voltage[k]));
  });

  it('concentrates the field at the point, not at the rounded end', () => {
    const s = solve(DEFAULT_PARAMS);
    expect(s.peakSurfaceField.z).toBeCloseTo(DEFAULT_PARAMS.geometry.length, 6);
  });

  it('matches the radiation resistance of a short dipole, 20π²(ℓ/λ)² with ℓ = 2L', () => {
    const f = 50e6;
    const s = solve(rod(f));
    const l = 2 * DEFAULT_PARAMS.geometry.length;
    const theory = 20 * Math.PI ** 2 * (l / (C0 / f)) ** 2;
    expect(Math.abs(s.radiationResistance / theory - 1)).toBeLessThan(0.15);
    expect(s.inputImpedance.im).toBeLessThan(-1000);
  });

  it('resonates as a half-wave dipole a little short of λ/2, near 73 Ω', () => {
    const fq = C0 / (4 * DEFAULT_PARAMS.geometry.length);
    const pts = sweep(rod(fq), 0.8 * fq, 1.1 * fq, 80);
    const i = pts.findIndex(
      (p, k) => k > 0 && pts[k - 1].inputImpedance.im < 0 && p.inputImpedance.im >= 0,
    );
    expect(i).toBeGreaterThan(0);
    expect(pts[i].frequency / fq).toBeGreaterThan(0.9);
    expect(pts[i].frequency / fq).toBeLessThan(1);
    expect(pts[i].inputImpedance.re).toBeGreaterThan(60);
    expect(pts[i].inputImpedance.re).toBeLessThan(90);
  });

  it('forms a standing wave: only each end cap’s charging current reaches its end', () => {
    const s = solve(DEFAULT_PARAMS);
    for (const arm of s.arms) {
      const n = arm.current.length - 1;
      const capCurrent = s.omega * arm.capCapacitance * abs(arm.voltage[n]);
      expect(abs(arm.current[n]) / capCurrent).toBeCloseTo(1, 6);
      expect(abs(arm.current[n]) / abs(s.gapCurrent)).toBeLessThan(0.1);
    }
    // The point's tiny cap takes almost nothing.
    const needle = s.arms[0];
    expect(abs(needle.current[needle.current.length - 1]) / abs(s.gapCurrent)).toBeLessThan(0.01);
  });

  it('is converged in the mesh: halving the steps barely moves the input impedance', () => {
    const coarse = solve(DEFAULT_PARAMS, { baseCells: 80 }).inputImpedance;
    const fine = solve(DEFAULT_PARAMS, { baseCells: 320 }).inputImpedance;
    expect(abs({ re: coarse.re - fine.re, im: coarse.im - fine.im }) / abs(fine)).toBeLessThan(
      0.01,
    );
  });

  it('gives H ≈ I/(2πρ) close to the wire', () => {
    const s = solve(rod(1e9));
    const L = DEFAULT_PARAMS.geometry.length;
    const grid = computeGrid(s, { rhoMax: 0.03, zMin: 0, zMax: 0.045 }, 60, 90);
    const i = 3;
    const rho = ((i + 0.5) * 0.03) / 60;
    const j = Math.round(((0.045 - L / 3) / 0.045) * 90 - 0.5);
    const z = zAt(grid, j);
    const sample = s.arms[0].samples.reduce((a, b) =>
      Math.abs(b.z - z) < Math.abs(a.z - z) ? b : a,
    );
    const k = j * 60 + i;
    const h = Math.hypot(grid.hPhiRe[k], grid.hPhiIm[k]);
    expect(h / (abs(sample.current) / (2 * Math.PI * rho))).toBeCloseTo(1, 1);
  });

  it('mirrors the fields across the gap for identical arms: E_z, H_φ even and E_ρ odd', () => {
    const s = solve(twin);
    const full = computeGrid(s, { rhoMax: 0.03, zMin: -0.03, zMax: 0.03 }, 20, 20);
    const top = computeGrid(s, { rhoMax: 0.03, zMin: 0, zMax: 0.03 }, 20, 10);
    const k = 4 * 20 + 15;
    expect(full.eZRe[k]).toBeCloseTo(top.eZRe[k], 6);
    expect(full.eRhoIm[(19 - 4) * 20 + 15] / top.eRhoIm[k]).toBeCloseTo(-1, 6);
  });

  it('falls off as 1/r in the radiation zone', () => {
    const s = solve(DEFAULT_PARAMS);
    const lambda = s.wavelength;
    const grid = computeGrid(
      s,
      { rhoMax: 20 * lambda, zMin: -0.1 * lambda, zMax: 0.1 * lambda },
      200,
      4,
    );
    const e = (i: number) => Math.hypot(grid.eZRe[i], grid.eZIm[i], grid.eRhoRe[i], grid.eRhoIm[i]);
    const row = 2 * 200;
    expect((e(row + 190) * 190.5) / (e(row + 100) * 100.5)).toBeCloseTo(1, 1);
  });
});

describe('thermal solver', () => {
  const n = 50;
  const L = 0.02;
  const a = 1e-4;
  const k = 20;
  const nodes = Array.from({ length: n + 1 }, (_, i) => (L * i) / n);
  const interval = (q: number) => ({
    conductance: (k * Math.PI * a * a) / (L / n),
    heat: (q * L) / n,
    area: 2 * Math.PI * a * (L / n),
  });

  it('matches the analytic parabola with uniform heating, a cold base and no radiation', () => {
    const q = 2;
    const t = solveTemperature({
      nodes,
      intervals: nodes.slice(1).map(() => interval(q)),
      endArea: 0,
      emissivity: 0,
      ambient: 300,
      clampBase: true,
    });
    const expected = 300 + (q * L * L) / (2 * k * Math.PI * a * a);
    expect(t.maxTemperature / expected).toBeCloseTo(1, 2);
  });

  it('balances heat by radiation alone when floating', () => {
    const q = 0.5;
    const t = solveTemperature({
      nodes,
      intervals: nodes.slice(1).map(() => interval(q)),
      endArea: 0,
      emissivity: 0.5,
      ambient: 300,
      clampBase: false,
    });
    // Uniform heating, uniform surface: uniform temperature with q = εσ·2πa·(T⁴ − T₀⁴).
    const expected = Math.pow(q / (0.5 * 5.670374419e-8 * 2 * Math.PI * a) + 300 ** 4, 0.25);
    expect(t.temperature[n / 2] / expected).toBeCloseTo(1, 3);
  });
});

describe('contours', () => {
  it('traces a level through a simple ramp', () => {
    const values = new Float64Array([0, 1, 0, 1]);
    const seg = contourSegments(values, new Uint8Array(4), 2, 2, [0.5]);
    expect(seg).toEqual([1, 0.5, 1, 1.5]);
  });
});
