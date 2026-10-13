// Pure geometry for the hero star field: seeded stars, and a "survey" trajectory threaded
// through real stars while avoiding the hero text. No DOM access here, so it can be unit tested;
// drawing lives in StarfieldRenderer.

export interface Star {
  x: number;
  y: number;
  /** Radius in px. */
  r: number;
  /** Twinkle phase. */
  p: number;
  /** Twinkle speed. */
  s: number;
}

/** Axis-aligned rectangle: left, top, right, bottom. */
export interface Rect {
  l: number;
  t: number;
  r: number;
  b: number;
}

export interface PathPoint {
  x: number;
  y: number;
  /** Cumulative arc length from the start of the path. */
  d: number;
}

export interface Waypoint {
  star: Star;
  label: string;
  size: number;
}

export type RouteShape = 'beside' | 'under';
export type RouteEnd = 'edge' | 'exit' | 'fade';
export type RouteMode = 'side' | 'hidden';

export interface RouteOptions {
  /** Preferred shape when the route runs beside the text. */
  shape: RouteShape;
  /** How the "under" route ends: off the side, out the bottom, or fading at the content edge. */
  end: RouteEnd;
  /** Minimum free width beside the text, as a % of the content width, to show the route. */
  sideMin: number;
  labels: [string, string];
}

/** The hero's size and the horizontal bounds the route must stay within. */
export interface Frame {
  width: number;
  height: number;
  /** Left/right limits for the route (the content area, slightly widened). */
  left: number;
  right: number;
}

export interface StarRoute {
  mode: RouteMode;
  shape: RouteShape;
  zone: Rect;
  anchors: Star[];
  path: PathPoint[];
  total: number;
  branch: [Star, Star] | null;
  waypoints: Waypoint[];
  /** Stars to render steady and bright (the route's stars). */
  highlighted: Set<Star>;
  /** Horizontal fade toward the content edge, when the route ends with "fade". */
  fade: { x0: number; len: number } | null;
}

/** Deterministic PRNG (Park–Miller), so the sky is the same on every load. */
export function seeded(seed: number): () => number {
  let s = Math.floor(seed * 9973) % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Star count scales with area, so density looks the same at any size. */
export function createStars(width: number, height: number, density: number): Star[] {
  const rand = seeded(7);
  const count = Math.max(12, Math.round(((width * height) / 2600) * density));
  return Array.from({ length: count }, () => ({
    x: rand() * width,
    y: rand() * height,
    r: rand() * 1.2 + 0.3,
    p: rand() * Math.PI * 2,
    s: rand() * 0.8 + 0.4,
  }));
}

/**
 * Show the route beside the text only when there's enough free width to its right; otherwise
 * hide it. A little hysteresis stops it flickering when resizing near the threshold. On short,
 * wide screens (little room above/below the text) a smaller free width is accepted.
 */
export function chooseMode(
  prev: RouteMode,
  freeRight: number,
  need: number,
  band: number,
): RouteMode {
  const hysteresis = prev === 'side' ? -16 : 16;
  if (freeRight >= need + hysteresis) return 'side';
  if (band < 90 && freeRight >= 160) return 'side';
  return 'hidden';
}

/** Catmull-Rom spline through the points, sampled with cumulative arc length. */
export function sampleSpline(pts: { x: number; y: number }[], perSegment = 64): PathPoint[] {
  const out: PathPoint[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    for (let k = 0; k < perSegment; k++) {
      const t = k / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y), d: 0 });
    }
  }
  const last = pts[pts.length - 1];
  out.push({ x: last.x, y: last.y, d: 0 });
  for (let i = 1; i < out.length; i++) {
    out[i].d = out[i - 1].d + Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y);
  }
  return out;
}

/** Point at distance d along the path, interpolated between samples. */
export function pointAt(path: PathPoint[], d: number): { x: number; y: number } {
  let lo = 0;
  let hi = path.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path[mid].d < d) lo = mid;
    else hi = mid;
  }
  const a = path[lo];
  const b = path[hi];
  const f = b.d > a.d ? (d - a.d) / (b.d - a.d) : 0;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

export function insideRect(p: { x: number; y: number }, z: Rect): boolean {
  return p.x > z.l && p.x < z.r && p.y > z.t && p.y < z.b;
}

