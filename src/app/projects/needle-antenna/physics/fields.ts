import { Complex, add, div, mul, scale, sqrt, sub } from './complex';
import { radiusAt } from './geometry';
import { layerIndex } from './media';
import { EPS0, MU0, Solution, worldAt } from './solver';

/**
 * A rectangle of the vertical plane that contains the antenna and the normal to the liquid
 * surface: x horizontal, y up, y = 0 on the oil's top surface.
 */
export interface FieldWindow {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** What occupies each grid sample. */
export const Mask = { Air: 0, Needle: 1 } as const;

/**
 * Complex field phasors on a regular grid over a window. Row 0 is the top (y1); points sit at
 * cell centers. E lies in the plane; H (from currents in the plane) points out of it.
 */
export interface FieldGrid {
  window: FieldWindow;
  nx: number;
  ny: number;
  exRe: Float64Array;
  exIm: Float64Array;
  eyRe: Float64Array;
  eyIm: Float64Array;
  /** H out of the plane (A/m). */
  hRe: Float64Array;
  hIm: Float64Array;
  mask: Uint8Array;
  /** Layer index of each point. */
  layer: Uint8Array;
}

export const xAt = (g: FieldGrid, i: number) =>
  g.window.x0 + ((i + 0.5) * (g.window.x1 - g.window.x0)) / g.nx;
export const yAt = (g: FieldGrid, j: number) =>
  g.window.y1 - ((j + 0.5) * (g.window.y1 - g.window.y0)) / g.ny;

/**
 * The elements seen from one layer, flattened for speed: per element x, y, a², ux, uy,
 * m (re, im), the charge factor S·q/ε (re, im), and the source's layer (or −1 when the element
 * is in this layer or is an image in its surface, so it propagates with this layer's
 * wavenumber).
 */
const STRIDE = 10;

interface Prepared {
  /** Per field-point layer: STRIDE numbers per element. */
  elements: Float64Array[];
  /** Complex wavenumber of each layer, k₀√εr: re, im (im ≤ 0 attenuates). */
  kRe: number[];
  kIm: number[];
}

const cache = new WeakMap<Solution, Prepared>();

/**
 * Every current element and charge of both arms (each interval's two quadrature points merged
 * at their centroid, which is plenty for the field map), both end-cap charges, and each
 * layer's images, arranged per field-point layer.
 */
function prepare(sol: Solution): Prepared {
  const cached = cache.get(sol);
  if (cached) return cached;
  const lay = sol.layers;
  const [ux, uy] = sol.placement.axis;
  const eps = lay.eps.map((e) => scale(e, EPS0));
  const sources: { x: number; y: number; a2: number; m: Complex; q: Complex; layer: number }[] = [];
  for (const arm of sol.arms) {
    const ps = arm.samples;
    for (let i = 0; i + 1 < ps.length; i += 2) {
      const p = ps[i];
      const r = ps[i + 1];
      const w = p.w + r.w;
      const z = (p.z * p.w + r.z * r.w) / w;
      const [x, y] = worldAt(sol.placement, z);
      const radius = (p.radius + r.radius) / 2;
      sources.push({
        x,
        y,
        a2: radius * radius,
        m: add(scale(p.current, p.w), scale(r.current, r.w)),
        q: add(scale(p.lineCharge, p.w), scale(r.lineCharge, r.w)),
        layer: p.layer,
      });
    }
    const [x, y] = worldAt(sol.placement, arm.direction * arm.profile.capCenter);
    const rc = arm.profile.capRadius;
    sources.push({ x, y, a2: rc * rc, m: { re: 0, im: 0 }, q: arm.tipCharge, layer: arm.capLayer });
  }
  const elements = lay.media.map((_, lp) => {
    const list: number[] = [];
    const push = (
      x: number,
      y: number,
      a2: number,
      dx: number,
      dy: number,
      m: Complex,
      qf: Complex,
      layer: number,
    ) => list.push(x, y, a2, dx, dy, m.re, m.im, qf.re, qf.im, layer);
    for (const s of sources) {
      if (s.layer === lp) {
        const qf = div(s.q, eps[lp]);
        push(s.x, s.y, s.a2, ux, uy, s.m, qf, -1);
        // Images in the surfaces bounding this layer: above (interface lp − 1), below (lp).
        for (const b of [lp - 1, lp]) {
          if (b < 0 || b >= lay.interfaces.length) continue;
          const other = eps[b === lp ? lp + 1 : lp - 1];
          const gamma = div(sub(eps[lp], other), add(eps[lp], other));
          const yb = lay.interfaces[b];
          push(s.x, 2 * yb - s.y, s.a2, ux, -uy, mul(gamma, s.m), mul(gamma, qf), -1);
        }
      } else {
        // The charge carried across each surface between the layers: 2ε₂/(ε₁ + ε₂) each.
        let factor: Complex = { re: 1, im: 0 };
        const step = s.layer < lp ? 1 : -1;
        for (let l = s.layer; l !== lp; l += step) {
          factor = mul(factor, div(scale(eps[l + step], 2), add(eps[l], eps[l + step])));
        }
        push(s.x, s.y, s.a2, ux, uy, s.m, div(mul(factor, s.q), eps[lp]), s.layer);
      }
    }
    return Float64Array.from(list);
  });
  const k = lay.eps.map((e) => scale(sqrt(e), sol.k));
  const prepared = { elements, kRe: k.map((c) => c.re), kIm: k.map((c) => c.im) };
  cache.set(sol, prepared);
  return prepared;
}

/** Allocates a grid and fills its mask and layers; values are filled row by row. */
export function createGrid(sol: Solution, window: FieldWindow, nx: number, ny: number): FieldGrid {
  const size = nx * ny;
  const grid: FieldGrid = {
    window,
    nx,
    ny,
    exRe: new Float64Array(size),
    exIm: new Float64Array(size),
    eyRe: new Float64Array(size),
    eyIm: new Float64Array(size),
    hRe: new Float64Array(size),
    hIm: new Float64Array(size),
    mask: new Uint8Array(size),
    layer: new Uint8Array(size),
  };
  const { gap, axis } = sol.placement;
  const [needle, other] = sol.arms;
  for (let j = 0; j < ny; j++) {
    const y = yAt(grid, j);
    for (let i = 0; i < nx; i++) {
      const x = xAt(grid, i);
      const dx = x - gap[0];
      const dy = y - gap[1];
      const s = dx * axis[0] + dy * axis[1];
      const rho = Math.abs(dx * axis[1] - dy * axis[0]);
      const r = s >= 0 ? radiusAt(needle.profile, s) : radiusAt(other.profile, -s);
      const k = j * nx + i;
      grid.mask[k] = rho <= r ? Mask.Needle : Mask.Air;
      grid.layer[k] = layerIndex(sol.layers, y);
    }
  }
  return grid;
}

/**
 * Fills rows [from, to) of the grid.
 *
 * Each current element and charge contributes its exact retarded field in a uniform medium,
 * E = −jωA − ∇Φ and H = ∇×A/μ₀, adapted to the layers:
 * - Field point in the source's own layer: the medium's wavenumber and permittivity, plus a
 *   quasi-static image in each surface bounding the layer, mirrored across it and weighted by
 *   Γ = (ε₁ − ε₂)/(ε₁ + ε₂) (exact for charges near a flat dielectric interface at low
 *   frequency; → −1 for a perfect conductor).
 * - Field point in another layer: the direct path only, with the phase and attenuation each
 *   layer adds along it (the sum of k·ℓ over the layers), and the charge's potential carried across each surface by the
 *   quasi-static transmission factor 2ε₂/(ε₁ + ε₂).
 * Multiple reflections inside the oil, and the change of the reflection with angle, are left
 * out: the fields are approximate within about a wavelength of the surfaces.
 */
export function fillRows(sol: Solution, grid: FieldGrid, from: number, to: number): void {
  const { elements, kRe, kIm } = prepare(sol);
  const lay = sol.layers;
  const nLayers = lay.media.length;
  const tops = lay.media.map((_, l) => (l === 0 ? Infinity : lay.interfaces[l - 1]));
  const bottoms = lay.media.map((_, l) => (l === nLayers - 1 ? -Infinity : lay.interfaces[l]));
  const wmu = sol.omega * MU0;
  const inv4pi = 1 / (4 * Math.PI);
  for (let j = from; j < Math.min(to, grid.ny); j++) {
    const y = yAt(grid, j);
    for (let i = 0; i < grid.nx; i++) {
      const idx = j * grid.nx + i;
      if (grid.mask[idx] !== Mask.Air) continue;
      const x = xAt(grid, i);
      const lp = grid.layer[idx];
      const list = elements[lp];
      const kpr = kRe[lp];
      const kpi = kIm[lp];
      let exr = 0;
      let exi = 0;
      let eyr = 0;
      let eyi = 0;
      let hr = 0;
      let hi = 0;
      for (let e = 0; e < list.length; e += STRIDE) {
        const sx = list[e];
        const sy = list[e + 1];
        const ux = list[e + 3];
        const uy = list[e + 4];
        const mr = list[e + 5];
        const mi = list[e + 6];
        const qr = list[e + 7];
        const qi = list[e + 8];
        const from = list[e + 9];
        const rx = x - sx;
        const ry = y - sy;
        const r2 = rx * rx + ry * ry + list[e + 2];
        const r = Math.sqrt(r2);
        // Wavenumber along the path: this layer's, or a mix weighted by the vertical share of
        // the path in each layer it crosses.
        let kr = kpr;
        let ki = kpi;
        if (from >= 0) {
          const lo = Math.min(sy, y);
          const hiY = Math.max(sy, y);
          const span = hiY - lo || 1e-30;
          kr = 0;
          ki = 0;
          for (let l = Math.min(from, lp); l <= Math.max(from, lp); l++) {
            const share = Math.max(0, Math.min(hiY, tops[l]) - Math.max(lo, bottoms[l])) / span;
            kr += kRe[l] * share;
            ki += kIm[l] * share;
          }
        }
        // G = e^{−jkR}/(4πR) with k = k′ + jk″ (k″ ≤ 0): e^{k″R}·e^{−jk′R}.
        const decay = Math.exp(ki * r);
        const ph = kr * r;
        const gr = (decay * Math.cos(ph) * inv4pi) / r;
        const gi = (-decay * Math.sin(ph) * inv4pi) / r;
        // D = (dG/dR)/R = −(1 + jk_pR)·G/R², with the field point's own wavenumber.
        const ar = 1 - kpi * r;
        const ai = kpr * r;
        const dr = -(ar * gr - ai * gi) / r2;
        const di = -(ar * gi + ai * gr) / r2;
        // −jωμ₀·m·G along u.
        const mgr = mr * gr - mi * gi;
        const mgi = mr * gi + mi * gr;
        const er = wmu * mgi;
        const ei = -wmu * mgr;
        // (S·q/ε)·D along R.
        const qdr = qr * dr - qi * di;
        const qdi = qr * di + qi * dr;
        exr += er * ux - qdr * rx;
        exi += ei * ux - qdi * rx;
        eyr += er * uy - qdr * ry;
        eyi += ei * uy - qdi * ry;
        // H = ∇G × m·u, out of the plane: D·(R × u)·m.
        const cross = rx * uy - ry * ux;
        hr += (mr * dr - mi * di) * cross;
        hi += (mr * di + mi * dr) * cross;
      }
      grid.exRe[idx] = exr;
      grid.exIm[idx] = exi;
      grid.eyRe[idx] = eyr;
      grid.eyIm[idx] = eyi;
      grid.hRe[idx] = hr;
      grid.hIm[idx] = hi;
    }
  }
}

/** Computes the whole grid in one go (tests, small grids). */
export function computeGrid(sol: Solution, window: FieldWindow, nx: number, ny: number): FieldGrid {
  const grid = createGrid(sol, window, nx, ny);
  fillRows(sol, grid, 0, ny);
  return grid;
}

/**
 * Time-averaged power absorbed per unit volume at each point, ½ωε₀ε″|E|² (W/m³), from the
 * layer's dielectric loss. Zero in air and vacuum.
 */
export function heating(sol: Solution, grid: FieldGrid): Float64Array {
  const out = new Float64Array(grid.nx * grid.ny);
  const loss = sol.layers.eps.map((e) => 0.5 * sol.omega * EPS0 * Math.max(0, -e.im));
  for (let k = 0; k < out.length; k++) {
    if (grid.mask[k] !== Mask.Air) continue;
    const e2 = grid.exRe[k] ** 2 + grid.exIm[k] ** 2 + grid.eyRe[k] ** 2 + grid.eyIm[k] ** 2;
    out[k] = loss[grid.layer[k]] * e2;
  }
  return out;
}

/**
 * Contour segments of a scalar grid at the given levels (marching squares), in grid units
 * (x = column + 0.5, y = row + 0.5 at a sample). Cells touching masked samples are skipped,
 * and so are cells whose corners lie in different groups (e.g. layers), so a field that jumps
 * across a boundary doesn't pile contours along it. Returns x1, y1, x2, y2 for each segment.
 */
export function contourSegments(
  values: Float64Array,
  mask: Uint8Array,
  nx: number,
  ny: number,
  levels: readonly number[],
  groups?: Uint8Array,
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
      if (
        groups &&
        (groups[i00] !== groups[i10] || groups[i00] !== groups[i01] || groups[i00] !== groups[i11])
      )
        continue;
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
