import { Solution, needleRadius } from './solver';

/** A rectangle of the (ρ, z) half plane: ρ from 0 to rhoMax, z from zMin to zMax. */
export interface FieldWindow {
  rhoMax: number;
  zMin: number;
  zMax: number;
}

/** What occupies each grid sample. */
export const Mask = { Air: 0, Needle: 1, Ground: 2 } as const;

/**
 * Complex field phasors on a regular grid over a window. Row 0 is the top (zMax); column 0 is
 * the axis side. Points sit at cell centers.
 */
export interface FieldGrid {
  window: FieldWindow;
  nRho: number;
  nZ: number;
  /** E_ρ, E_z (V/m) and H_φ (A/m): real and imaginary parts, row-major. */
  eRhoRe: Float64Array;
  eRhoIm: Float64Array;
  eZRe: Float64Array;
  eZIm: Float64Array;
  hPhiRe: Float64Array;
  hPhiIm: Float64Array;
  mask: Uint8Array;
}

export const rhoAt = (g: FieldGrid, i: number) => ((i + 0.5) * g.window.rhoMax) / g.nRho;
export const zAt = (g: FieldGrid, j: number) =>
  g.window.zMax - ((j + 0.5) * (g.window.zMax - g.window.zMin)) / g.nZ;

interface Sources {
  z: Float64Array;
  /** Regularizing radius: the wire radius at the source, so the kernel stays finite near it. */
  a2: Float64Array;
  /** Current moment I·h (A·m). */
  mRe: Float64Array;
  mIm: Float64Array;
  /** Charge (C). */
  qRe: Float64Array;
  qIm: Float64Array;
}

/** Needle cells, the apex charge, and their images in the ground plane. */
function sources(sol: Solution): Sources {
  const n = sol.cells.length;
  const count = 2 * (n + 1);
  const s: Sources = {
    z: new Float64Array(count),
    a2: new Float64Array(count),
    mRe: new Float64Array(count),
    mIm: new Float64Array(count),
    qRe: new Float64Array(count),
    qIm: new Float64Array(count),
  };
  const put = (
    k: number,
    z: number,
    a: number,
    mRe: number,
    mIm: number,
    qRe: number,
    qIm: number,
  ) => {
    s.z[k] = z;
    s.a2[k] = a * a;
    s.mRe[k] = mRe;
    s.mIm[k] = mIm;
    s.qRe[k] = qRe;
    s.qIm[k] = qIm;
  };
  sol.cells.forEach((c, i) => {
    const mRe = c.current.re * c.h;
    const mIm = c.current.im * c.h;
    put(2 * i, c.z, c.radius, mRe, mIm, c.charge.re, c.charge.im);
    // Image: same vertical current, opposite charge.
    put(2 * i + 1, -c.z, c.radius, mRe, mIm, -c.charge.re, -c.charge.im);
  });
  const g = sol.params.geometry;
  const rTip = g.taperLength > 0 ? Math.min(g.tipRadius, g.radius) : g.radius;
  const zTip = g.length - rTip;
  put(2 * n, zTip, rTip, 0, 0, sol.tipCharge.re, sol.tipCharge.im);
  put(2 * n + 1, -zTip, rTip, 0, 0, -sol.tipCharge.re, -sol.tipCharge.im);
  return s;
}

/** Allocates a grid and fills its mask; values are filled row by row with fillRows. */
export function createGrid(
  sol: Solution,
  window: FieldWindow,
  nRho: number,
  nZ: number,
): FieldGrid {
  const size = nRho * nZ;
  const grid: FieldGrid = {
    window,
    nRho,
    nZ,
    eRhoRe: new Float64Array(size),
    eRhoIm: new Float64Array(size),
    eZRe: new Float64Array(size),
    eZIm: new Float64Array(size),
    hPhiRe: new Float64Array(size),
    hPhiIm: new Float64Array(size),
    mask: new Uint8Array(size),
  };
  for (let j = 0; j < nZ; j++) {
    const z = zAt(grid, j);
    const r = needleRadius(sol.params.geometry, z);
    for (let i = 0; i < nRho; i++) {
      grid.mask[j * nRho + i] = z < 0 ? Mask.Ground : rhoAt(grid, i) <= r ? Mask.Needle : Mask.Air;
    }
  }
  return grid;
}

/**
 * Fills rows [from, to) of the grid by summing every source's exact (retarded) field:
 * E = −jωA − ∇Φ and H = ∇×A / μ, with A and Φ from the current moments and charges.
 */
