/**
 * Parameters for the needle simulation. All values in SI units.
 *
 * The needle is part of a dipole: one straight wire of a given total length,
 * pointed at one end and rounded at the other, cut by a vanishingly small feed gap somewhere
 * along it. An ideal voltage source V(t) = V̂·cos(ωt + φ) drives the gap. The part above the gap
 * (ending in the point) is the needle arm; the part below (ending in the rounded end) is the
 * other arm. A balun is assumed, so the feed is balanced and the feed line carries no current
 * on its outside. The surroundings are described by the Environment.
 */
export interface NeedleGeometry {
  /** Total length of the antenna, point to rounded end (m). */
  length: number;
  /** Shaft radius (m). */
  radius: number;
  /** Length of the conical point, measured back from the apex (m). 0 for a rod with a rounded end. */
  taperLength: number;
  /** Radius of the rounded apex (m). */
  tipRadius: number;
  /**
   * Whether the far end of the other arm is pointed too. Otherwise it is rounded: a hemisphere of
   * the shaft radius.
   */
  mirrorPointed: boolean;
  /**
   * Where the feed gap sits, as a fraction of the total length measured from the rounded (other)
   * end: 0.5 is center-fed.
   */
  feedPosition: number;
}

/** The shape of one arm, measured outward from the feed gap. */
export interface ArmShape {
  /** Gap to the arm's far end (m). */
  length: number;
  radius: number;
  /** Length of a conical point at the far end (m); 0 for a hemispherical end. */
  taperLength: number;
  /** Radius of the rounded apex of the point (m). */
  tipRadius: number;
}

/** The two arms on either side of the feed gap: [the needle arm, the other arm]. */
export function armShapes(g: NeedleGeometry): [ArmShape, ArmShape] {
  const other = g.length * g.feedPosition;
  const needle = g.length - other;
  const pointed = (length: number): ArmShape => ({
    length,
    radius: g.radius,
    taperLength: Math.min(g.taperLength, length),
    tipRadius: g.tipRadius,
  });
  return [
    pointed(needle),
    g.mirrorPointed
      ? pointed(other)
      : { length: other, radius: g.radius, taperLength: 0, tipRadius: g.radius },
  ];
}

export interface DriveCircuit {
  /** Peak source voltage V̂ (V). */
  voltage: number;
  /** Hz. */
  frequency: number;
  /** Source phase φ (degrees). */
  phaseDeg: number;
  /** Series feed (source/contact) resistance (Ω). */
  feedResistance: number;
  /** Series feed reactance (Ω); positive is inductive. */
  feedReactance: number;
  /** Shunt capacitance across the feed gap, e.g. the source's terminals (F). */
  baseCapacitance: number;
}

export interface NeedleMaterial {
  /** Electrical resistivity (Ω·m). */
  resistivity: number;
  /** Relative permeability of the metal (sets skin depth and internal inductance). */
  relPermeability: number;
  /** Thermal conductivity (W/(m·K)). */
  thermalConductivity: number;
  /** Total hemispherical emissivity of the surface (0–1). */
  emissivity: number;
  /** Melting point (K), for warnings only. */
  meltingPoint: number;
}

/**
 * The surroundings. Either uniform (vacuum or air), or layered: air above a flat layer of oil
 * floating on deep water. The needle's point dips through the oil into the water at an angle.
 */
export interface Environment {
  kind: 'vacuum' | 'air' | 'layered';
  /** Temperature of the surroundings: air, oil and water (K). */
  ambientTemperature: number;
  /** Whether the feed is heat-sunk, holding the needle's base at ambient. */
  feedHeatSunk: boolean;
  /**
   * Angle between the needle and the liquid surface (degrees): 90 is straight down, 10 nearly
   * skimming the surface.
   */
  tiltDeg: number;
  /** How far the apex sits below the oil's top surface, measured vertically (m). */
  tipDepth: number;
  /** Thickness of the oil layer (m). */
  oilThickness: number;
  /** Relative permittivity of the oil (mineral oil ≈ 2.2). */
  oilPermittivity: number;
  /** Dielectric loss tangent of the oil. */
  oilLossTangent: number;
}

export interface NeedleParams {
  geometry: NeedleGeometry;
  drive: DriveCircuit;
  material: NeedleMaterial;
  environment: Environment;
}

export interface MaterialPreset {
  id: string;
  name: string;
  material: NeedleMaterial;
}

/** Room-temperature handbook values; emissivities are for clean, fairly smooth metal. */
export const MATERIAL_PRESETS: readonly MaterialPreset[] = [
  {
    id: 'steel-304',
    name: 'Stainless steel 304',
    material: {
      resistivity: 7.2e-7,
      relPermeability: 1.0,
      thermalConductivity: 16.2,
      emissivity: 0.35,
      meltingPoint: 1673,
    },
  },
  {
    id: 'tungsten',
    name: 'Tungsten',
    material: {
      resistivity: 5.6e-8,
      relPermeability: 1.0,
      thermalConductivity: 173,
      emissivity: 0.05,
      meltingPoint: 3695,
    },
  },
  {
    id: 'pt-ir',
    name: 'Platinum–iridium 90/10',
    material: {
      resistivity: 2.5e-7,
      relPermeability: 1.0,
      thermalConductivity: 31,
      emissivity: 0.1,
      meltingPoint: 2053,
    },
  },
  {
    id: 'copper',
    name: 'Copper',
    material: {
      resistivity: 1.68e-8,
      relPermeability: 1.0,
      thermalConductivity: 401,
      emissivity: 0.03,
      meltingPoint: 1358,
    },
  },
  {
    id: 'gold',
    name: 'Gold',
    material: {
      resistivity: 2.44e-8,
      relPermeability: 1.0,
      thermalConductivity: 318,
      emissivity: 0.02,
      meltingPoint: 1337,
    },
  },
  {
    id: 'carbon-steel',
    name: 'Carbon steel (magnetic)',
    material: {
      resistivity: 1.7e-7,
      relPermeability: 100,
      thermalConductivity: 50,
      emissivity: 0.3,
      meltingPoint: 1700,
    },
  },
];

/** Air over 3 mm of mineral oil on deep deionized water, the needle tilted at 60°. */
export const LAYERED: Environment = {
  kind: 'layered',
  ambientTemperature: 293.15,
  feedHeatSunk: false,
  tiltDeg: 60,
  tipDepth: 8e-3,
  oilThickness: 3e-3,
  oilPermittivity: 2.2,
  oilLossTangent: 1e-3,
};

/** The same placement in vacuum, with no layers. */
export const VACUUM: Environment = { ...LAYERED, kind: 'vacuum' };

export const DEFAULT_PARAMS: NeedleParams = {
  geometry: {
    length: 60e-3,
    radius: 0.25e-3,
    taperLength: 4e-3,
    tipRadius: 10e-6,
    mirrorPointed: false,
    feedPosition: 0.5,
  },
  drive: {
    voltage: 10,
    frequency: 2.4e9,
    phaseDeg: 0,
    feedResistance: 0,
    feedReactance: 0,
    baseCapacitance: 0,
  },
  material: MATERIAL_PRESETS[0].material,
  environment: LAYERED,
};
