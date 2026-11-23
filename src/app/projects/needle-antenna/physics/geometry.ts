import { ArmShape } from './model';

/**
 * The needle's profile, resolved into its three smooth pieces: a cylindrical shaft, a cone, and
 * a spherical cap on the apex that the cone meets tangentially, so the surface has no kinks
 * between the cone and the cap (the radius and its slope are both continuous there).
 */
export interface Profile {
  length: number;
  /** Shaft radius a. */
  shaftRadius: number;
  /** Radius r of the spherical cap. */
  capRadius: number;
  /** Where the shaft ends and the cone begins. */
  coneStart: number;
  /** Where the cone meets the cap (the tangent point). */
  capStart: number;
  /** Center of the cap's sphere: L − r. */
  capCenter: number;
  /** Half-angle α of the cone (rad); the cone's radius falls by tan α per meter. */
  halfAngle: number;
  /** tan α, cached. */
  slope: number;
}

/**
 * Builds the profile. With no taper the end is a hemisphere of the shaft radius. Otherwise the
 * cone starts at L − Lt with the shaft radius and runs down the line tangent to a sphere of the
 * tip radius whose surface touches the apex at z = L.
 */
export function profile(g: ArmShape): Profile {
  const L = g.length;
  const a = g.radius;
  const taper = Math.min(Math.max(g.taperLength, 0), L);
  if (taper === 0) {
    const r = Math.min(a, L / 2);
    return {
      length: L,
      shaftRadius: a,
      capRadius: r,
      coneStart: L - r,
      capStart: L - r,
      capCenter: L - r,
      halfAngle: 0,
      slope: 0,
    };
  }
  // Keep the cap shorter than half the taper, so the cone always has room.
  const r = Math.min(g.tipRadius, a, taper / 2);
  const coneStart = L - taper;
  const capCenter = L - r;
  // Tangent from (coneStart, a) to the circle of radius r about (capCenter, 0):
  // a·cos α − d·sin α = r, with d the axial distance from the cone's start to the center.
  const d = capCenter - coneStart;
  const reach = Math.hypot(a, d);
  const halfAngle = Math.max(0, Math.acos(Math.min(1, r / reach)) - Math.atan2(d, a));
  const capStart = capCenter + r * Math.sin(halfAngle);
  return {
    length: L,
    shaftRadius: a,
    capRadius: r,
    coneStart,
    capStart,
    capCenter,
    halfAngle,
    slope: Math.tan(halfAngle),
  };
}

/** Radius of the needle at height z above its base (0 outside it). */
export function radiusAt(p: Profile, z: number): number {
  if (z < 0 || z > p.length) return 0;
  if (z <= p.coneStart) return p.shaftRadius;
  if (z <= p.capStart) return p.shaftRadius - p.slope * (z - p.coneStart);
  const d = z - p.capCenter;
  return Math.sqrt(Math.max(0, p.capRadius * p.capRadius - d * d));
}

/** Area of the cap: a spherical zone of height L − capStart. */
export const capArea = (p: Profile) => 2 * Math.PI * p.capRadius * (p.length - p.capStart);
