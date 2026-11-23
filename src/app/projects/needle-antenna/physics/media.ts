import { Complex, complex } from './complex';
import { Environment } from './model';

/** The materials the antenna can be in. */
export type MediumId = 'vacuum' | 'air' | 'oil' | 'water';

export const MEDIUM_LABELS: Record<MediumId, string> = {
  vacuum: 'Vacuum',
  air: 'Air',
  oil: 'Oil',
  water: 'Water',
};

/** Relative permittivity of air at 1 atm and room temperature; lossless at radio frequencies. */
const AIR_PERMITTIVITY = 1.00059;

/**
 * Relative permittivity of pure (deionized) water: a single Debye relaxation,
 * ε(ω) = ε∞ + (εs − ε∞)/(1 + jωτ), with the static permittivity from Malmberg & Maryott (1956)
 * and the relaxation time and ε∞ from Stogryn (1971). With the e^{jωt} convention the loss is
 * the negative imaginary part: ε = ε′ − jε″. Valid roughly 0–40 °C and up to a few tens of GHz.
 */
export function waterPermittivity(frequency: number, kelvin: number): Complex {
  const t = Math.min(Math.max(kelvin - 273.15, 0), 100);
  const staticEps = 87.74 - 0.40008 * t + 9.398e-4 * t * t - 1.41e-6 * t * t * t;
  // Stogryn's fit is for 2πτ (s).
  const twoPiTau = 1.1109e-10 - 3.824e-12 * t + 6.938e-14 * t * t - 5.096e-16 * t * t * t;
  const infEps = 4.9;
  const wt = frequency * twoPiTau;
  const d = 1 + wt * wt;
  return complex(infEps + (staticEps - infEps) / d, (-(staticEps - infEps) * wt) / d);
}

/** Relative permittivity of each medium at a frequency, ε′ − jε″. */
export function permittivity(id: MediumId, env: Environment, frequency: number): Complex {
  switch (id) {
    case 'vacuum':
      return complex(1);
    case 'air':
      return complex(AIR_PERMITTIVITY);
    case 'oil':
      return complex(env.oilPermittivity, -env.oilPermittivity * env.oilLossTangent);
    case 'water':
      return waterPermittivity(frequency, env.ambientTemperature);
  }
}

/**
 * The layered surroundings, in a vertical plane: height y = 0 is the oil's top surface, the oil
 * runs down to y = −oilThickness, and water fills everything below. Air (or vacuum, with no
 * layers) above.
 */
export interface Layers {
  /** Heights of the interfaces, top first; empty when the surroundings are uniform. */
  interfaces: number[];
  /** Medium above the first interface, between consecutive ones, and below the last. */
  media: MediumId[];
  /** εr of each entry in media. */
  eps: Complex[];
}

export function layers(env: Environment, frequency: number): Layers {
  const media: MediumId[] =
    env.kind === 'layered' ? ['air', 'oil', 'water'] : [env.kind === 'air' ? 'air' : 'vacuum'];
  const interfaces = env.kind === 'layered' ? [0, -env.oilThickness] : [];
  return { interfaces, media, eps: media.map((m) => permittivity(m, env, frequency)) };
}

/** Index into layers.media of the layer containing height y (boundaries belong to the layer below). */
export function layerIndex(l: Layers, y: number): number {
  let i = 0;
  while (i < l.interfaces.length && y <= l.interfaces[i]) i++;
  return i;
}

/** Convective heat-transfer coefficient from a thin wire to each medium (W/(m²·K)). */
export const CONVECTION: Record<MediumId, number> = {
  vacuum: 0,
  // Natural convection from a sub-millimeter wire in still air: Nu ≈ 0.4–1 on a 0.5 mm diameter.
  air: 30,
  // Still oil and water: an order of magnitude or two better than air.
  oil: 150,
  water: 800,
};
