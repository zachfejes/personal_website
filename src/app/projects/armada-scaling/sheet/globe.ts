/** A straight tick mark from (x1, y1) to (x2, y2). */
export interface Tick {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Every tenth degree is longer. */
  major: boolean;
}

export interface GlobeOptions {
  /** Size of the strip the globe is drawn in, px. */
  width: number;
  height: number;
  /** How far down the strip the top of the globe sits, px. */
  top: number;
  radius: number;
  /** Tilt toward the viewer, radians: how much of the top of the globe shows. */
  tilt: number;
  /** Degrees between latitude lines, and between longitude lines. */
  latitudeStep: number;
  longitudeStep: number;
  /** Lowest latitude drawn, degrees: lines further down are hidden by the strip's bottom anyway. */
  minLatitude: number;
  /** Ticks along the limb: gap from the limb, short and long lengths, px. */
  tick: { gap: number; minor: number; major: number };
}

export interface Globe {
  cx: number;
  cy: number;
  radius: number;
  /** Latitude and longitude lines on the visible face, as SVG path data. */
  grid: string[];
  /** Gauge ticks around the limb, one per degree across the strip's width. */
  ticks: Tick[];
}

const DEG = Math.PI / 180;
const HALF_TURN_DEG = 180;
const QUARTER_TURN_DEG = 90;
const MAJOR_EVERY_DEG = 10;
/** Points per degree along each line: enough for smooth curves at this size. */
const SAMPLES_PER_DEG = 1;

/**
 * A wireframe planet rising into a strip: the top of a sphere tilted toward the viewer, its
 * latitude and longitude lines on the face that shows, and degree ticks around its edge like a
 * gauge. Pure geometry: the caller draws it.
 */
export function globe(o: GlobeOptions): Globe {
  const cx = o.width / 2;
  const cy = o.top + o.radius;
  const cosT = Math.cos(o.tilt);
  const sinT = Math.sin(o.tilt);

  // A point on the sphere, tilted toward the viewer and seen straight on.
  const project = (latDeg: number, lonDeg: number) => {
    const lat = latDeg * DEG;
    const lon = lonDeg * DEG;
    const x = o.radius * Math.cos(lat) * Math.sin(lon);
    const y = o.radius * Math.sin(lat);
    const z = o.radius * Math.cos(lat) * Math.cos(lon);
    return { x: cx + x, y: cy - (y * cosT - z * sinT), front: y * sinT + z * cosT > 0 };
  };

  // Path data for a line, broken wherever it goes round the back or below the strip.
  const line = (points: { x: number; y: number; front: boolean }[]) => {
    let d = '';
    let drawing = false;
    for (const p of points) {
      if (p.front && p.y <= o.height) {
        d += `${drawing ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        drawing = true;
      } else {
        drawing = false;
      }
    }
    return d;
  };

  const grid: string[] = [];
  for (let lat = o.minLatitude; lat < QUARTER_TURN_DEG; lat += o.latitudeStep) {
    const points = [];
    for (let lon = -HALF_TURN_DEG; lon <= HALF_TURN_DEG; lon += 1 / SAMPLES_PER_DEG) {
      points.push(project(lat, lon));
    }
    grid.push(line(points));
  }
  for (let lon = -HALF_TURN_DEG; lon < HALF_TURN_DEG; lon += o.longitudeStep) {
    const points = [];
    for (let lat = o.minLatitude; lat <= QUARTER_TURN_DEG; lat += 1 / SAMPLES_PER_DEG) {
      points.push(project(lat, lon));
    }
    grid.push(line(points));
  }

  // Ticks every degree over the arc of the limb that crosses the strip.
  const ticks: Tick[] = [];
  const spanDeg = Math.floor(Math.asin(Math.min(1, cx / o.radius)) / DEG);
  for (let a = -spanDeg; a <= spanDeg; a++) {
    const angle = (a - QUARTER_TURN_DEG) * DEG;
    const major = a % MAJOR_EVERY_DEG === 0;
    const inner = o.radius + o.tick.gap;
    const outer = inner + (major ? o.tick.major : o.tick.minor);
    ticks.push({
      x1: cx + inner * Math.cos(angle),
      y1: cy + inner * Math.sin(angle),
      x2: cx + outer * Math.cos(angle),
      y2: cy + outer * Math.sin(angle),
      major,
    });
  }

  return { cx, cy, radius: o.radius, grid: grid.filter(Boolean), ticks };
}