/** Plan the route around the text zone. Pure: same inputs, same route. */
export function planRoute(
  stars: Star[],
  zone: Rect,
  frame: Frame,
  opts: RouteOptions,
  prevMode: RouteMode,
): StarRoute {
  const H = frame.height;
  const freeRight = frame.right - zone.r;
  const need = Math.max(((frame.right - frame.left) * opts.sideMin) / 100, 240);
  const above = Math.max(0, zone.t);
  const below = Math.max(0, H - zone.b);
  const mode = chooseMode(prevMode, freeRight, need, Math.max(above, below));

  const empty: StarRoute = {
    mode: 'hidden',
    shape: opts.shape,
    zone,
    anchors: [],
    path: [],
    total: 0,
    branch: null,
    waypoints: [],
    highlighted: new Set(),
    fade: null,
  };
  if (mode === 'hidden') return empty;

  // Snap planned anchor positions to the nearest unused star outside the text zone.
  const used = new Set<Star>();
  const snap = ([x, y]: [number, number]): Star => {
    let best: Star | null = null;
    let bestD = Infinity;
    for (const s of stars) {
      if (used.has(s) || insideRect(s, zone)) continue;
      const d = (s.x - x) ** 2 + (s.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    const star = best ?? { x, y, r: 1.5, p: 0, s: 1 };
    used.add(star);
    return star;
  };

  const x0 = zone.r + freeRight * 0.04;
  const fw = frame.right - x0;
  const tw = zone.r - zone.l;
  const P = (fx: number, fy: number): [number, number] => [x0 + fx * fw, fy * H];
  // "under" needs a reasonable band beneath the text; otherwise fall back to "beside".
  const shape: RouteShape = opts.shape === 'under' && below >= 110 ? 'under' : 'beside';

  let anchors: Star[];
  let start: { x: number; y: number };
  let end: { x: number; y: number };
  let branchStar: Star;
  if (shape === 'under') {
    // Down the side, round the text's bottom-right corner, then sweep left beneath it.
    anchors = (
      [
        [x0 + 0.3 * fw, 0.5 * above],
        [x0 + 0.5 * fw, zone.t + 0.6 * (zone.b - zone.t)],
        [zone.r + 0.15 * freeRight, zone.b + 0.45 * below],
        [zone.l + 0.4 * tw, zone.b + 0.55 * below],
      ] as [number, number][]
    ).map(snap);
    start = { x: x0 + 0.25 * fw, y: -24 };
    end =
      opts.end === 'exit'
        ? { x: zone.l + 0.15 * tw, y: H + 24 }
        : { x: frame.left, y: zone.b + 0.4 * below };
    branchStar = snap(P(0.94, 0.3));
  } else {
    // Top to bottom through the free region right of the text.
    anchors = [P(0.18, 0.18), P(0.26, 0.42), P(0.58, 0.58), P(0.44, 0.8)].map(snap);
    start = { x: x0 + 0.1 * fw, y: -24 };
    end = { x: x0 + 0.62 * fw, y: H + 24 };
    branchStar = snap(P(0.94, 0.4));
  }

  const path = sampleSpline([start, ...anchors, end]);
  return {
    mode,
    shape,
    zone,
    anchors,
    path,
    total: path[path.length - 1].d,
    branch: [anchors[2], branchStar],
    waypoints: [
      { star: anchors[0], label: opts.labels[0], size: 15 },
      { star: anchors[2], label: opts.labels[1], size: 10 },
    ],
    highlighted: new Set([...anchors, branchStar]),
    fade:
      shape === 'under' && opts.end === 'fade'
        ? { x0: frame.left + 8, len: Math.max(80, Math.min(280, 0.3 * tw)) }
        : null,
  };
}

/** Smoothstep fade factor (0 at the content edge, 1 once clear of it). */
export function fadeAt(route: StarRoute, x: number): number {
  if (!route.fade) return 1;
  const f = Math.min(1, Math.max(0, (x - route.fade.x0) / route.fade.len));
  return f * f * (3 - 2 * f);
}

/**
 * First label position (up-right, down-right, up-left, down-left) that stays inside the frame
 * and clear of the text zone.
 */
export function placeLabel(
  x: number,
  y: number,
  textWidth: number,
  zone: Rect,
  width: number,
  height: number,
): { sx: number; sy: number; ex: number; ey: number; bx: number; by: number } {
  const dx = 40;
  const dy = 26;
  for (const [sx, sy] of [
    [1, -1],
    [1, 1],
    [-1, -1],
    [-1, 1],
  ]) {
    const ex = x + sx * dx;
    const ey = y + sy * dy;
    const bx = sx > 0 ? ex + 4 : ex - 4 - textWidth;
    const by = sy < 0 ? ey - 14 : ey;
    const inside = bx >= 4 && bx + textWidth <= width - 4 && by >= 4 && by + 14 <= height - 4;
    const clear = bx + textWidth < zone.l || bx > zone.r || by + 14 < zone.t || by > zone.b;
    if (inside && clear) return { sx, sy, ex, ey, bx, by };
  }
  const ex = x + dx;
  const ey = y - dy;
  return { sx: 1, sy: -1, ex, ey, bx: ex + 4, by: ey - 14 };
}
