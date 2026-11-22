/**
 * Parameters for the needle simulation. All values in SI units.
 *
 * The needle stands upright on an infinite, perfectly conducting ground plane at z = 0, fed at
 * its base by an ideal voltage source V(t) = V̂·cos(ωt + φ) between the needle and the plane.
 * By image theory the fields above the plane are those of a symmetric dipole twice as long.
 */
export interface NeedleGeometry {
  /** Base to apex (m). */
  length: number;
  /** Shaft radius (m). */
  radius: number;
  /** Length of the conical point, measured back from the apex (m). 0 for a blunt rod. */
  taperLength: number;
  /** Radius of the rounded apex (m). */
  tipRadius: number;
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
  /** Shunt capacitance across the feed point, e.g. a connector or mount (F). */
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

/** The surrounding medium. Only a homogeneous, lossless medium is modeled for now. */
export interface Medium {
  relPermittivity: number;
  relPermeability: number;
  /** Ambient (and ground-plane) temperature (K). */
  ambientTemperature: number;
}

export interface NeedleParams {
  geometry: NeedleGeometry;
  drive: DriveCircuit;
  material: NeedleMaterial;
  medium: Medium;
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

export const VACUUM: Medium = {
  relPermittivity: 1,
  relPermeability: 1,
  ambientTemperature: 293.15,
};

export const DEFAULT_PARAMS: NeedleParams = {
  geometry: { length: 30e-3, radius: 0.25e-3, taperLength: 4e-3, tipRadius: 10e-6 },
  drive: {
    voltage: 10,
    frequency: 2.4e9,
    phaseDeg: 0,
    feedResistance: 0,
    feedReactance: 0,
    baseCapacitance: 0,
  },
  material: MATERIAL_PRESETS[0].material,
  medium: VACUUM,
};