export function fillRows(sol: Solution, grid: FieldGrid, from: number, to: number): void {
  const src = sources(sol);
  const ns = src.z.length;
  const k = sol.k;
  const wmu = sol.omega * sol.mu;
  const invEps = 1 / sol.epsilon;
  const inv4pi = 1 / (4 * Math.PI);
  for (let j = from; j < Math.min(to, grid.nZ); j++) {
    const z = zAt(grid, j);
    for (let i = 0; i < grid.nRho; i++) {
      const idx = j * grid.nRho + i;
      if (grid.mask[idx] !== Mask.Air) continue;
      const rho = rhoAt(grid, i);
      const rho2 = rho * rho;
      let erRe = 0;
      let erIm = 0;
      let ezRe = 0;
      let ezIm = 0;
      let hRe = 0;
      let hIm = 0;
      for (let s = 0; s < ns; s++) {
        const dz = z - src.z[s];
        const r2 = rho2 + dz * dz + src.a2[s];
        const r = Math.sqrt(r2);
        const kr = k * r;
        const cs = Math.cos(kr);
        const sn = Math.sin(kr);
        // G = e^{−jkR}/(4πR)
        const gRe = (cs * inv4pi) / r;
        const gIm = (-sn * inv4pi) / r;
        // D = (dG/dR)/R = −(1 + jkR)e^{−jkR}/(4πR³)
        const r3 = r2 * r;
        const dRe = (-(cs + kr * sn) * inv4pi) / r3;
        const dIm = (-(kr * cs - sn) * inv4pi) / r3;
        const mRe = src.mRe[s];
        const mIm = src.mIm[s];
        const qRe = src.qRe[s] * invEps;
        const qIm = src.qIm[s] * invEps;
        // −jωμ·m·G
        const mgRe = mRe * gRe - mIm * gIm;
        const mgIm = mRe * gIm + mIm * gRe;
        // (Q/ε)·D and m·D
        const qdRe = qRe * dRe - qIm * dIm;
        const qdIm = qRe * dIm + qIm * dRe;
        const mdRe = mRe * dRe - mIm * dIm;
        const mdIm = mRe * dIm + mIm * dRe;
        ezRe += wmu * mgIm - qdRe * dz;
        ezIm += -wmu * mgRe - qdIm * dz;
        erRe -= qdRe * rho;
        erIm -= qdIm * rho;
        hRe -= mdRe * rho;
        hIm -= mdIm * rho;
      }
      grid.eRhoRe[idx] = erRe;
      grid.eRhoIm[idx] = erIm;
      grid.eZRe[idx] = ezRe;
      grid.eZIm[idx] = ezIm;
      grid.hPhiRe[idx] = hRe;
      grid.hPhiIm[idx] = hIm;
    }
  }
}

/** Computes the whole grid in one go (tests, small grids). */
export function computeGrid(
  sol: Solution,
  window: FieldWindow,
  nRho: number,
  nZ: number,
): FieldGrid {
  const grid = createGrid(sol, window, nRho, nZ);
  fillRows(sol, grid, 0, nZ);
  return grid;
}

/**
 * Contour segments of a scalar grid at the given levels (marching squares), in grid units
 * (x = column + 0.5, y = row + 0.5 at a sample). Cells touching masked samples are skipped.
 * Returns x1, y1, x2, y2 for each segment.
 */
export function contourSegments(
  values: Float64Array,
  mask: Uint8Array,
  nx: number,
  ny: number,
  levels: readonly number[],
): number[] {
  const out: number[] = [];
  if (!levels.length) return out;
  const sorted = [...levels].sort((a, b) => a - b);
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const i00 = j * nx + i;
      const i10 = i00 + 1;
      const i01 = i00 + nx;
      const i11 = i01 + 1;
      if (mask[i00] || mask[i10] || mask[i01] || mask[i11]) continue;
      const v00 = values[i00];
      const v10 = values[i10];
      const v01 = values[i01];
      const v11 = values[i11];
      const lo = Math.min(v00, v10, v01, v11);
      const hi = Math.max(v00, v10, v01, v11);
      for (const level of sorted) {
        if (level < lo) continue;
        if (level > hi) break;
        const pts: number[] = [];
        const edge = (va: number, vb: number, xa: number, ya: number, xb: number, yb: number) => {
          if (va < level !== vb < level) {
            const t = (level - va) / (vb - va);
            pts.push(xa + t * (xb - xa), ya + t * (yb - ya));
          }
        };
        const x0 = i + 0.5;
        const y0 = j + 0.5;
        edge(v00, v10, x0, y0, x0 + 1, y0);
        edge(v10, v11, x0 + 1, y0, x0 + 1, y0 + 1);
        edge(v11, v01, x0 + 1, y0 + 1, x0, y0 + 1);
        edge(v01, v00, x0, y0 + 1, x0, y0);
        if (pts.length === 4) out.push(pts[0], pts[1], pts[2], pts[3]);
        else if (pts.length === 8)
          out.push(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
      }
    }
  }
  return out;
}
