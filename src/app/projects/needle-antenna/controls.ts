import { NeedleParams } from './physics/model';

/** A numeric parameter the reader can change, and how it is shown. */
export interface ParamControl {
  /** Where the value lives in NeedleParams, e.g. "geometry.length". */
  path: `${keyof NeedleParams}.${string}`;
  label: string;
  /** Unit shown to the reader, and how many SI units one display unit is. */
  unit: string;
  factor: number;
  min: (p: NeedleParams) => number;
  max: (p: NeedleParams) => number;
  log: boolean;
  hint?: string;
  /** Only shown when the surroundings are layered (air, oil, water). */
  layeredOnly?: boolean;
}

export interface ControlGroup {
  id: string;
  title: string;
  controls: readonly ParamControl[];
}

const fixed = (v: number) => () => v;

export const CONTROL_GROUPS: readonly ControlGroup[] = [
  {
    id: 'geometry',
    title: 'Antenna',
    controls: [
      {
        path: 'geometry.length',
        label: 'Total length',
        unit: 'mm',
        factor: 1e-3,
        min: fixed(2e-3),
        max: fixed(2),
        log: true,
        hint: 'Point to rounded end, both arms together.',
      },
      {
        path: 'geometry.feedPosition',
        label: 'Feed position',
        unit: '% from rounded end',
        factor: 0.01,
        min: fixed(0.02),
        max: fixed(0.98),
        log: false,
        hint: '50 % is center-fed. The needle arm runs from the feed to the point.',
      },
      {
        path: 'geometry.radius',
        label: 'Shaft radius',
        unit: 'mm',
        factor: 1e-3,
        min: fixed(5e-6),
        max: (p) => Math.min(10e-3, p.geometry.length / 8),
        log: true,
      },
      {
        path: 'geometry.taperLength',
        label: 'Point taper length',
        unit: 'mm',
        factor: 1e-3,
        min: fixed(0),
        max: (p) => p.geometry.length * (1 - p.geometry.feedPosition),
        log: false,
        hint: '0 gives a blunt rod. At most the length of the needle arm.',
      },
      {
        path: 'geometry.tipRadius',
        label: 'Point radius',
        unit: 'µm',
        factor: 1e-6,
        min: fixed(0.05e-6),
        max: (p) => p.geometry.radius,
        log: true,
      },
    ],
  },
  {
    id: 'drive',
    title: 'Driving circuit',
    controls: [
      {
        path: 'drive.voltage',
        label: 'Source voltage (peak)',
        unit: 'V',
        factor: 1,
        min: fixed(1e-3),
        max: fixed(1e4),
        log: true,
      },
      {
        path: 'drive.frequency',
        label: 'Frequency',
        unit: 'MHz',
        factor: 1e6,
        min: fixed(1e6),
        max: fixed(100e9),
        log: true,
      },
      {
        path: 'drive.phaseDeg',
        label: 'Phase',
        unit: '°',
        factor: 1,
        min: fixed(-180),
        max: fixed(180),
        log: false,
        hint: 'Shifts the time origin of the animation; steady-state magnitudes do not depend on it.',
      },
      {
        path: 'drive.feedResistance',
        label: 'Feed resistance',
        unit: 'Ω',
        factor: 1,
        min: fixed(0),
        max: fixed(200),
        log: false,
        hint: 'In series with the ideal source: its internal and contact resistance.',
      },
      {
        path: 'drive.feedReactance',
        label: 'Feed reactance',
        unit: 'Ω',
        factor: 1,
        min: fixed(-500),
        max: fixed(500),
        log: false,
        hint: 'In series with the source; positive is inductive. Use it to tune out the needle’s reactance.',
      },
      {
        path: 'drive.baseCapacitance',
        label: 'Gap capacitance',
        unit: 'pF',
        factor: 1e-12,
        min: fixed(0),
        max: fixed(10),
        log: false,
        hint: 'Shunt capacitance across the feed gap, e.g. the source’s own terminals.',
      },
    ],
  },
  {
    id: 'material',
    title: 'Needle material',
    controls: [
      {
        path: 'material.resistivity',
        label: 'Resistivity',
        unit: 'nΩ·m',
        factor: 1e-9,
        min: fixed(1e-9),
        max: fixed(1e-4),
        log: true,
      },
      {
        path: 'material.relPermeability',
        label: 'Relative permeability',
        unit: 'μr',
        factor: 1,
        min: fixed(1),
        max: fixed(5000),
        log: true,
        hint: 'Raises surface resistance and internal inductance by thinning the skin depth.',
      },
      {
        path: 'material.thermalConductivity',
        label: 'Thermal conductivity',
        unit: 'W/(m·K)',
        factor: 1,
        min: fixed(1),
        max: fixed(500),
        log: true,
      },
      {
        path: 'material.emissivity',
        label: 'Emissivity',
        unit: '',
        factor: 1,
        min: fixed(0.01),
        max: fixed(1),
        log: false,
      },
    ],
  },
  {
    id: 'environment',
    title: 'Environment',
    controls: [
      {
        path: 'environment.tiltDeg',
        label: 'Angle to the surface',
        unit: '°',
        factor: 1,
        min: fixed(10),
        max: fixed(90),
        log: false,
        hint: '90° goes straight down into the liquid; 10° nearly skims its surface.',
      },
      {
        path: 'environment.tipDepth',
        label: 'Apex depth below the surface',
        unit: 'mm',
        factor: 1e-3,
        min: fixed(0),
        max: (p) => Math.max(1e-3, p.geometry.length),
        log: false,
        hint: 'Measured straight down from the oil’s top surface.',
        layeredOnly: true,
      },
      {
        path: 'environment.oilThickness',
        label: 'Oil layer thickness',
        unit: 'mm',
        factor: 1e-3,
        min: fixed(0.05e-3),
        max: fixed(50e-3),
        log: true,
        layeredOnly: true,
      },
      {
        path: 'environment.oilPermittivity',
        label: 'Oil permittivity',
        unit: 'εr',
        factor: 1,
        min: fixed(1.5),
        max: fixed(5),
        log: false,
        hint: 'Mineral oil ≈ 2.2, vegetable oils ≈ 2.5–3.',
        layeredOnly: true,
      },
      {
        path: 'environment.oilLossTangent',
        label: 'Oil loss tangent',
        unit: 'tan δ',
        factor: 1,
        min: fixed(1e-5),
        max: fixed(0.2),
        log: true,
        hint: 'Clean mineral oil ≈ 10⁻⁴–10⁻³ at GHz; vegetable oils lose more (≈ 0.05–0.15).',
        layeredOnly: true,
      },
      {
        path: 'environment.ambientTemperature',
        label: 'Surroundings temperature',
        unit: 'K',
        factor: 1,
        min: fixed(273.15),
        max: fixed(373.15),
        log: false,
        hint: 'Air, oil and water; it also sets the water’s permittivity.',
      },
    ],
  },
];

