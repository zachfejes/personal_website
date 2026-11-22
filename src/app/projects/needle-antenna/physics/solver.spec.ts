import { abs } from './complex';
import { computeGrid, contourSegments } from './fields';
import { DEFAULT_PARAMS, NeedleParams } from './model';
import { C0, needleRadius, solve, sweep } from './solver';
import { solveTemperature } from './thermal';

const rod = (frequency: number): NeedleParams => ({
  ...DEFAULT_PARAMS,
  geometry: { ...DEFAULT_PARAMS.geometry, taperLength: 0 },
  drive: { ...DEFAULT_PARAMS.drive, frequency },
});

describe('needle solver', () => {
  it('draws the point: shaft, cone and rounded apex', () => {
    const g = DEFAULT_PARAMS.geometry;
    expect(needleRadius(g, 0.01)).toBe(g.radius);
    const mid = needleRadius(g, g.length - g.taperLength / 2);
    expect(mid).toBeLessThan(g.radius);
    expect(mid).toBeGreaterThan(g.tipRadius);
    expect(needleRadius(g, g.length)).toBeLessThan(g.tipRadius / 1000);
    expect(needleRadius(g, g.length + 1e-6)).toBe(0);
  });

  it('balances power: source = radiated + Joule heat + feed loss', () => {
    const s = solve({ ...DEFAULT_PARAMS, drive: { ...DEFAULT_PARAMS.drive, feedResistance: 12 } });
    const { source, radiated, ohmic, feed } = s.power;
    expect((radiated + ohmic + feed) / source).toBeCloseTo(1, 3);
  });

  it('matches the radiation resistance of a short monopole, 40π²(h/λ)²', () => {
    const f = 50e6;
    const s = solve(rod(f));
    const h = DEFAULT_PARAMS.geometry.length;
    const theory = 40 * Math.PI ** 2 * (h / (C0 / f)) ** 2;
    expect(Math.abs(s.radiationResistance / theory - 1)).toBeLessThan(0.15);
    // Electrically short: strongly capacitive.
    expect(s.inputImpedance.im).toBeLessThan(-1000);
  });

  it('resonates a little below a quarter wavelength with about 37 Ω', () => {
    const fq = C0 / (4 * DEFAULT_PARAMS.geometry.length);
    const pts = sweep(rod(fq), 0.8 * fq, 1.1 * fq, 80);
    const i = pts.findIndex(
      (p, k) => k > 0 && pts[k - 1].inputImpedance.im < 0 && p.inputImpedance.im >= 0,
    );
    expect(i).toBeGreaterThan(0);
    const f0 = pts[i].frequency;
    expect(f0 / fq).toBeGreaterThan(0.9);
    expect(f0 / fq).toBeLessThan(1);
    expect(pts[i].inputImpedance.re).toBeGreaterThan(30);
    expect(pts[i].inputImpedance.re).toBeLessThan(45);
  });

  it('forms a standing wave: current falls to almost nothing at the open apex', () => {
    const s = solve(DEFAULT_PARAMS);
    const top = abs(s.current[s.current.length - 1]);
    expect(top / abs(s.current[0])).toBeLessThan(0.01);
  });

  it('gives H ≈ I/(2πρ) close to the wire', () => {
    const s = solve(rod(1e9));
    const L = DEFAULT_PARAMS.geometry.length;
    const grid = computeGrid(s, { rhoMax: 0.03, zMin: 0, zMax: 0.045 }, 60, 90);
    const i = 3; // ρ = 1.75 mm
    const rho = ((i + 0.5) * 0.03) / 60;
    const j = Math.round(((0.045 - L / 3) / 0.045) * 90 - 0.5);
    const z = 0.045 - ((j + 0.5) * 0.045) / 90;
    const cell = s.cells.reduce((a, b) => (Math.abs(b.z - z) < Math.abs(a.z - z) ? b : a));
    const k = j * 60 + i;
    const h = Math.hypot(grid.hPhiRe[k], grid.hPhiIm[k]);
    expect(h / (abs(cell.current) / (2 * Math.PI * rho))).toBeCloseTo(1, 1);
  });

  it('falls off as 1/r in the radiation zone', () => {
    const s = solve(DEFAULT_PARAMS);
    const lambda = s.wavelength;
    const grid = computeGrid(s, { rhoMax: 20 * lambda, zMin: 0, zMax: 0.25 * lambda }, 200, 4);
    const e = (i: number) => Math.hypot(grid.eZRe[i], grid.eZIm[i], grid.eRhoRe[i], grid.eRhoIm[i]);
    // Along the ground plane (row 3): ρ·|E| levels off far away.
    const row = 3 * 200;
    const a = e(row + 100) * (100.5 / 200);
    const b = e(row + 190) * (190.5 / 200);
    expect(b / a).toBeCloseTo(1, 1);
  });
});

describe('thermal solver', () => {
  it('matches the analytic parabola with uniform heating and no radiation', () => {
    const n = 50;
    const L = 0.02;
    const a = 1e-4;
    const q = 2; // W/m
    const k = 20;
    const nodes = Array.from({ length: n + 1 }, (_, i) => (L * i) / n);
    const cells = Array.from({ length: n }, () => ({ h: L / n, radius: a, heat: q }));
    const t = solveTemperature(
      nodes,
      cells,
      {
        resistivity: 1,
        relPermeability: 1,
        thermalConductivity: k,
        emissivity: 0,
        meltingPoint: 2000,
      },
      300,
      a,
    );
    // T(L) − T0 = qL²/(2kA)
    const expected = 300 + (q * L * L) / (2 * k * Math.PI * a * a);
    expect(t.maxTemperature / expected).toBeCloseTo(1, 2);
  });
});

describe('contours', () => {
  it('traces a level through a simple ramp', () => {
    const values = new Float64Array([0, 1, 0, 1]);
    const seg = contourSegments(values, new Uint8Array(4), 2, 2, [0.5]);
    expect(seg).toEqual([1, 0.5, 1, 1.5]);
  });
});
