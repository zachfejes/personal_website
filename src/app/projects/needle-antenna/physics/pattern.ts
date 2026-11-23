import { Complex, add, div, mul, scale, sqrt, sub } from './complex';
import { Solution, worldAt } from './solver';

/** The far-field pattern in the vertical plane through the antenna. */
export interface SlicePattern {
  /** Direction angles, measured clockwise from straight up (rad), 0 to 2π. */
  angle: number[];
  /** Relative radiation intensity (peak 1); 0 where nothing is computed (into the liquid). */
  intensity: number[];
  /** Whether only the upper half (air above the liquid) is meaningful. */
  upperOnly: boolean;
}

/**
 * Relative far-field intensity in the plane of the antenna and the surface normal.
 *
 * Uniform surroundings: every current element radiates as in that medium, giving the familiar
 * dipole pattern (tilted with the antenna). Layered: only the air above the liquid is shown.
 * It gets the part of the antenna that is in air, plus that part's reflection in the liquid
 * surface, weighted by the Fresnel coefficient for a wave polarized in the plane of incidence
 * (TM) reflecting off the top layer at the reflection angle. What leaks out of the liquid is
 * left out; the deep water absorbs most of what goes in.
 */
export function slicePattern(sol: Solution, count = 360): SlicePattern {
  const layered = sol.layers.interfaces.length > 0;
  const top = sol.layers.eps[0];
  const n1 = sqrt(top);
  const k = sol.k * n1.re;
  const [ux, uy] = sol.placement.axis;
  const elements = sol.arms
    .flatMap((a) => a.samples)
    .filter((p) => !layered || p.layer === 0)
    .map((p) => {
      const [x, y] = worldAt(sol.placement, p.z);
      return { x, y, m: scale(p.current, p.w) };
    });
  const angle: number[] = [];
  const raw: number[] = [];
  for (let s = 0; s < count; s++) {
    const a = (2 * Math.PI * s) / count;
    angle.push(a);
    // Direction (clockwise from up) and the in-plane unit vector across it.
    const rx = Math.sin(a);
    const ry = Math.cos(a);
    if (layered && ry <= 0) {
      raw.push(0);
      continue;
    }
    const tx = ry;
    const ty = -rx;
    let direct: Complex = { re: 0, im: 0 };
    let image: Complex = { re: 0, im: 0 };
    for (const e of elements) {
      const ph = k * (rx * e.x + ry * e.y);
      const c = { re: Math.cos(ph), im: Math.sin(ph) };
      direct = add(direct, mul(e.m, c));
      if (layered) {
        const phi = k * (rx * e.x - ry * e.y);
        image = add(image, mul(e.m, { re: Math.cos(phi), im: Math.sin(phi) }));
      }
    }
    // Field across the direction: the element's direction projected on t.
    let field = scale(direct, ux * tx + uy * ty);
    if (layered) {
      const cosI = ry;
      const sin2 = rx * rx;
      const e2 = sol.layers.eps[1];
      // TM reflection (for H): (ε₂·cos θ − √ε₁·√(ε₂ − ε₁sin²θ)) / (… + …); the image of the
      // current is −r_TM times its mirror (so a perfect conductor, r_TM = 1, gives the usual
      // image).
      const root = mul(n1, sqrt(sub(e2, scale(top, sin2))));
      const ec = scale(e2, cosI);
      const rTM = div(sub(ec, root), add(ec, root));
      const mirror = ux * tx - uy * ty;
      field = add(field, scale(mul(rTM, image), -mirror));
    }
    raw.push(field.re * field.re + field.im * field.im);
  }
  const max = Math.max(...raw) || 1;
  return { angle, intensity: raw.map((u) => u / max), upperOnly: layered };
}
