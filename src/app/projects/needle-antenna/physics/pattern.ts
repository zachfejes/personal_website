import { Complex, add, div, mul, scale, sqrt, sub } from './complex';
import { MediumId } from './media';
import { ETA0, Solution, worldAt } from './solver';

/** Which directions a curve covers: above the liquid, below its surface, or all round. */
export type Sector = 'upper' | 'lower' | 'full';

/** One medium's far-field pattern in the vertical plane through the antenna. */
export interface PatternCurve {
  medium: MediumId;
  sector: Sector;
  /** Drawn dashed: a thin layer, shown as if it were unbounded. */
  dashed: boolean;
  /** Radiation intensity at each angle, relative to the strongest point of any curve. */
  intensity: number[];
}

export interface SlicePattern {
  /** Direction angles, measured clockwise from straight up (rad), 0 to 2π. */
  angle: number[];
  curves: PatternCurve[];
}

/** The parts of the antenna in one layer, as current elements placed in the plane. */
function elementsIn(sol: Solution, layer: number) {
  return sol.arms
    .flatMap((a) => a.samples)
    .filter((p) => p.layer === layer)
    .map((p) => {
      const [x, y] = worldAt(sol.placement, p.z);
      return { x, y, m: scale(p.current, p.w) };
    });
}

/**
 * Fresnel reflection coefficient for H of a wave polarized in the plane of incidence (TM),
 * from medium 1 onto medium 2 at incidence angle θ (cos θ given):
 * (ε₂·cos θ − √ε₁·√(ε₂ − ε₁·sin²θ)) / (ε₂·cos θ + √ε₁·√(ε₂ − ε₁·sin²θ)).
 */
function reflectionTM(e1: Complex, e2: Complex, cosI: number): Complex {
  const sin2 = 1 - cosI * cosI;
  const root = mul(sqrt(e1), sqrt(sub(e2, scale(e1, sin2))));
  const ec = scale(e2, cosI);
  return div(sub(ec, root), add(ec, root));
}

/**
 * Far-field radiation intensity in the plane of the antenna and the surface normal, one curve
 * per medium the antenna is in.
 *
 * Each medium's curve is the pattern of the part of the antenna inside it, radiating with that
 * medium's wavenumber and wave impedance (U = ηk²/(32π²)·|Σ m·sin ψ·e^{jk·r̂·r}|², so a denser
 * medium takes more power from the same current, by its refractive index):
 * - Air (uniform surroundings): all round.
 * - Air over the liquid: the half above the surface, plus the reflection of the part in air off
 *   the oil, weighted by the TM Fresnel coefficient at the reflection angle.
 * - Water: the half below the oil, plus the reflection of the part in water off the oil above.
 *   Water absorbs as the wave travels; the pattern is the shape before that loss.
 * - Oil: a thin slab rather than a half-space, so it is shown all round, dashed, as if
 *   unbounded: how the part in oil would radiate on its own.
 * Waves crossing from one medium into another are left out.
 */
export function slicePattern(sol: Solution, count = 360): SlicePattern {
  const lay = sol.layers;
  const layered = lay.interfaces.length > 0;
  const [ux, uy] = sol.placement.axis;
  const angle = Array.from({ length: count }, (_, s) => (2 * Math.PI * s) / count);

  const curves = lay.media.map((medium, l) => {
    const eps = lay.eps[l];
    const n = sqrt(eps).re;
    const k = sol.k * n;
    const sector: Sector = !layered
      ? 'full'
      : l === 0
        ? 'upper'
        : l === lay.media.length - 1
          ? 'lower'
          : 'full';
    // The surface whose reflection this medium sees, and the medium beyond it.
    const mirror =
      sector === 'upper'
        ? { y: lay.interfaces[0], beyond: lay.eps[1] }
        : sector === 'lower'
          ? { y: lay.interfaces[l - 1], beyond: lay.eps[l - 1] }
          : undefined;
    const elements = elementsIn(sol, l);
    const raw = angle.map((a) => {
      const rx = Math.sin(a);
      const ry = Math.cos(a);
      if ((sector === 'upper' && ry <= 0) || (sector === 'lower' && ry >= 0)) return 0;
      // The in-plane unit vector across the direction.
      const tx = ry;
      const ty = -rx;
      let direct: Complex = { re: 0, im: 0 };
      let image: Complex = { re: 0, im: 0 };
      for (const e of elements) {
        const ph = k * (rx * e.x + ry * e.y);
        direct = add(direct, mul(e.m, { re: Math.cos(ph), im: Math.sin(ph) }));
        if (mirror) {
          // The element mirrored in the surface y = y_b.
          const phi = k * (rx * e.x + ry * (2 * mirror.y - e.y));
          image = add(image, mul(e.m, { re: Math.cos(phi), im: Math.sin(phi) }));
        }
      }
      let field = scale(direct, ux * tx + uy * ty);
      if (mirror) {
        const rTM = reflectionTM(eps, mirror.beyond, Math.abs(ry));
        // The image current is −r_TM times the mirrored element (a perfect conductor, r_TM = 1,
        // gives the usual image).
        field = add(field, scale(mul(rTM, image), -(ux * tx - uy * ty)));
      }
      const eta = ETA0 / n;
      return ((eta * k * k) / (32 * Math.PI * Math.PI)) * (field.re ** 2 + field.im ** 2);
    });
    return {
      medium,
      sector,
      dashed: layered && sector === 'full',
      intensity: raw,
      hasElements: elements.length > 0,
    };
  });

  const max = Math.max(...curves.flatMap((c) => c.intensity)) || 1;
  return {
    angle,
    curves: curves
      .filter((c) => c.hasElements)
      .map(({ medium, sector, dashed, intensity }) => ({
        medium,
        sector,
        dashed,
        intensity: intensity.map((u) => u / max),
      })),
  };
}
