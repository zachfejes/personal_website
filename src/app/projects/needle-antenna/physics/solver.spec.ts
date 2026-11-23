import { abs, div } from './complex';
import { Mask, computeGrid, contourSegments, heating, xAt, yAt } from './fields';
import { layers, waterPermittivity } from './media';
import { profile, radiusAt } from './geometry';
import { DEFAULT_PARAMS, NeedleParams, VACUUM, armShapes } from './model';
import { C0, armCharge, solve, sweep, worldAt } from './solver';
import { solveTemperature } from './thermal';

/** The antenna alone in vacuum, upright. */
const FREE: NeedleParams = {
  ...DEFAULT_PARAMS,
  environment: { ...VACUUM, tiltDeg: 90 },
};

/** Both arms pointed: the symmetric dipole. */
const twin: NeedleParams = {
  ...FREE,
  geometry: { ...FREE.geometry, mirrorPointed: true },
};

const rod = (frequency: number): NeedleParams => ({
  ...FREE,
  geometry: { ...FREE.geometry, taperLength: 0 },
  drive: { ...FREE.drive, frequency },
});

describe('needle geometry', () => {
  const g = armShapes(FREE.geometry)[0];
  const p = profile(g);

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
    const s = solve({ ...FREE, drive: { ...FREE.drive, feedResistance: 12 } });
    const { source, radiated, ohmic, feed, input } = s.power;
    expect((radiated + ohmic + feed) / source).toBeCloseTo(1, 3);
    expect((radiated + ohmic) / input).toBeCloseTo(1, 3);
  });

  it('conserves charge: each arm holds what the gap current delivers, and they cancel', () => {
    const s = solve(FREE);
    const delivered = div(s.gapCurrent, { re: 0, im: s.omega });
    const [up, down] = s.arms.map(armCharge);
    const rel = (x: { re: number; im: number }) => abs(x) / abs(delivered);
    expect(rel({ re: up.re - delivered.re, im: up.im - delivered.im })).toBeLessThan(1e-3);
    expect(rel({ re: up.re + down.re, im: up.im + down.im })).toBeLessThan(1e-3);
  });

  it('puts the arms in series: Z_in = Z_needle + Z_other', () => {
    const s = solve(FREE);
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
    const s = solve(FREE);
    expect(s.peakSurfaceField[0].z).toBeCloseTo(FREE.geometry.length / 2, 6);
  });

  it('matches the radiation resistance of a short dipole, 20π²(ℓ/λ)² with ℓ = 2L', () => {
    const f = 50e6;
    const s = solve(rod(f));
    const l = FREE.geometry.length;
    const theory = 20 * Math.PI ** 2 * (l / (C0 / f)) ** 2;
    expect(Math.abs(s.radiationResistance / theory - 1)).toBeLessThan(0.15);
    expect(s.inputImpedance.im).toBeLessThan(-1000);
  });

  it('resonates as a half-wave dipole a little short of λ/2, near 73 Ω', () => {
    const fq = C0 / (2 * FREE.geometry.length);
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
    const s = solve(FREE);
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

  it('splits the wire at the feed: the arms always add up to the total length', () => {
    for (const feedPosition of [0.1, 0.5, 0.8]) {
      const s = solve({
        ...FREE,
        geometry: { ...FREE.geometry, feedPosition },
      });
      const [up, down] = s.arms.map((a) => a.profile.length);
      expect(up + down).toBeCloseTo(FREE.geometry.length, 12);
      expect(down / FREE.geometry.length).toBeCloseTo(feedPosition, 12);
    }
  });

  it('raises the input resistance off center, roughly as R_center / cos²(k·offset)', () => {
    // A resonant half-wave rod, fed at its center and λ/8 off it.
    const base = rod(1);
    const D = base.geometry.length;
    const fq = C0 / (2 * D);
    const pts = sweep(base, 0.85 * fq, 1.05 * fq, 120);
    const i = pts.findIndex(
      (q, n) => n > 0 && pts[n - 1].inputImpedance.im < 0 && q.inputImpedance.im >= 0,
    );
    const f0 = pts[i].frequency;
    const lambda = C0 / f0;
    const offset = lambda / 8;
    const at = (feedPosition: number) =>
      solve({
        ...base,
        geometry: { ...base.geometry, feedPosition },
        drive: { ...base.drive, frequency: f0 },
      }).inputImpedance.re;
    const center = at(0.5);
    const off = at(0.5 - offset / D);
    const expected = center / Math.cos((2 * Math.PI * offset) / lambda) ** 2;
    expect(off / expected).toBeGreaterThan(0.8);
    expect(off / expected).toBeLessThan(1.25);
  });

  it('conserves power and charge with the feed off center', () => {
    const s = solve({
      ...FREE,
      geometry: { ...FREE.geometry, feedPosition: 0.3 },
    });
    const { source, radiated, ohmic } = s.power;
    expect((radiated + ohmic) / source).toBeCloseTo(1, 3);
    const [up, down] = s.arms.map(armCharge);
    expect(abs({ re: up.re + down.re, im: up.im + down.im }) / abs(up)).toBeLessThan(1e-3);
  });

  it('is converged in the mesh: halving the steps barely moves the input impedance', () => {
    const coarse = solve(FREE, { baseCells: 80 }).inputImpedance;
    const fine = solve(FREE, { baseCells: 320 }).inputImpedance;
    expect(abs({ re: coarse.re - fine.re, im: coarse.im - fine.im }) / abs(fine)).toBeLessThan(
      0.01,
    );
  });

  it('gives |H| ≈ I/(2πρ) close to the wire', () => {
    const s = solve(rod(1e9));
    // A point on the needle arm, a third of the way out, and 1.75 mm to its side.
    const z = FREE.geometry.length / 6;
    const [x, y] = worldAt(s.placement, z);
    const rho = 1.75e-3;
    const grid = computeGrid(
      s,
      { x0: x + rho - 1e-5, x1: x + rho + 1e-5, y0: y - 1e-5, y1: y + 1e-5 },
      1,
      1,
    );
    const sample = s.arms[0].samples.reduce((a, b) =>
      Math.abs(b.z - z) < Math.abs(a.z - z) ? b : a,
    );
    const h = Math.hypot(grid.hRe[0], grid.hIm[0]);
    expect(h / (abs(sample.current) / (2 * Math.PI * rho))).toBeCloseTo(1, 1);
  });

  it('turns with the antenna: tilting it in vacuum only rotates the fields', () => {
    const upright = solve(FREE);
    const tilted = solve({ ...FREE, environment: { ...FREE.environment, tiltDeg: 30 } });
    // The same point relative to each antenna: 10 mm along it from the gap, 8 mm to the side.
    const at = (s: typeof upright) => {
      const [ux, uy] = s.placement.axis;
      const [x, y] = worldAt(s.placement, 10e-3);
      const px = x - uy * 8e-3;
      const py = y + ux * 8e-3;
      const g = computeGrid(
        s,
        { x0: px - 1e-6, x1: px + 1e-6, y0: py - 1e-6, y1: py + 1e-6 },
        1,
        1,
      );
      return {
        e: Math.hypot(g.exRe[0], g.exIm[0], g.eyRe[0], g.eyIm[0]),
        h: Math.hypot(g.hRe[0], g.hIm[0]),
      };
    };
    const a = at(upright);
    const b = at(tilted);
    expect(b.e / a.e).toBeCloseTo(1, 6);
    expect(b.h / a.h).toBeCloseTo(1, 6);
  });

  it('falls off as 1/r in the radiation zone', () => {
    const s = solve(FREE);
    const lambda = s.wavelength;
    const [gx, gy] = s.placement.gap;
    // Out sideways from the (upright) antenna's gap.
    const grid = computeGrid(
      s,
      { x0: gx, x1: gx + 20 * lambda, y0: gy - 0.05 * lambda, y1: gy + 0.05 * lambda },
      200,
      1,
    );
    const e = (i: number) => Math.hypot(grid.eyRe[i], grid.eyIm[i], grid.exRe[i], grid.exIm[i]);
    const r = (i: number) => xAt(grid, i) - gx;
    expect((e(190) * r(190)) / (e(100) * r(100))).toBeCloseTo(1, 1);
  });
});