export function getParam(p: NeedleParams, path: ParamControl['path']): number {
  const [group, key] = path.split('.') as [keyof NeedleParams, string];
  return (p[group] as unknown as Record<string, number>)[key];
}

/** A copy of the parameters with one value changed, keeping the geometry consistent. */
export function setParam(p: NeedleParams, path: ParamControl['path'], value: number): NeedleParams {
  const [group, key] = path.split('.') as [keyof NeedleParams, string];
  const next: NeedleParams = { ...p, [group]: { ...p[group], [key]: value } };
  const g = { ...next.geometry };
  g.radius = Math.min(g.radius, g.length / 8);
  // Keep both arms at least two radii long, and the point within the needle arm.
  const edge = Math.min(0.45, (2 * g.radius) / g.length);
  g.feedPosition = Math.min(Math.max(g.feedPosition, edge), 1 - edge);
  g.taperLength = Math.min(Math.max(g.taperLength, 0), g.length * (1 - g.feedPosition));
  g.tipRadius = Math.min(g.tipRadius, g.radius);
  return { ...next, geometry: g };
}

/** Slider position (0–1000) for a value, and back. */
export const SLIDER_STEPS = 1000;

export function toSlider(c: ParamControl, p: NeedleParams, value: number): number {
  const lo = c.min(p);
  const hi = c.max(p);
  if (hi <= lo) return 0;
  const t = c.log
    ? Math.log(Math.max(value, lo) / lo) / Math.log(hi / lo)
    : (value - lo) / (hi - lo);
  return Math.round(Math.min(1, Math.max(0, t)) * SLIDER_STEPS);
}

export function fromSlider(c: ParamControl, p: NeedleParams, position: number): number {
  const lo = c.min(p);
  const hi = c.max(p);
  const t = position / SLIDER_STEPS;
  const v = c.log ? lo * Math.pow(hi / lo, t) : lo + (hi - lo) * t;
  // Round to three significant figures so the boxes read cleanly.
  return v === 0 ? 0 : +v.toPrecision(3);
}