describe('layered surroundings: air, oil, deep water', () => {
  const LAYERED = DEFAULT_PARAMS;

  it('gives deionized water its measured permittivity', () => {
    // About 78.7 − j10.3 at 2.4 GHz and 20 °C; static permittivity ≈ 80.2 at 20 °C.
    const w = waterPermittivity(2.4e9, 293.15);
    expect(w.re).toBeGreaterThan(77);
    expect(w.re).toBeLessThan(80);
    expect(-w.im).toBeGreaterThan(9);
    expect(-w.im).toBeLessThan(11.5);
    expect(waterPermittivity(1e6, 293.15).re).toBeCloseTo(80.2, 0);
  });

  it('stacks air, oil and water with the surface at y = 0', () => {
    const l = layers(LAYERED.environment, 2.4e9);
    expect(l.media).toEqual(['air', 'oil', 'water']);
    expect(l.interfaces).toEqual([0, -LAYERED.environment.oilThickness]);
  });

  it('puts the apex at its depth and a mesh node exactly on each surface it crosses', () => {
    const s = solve(LAYERED);
    const [, apexY] = worldAt(s.placement, s.arms[0].profile.length);
    expect(apexY).toBeCloseTo(-LAYERED.environment.tipDepth, 12);
    const needle = s.arms[0];
    for (const y of s.layers.interfaces) {
      const hit = needle.nodes.some((n) => Math.abs(worldAt(s.placement, n)[1] - y) < 1e-12);
      expect(hit).toBe(true);
    }
    // Every interval lies wholly in one layer.
    needle.intervalLayers.forEach((layer, i) => {
      const y0 = worldAt(s.placement, needle.nodes[i])[1];
      const y1 = worldAt(s.placement, needle.nodes[i + 1])[1];
      const lo = layer === 0 ? 0 : layer === 1 ? -LAYERED.environment.oilThickness : -Infinity;
      const hi = layer === 0 ? Infinity : layer === 1 ? 0 : -LAYERED.environment.oilThickness;
      expect(Math.min(y0, y1)).toBeGreaterThanOrEqual(lo - 1e-12);
      expect(Math.max(y0, y1)).toBeLessThanOrEqual(hi + 1e-12);
    });
  });

  it('balances power: source = radiated + Joule heat + dielectric heating + feed loss', () => {
    const s = solve({ ...LAYERED, drive: { ...LAYERED.drive, feedResistance: 10 } });
    const { source, radiated, ohmic, dielectric, feed } = s.power;
    expect((radiated + ohmic + dielectric + feed) / source).toBeCloseTo(1, 3);
    const water = s.power.byMedium.find((m) => m.medium === 'water');
    expect(water?.dielectric).toBeGreaterThan(0);
  });

  it('conserves charge on each arm in the layers', () => {
    const s = solve(LAYERED);
    const delivered = div(s.gapCurrent, { re: 0, im: s.omega });
    const up = armCharge(s.arms[0]);
    expect(
      abs({ re: up.re - delivered.re, im: up.im - delivered.im }) / abs(delivered),
    ).toBeLessThan(1e-3);
  });

  it('matches air alone when the needle only touches the surface', () => {
    const touching = solve({
      ...LAYERED,
      environment: { ...LAYERED.environment, tipDepth: 0 },
    }).inputImpedance;
    const air = solve({
      ...LAYERED,
      environment: { ...LAYERED.environment, kind: 'air', tipDepth: 0 },
    }).inputImpedance;
    expect(abs({ re: touching.re - air.re, im: touching.im - air.im }) / abs(air)).toBeLessThan(
      1e-9,
    );
  });

  it('heats the liquids only, never the air', () => {
    const s = solve(LAYERED);
    const [ax, ay] = worldAt(s.placement, s.arms[0].profile.length);
    const grid = computeGrid(s, { x0: ax - 0.01, x1: ax + 0.01, y0: ay - 0.01, y1: 0.01 }, 30, 30);
    const q = heating(s, grid);
    let inWater = 0;
    for (let j = 0; j < grid.ny; j++) {
      for (let i = 0; i < grid.nx; i++) {
        const k = j * grid.nx + i;
        if (grid.mask[k] !== Mask.Air) continue;
        if (yAt(grid, j) > 0) expect(q[k]).toBe(0);
        if (s.layers.media[grid.layer[k]] === 'water') inWater = Math.max(inWater, q[k]);
      }
    }
    expect(inWater).toBeGreaterThan(0);
    expect(xAt(grid, 0)).toBeLessThan(ax);
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

describe('thermal convection', () => {
  it('settles at T₀ + q/(h·2πa) with uniform heating and convection only', () => {
    const n = 40;
    const L = 0.02;
    const a = 1e-4;
    const q = 0.5; // W/m
    const h = 800; // W/(m²·K)
    const nodes = Array.from({ length: n + 1 }, (_, i) => (L * i) / n);
    const area = 2 * Math.PI * a * (L / n);
    const t = solveTemperature({
      nodes,
      intervals: nodes.slice(1).map(() => ({
        conductance: (20 * Math.PI * a * a) / (L / n),
        heat: (q * L) / n,
        area,
        convection: h * area,
      })),
      endArea: 0,
      emissivity: 0,
      ambient: 300,
      clampBase: false,
    });
    expect(t.temperature[n / 2] - 300).toBeCloseTo(q / (h * 2 * Math.PI * a), 2);
  });
});

describe('contours', () => {
  it('traces a level through a simple ramp', () => {
    const values = new Float64Array([0, 1, 0, 1]);
    const seg = contourSegments(values, new Uint8Array(4), 2, 2, [0.5]);
    expect(seg).toEqual([1, 0.5, 1, 1.5]);
  });
});
