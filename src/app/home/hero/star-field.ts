// Pure geometry for the hero star field: seeded stars, and a "survey" trajectory threaded
// through real stars while avoiding the hero text. No DOM access here, so it can be unit tested;
// drawing lives in StarfieldRenderer.

// ---- Tuning constants (values from the Hero Tuner; see design/hero-baseline.json) ----

/** Park–Miller "minimal standard" PRNG constants. */
const PRNG = { multiplier: 16807, modulus: 2147483647, seedScale: 9973 } as const;

const STAR_FIELD = {
  /** Fixed seed, so the sky is identical on every load. */
  seed: 7,
  minStars: 12,
  /** One star per this many square pixels at density 1. */
  areaPerStarPx: 2600,
  radius: { min: 0.3, range: 1.2 },
  twinkleSpeed: { min: 0.4, range: 0.8 },
} as const;

/** Radius etc. for a planned anchor when no real star is available to snap to. */
const FALLBACK_STAR: Omit<Star, 'x' | 'y'> = { r: 1.5, p: 0, s: 1 };

const MODE = {
  /** Keeps the layout from flickering when resizing near the threshold. */
  hysteresisPx: 16,
  /** Absolute minimum free width beside the text for the route. */
  minSideWidthPx: 240,
  /** Below this band above/below the text, a screen counts as "short"… */
  shortBandPx: 90,
  /** …and a narrower free width beside the text is accepted. */
  shortScreenMinFreePx: 160,
} as const;

const PERCENT = 100;
const SAMPLES_PER_SEGMENT = 64;
/** Start/end points sit this far outside the hero so the route enters and leaves cleanly. */
const OFFSCREEN_PX = 24;
/** Gap between the text zone and the route's free region, as a fraction of the free width. */
const ROUTE_GAP_FRACTION = 0.04;
/** "under" needs at least this much room beneath the text; otherwise it falls back to "beside". */
const UNDER_MIN_BAND_PX = 110;

/**
 * "beside": top to bottom through the free region right of the text. Anchor positions are
 * fractions of the free region's width (x) and the hero's height (y).
 */
const BESIDE = {
  anchors: [
    [0.18, 0.18],
    [0.26, 0.42],
    [0.58, 0.58],
    [0.44, 0.8],
  ],
  startX: 0.1,
  endX: 0.62,
  branch: [0.94, 0.4],
} as const;

/**
 * "under": down the side, round the text's bottom-right corner, then sweep left beneath it.
 * Each anchor names the fraction it uses and what it's a fraction of.
 */
const UNDER = {
  downSide: { freeWidth: 0.3, bandAbove: 0.5 },
  besideText: { freeWidth: 0.5, textHeight: 0.6 },
  roundCorner: { freeRight: 0.15, bandBelow: 0.45 },
  underText: { textWidth: 0.4, bandBelow: 0.55 },
  startFreeWidth: 0.25,
  /** "exit" ending: leaves through the bottom, this far across the text. */
  exitTextWidth: 0.15,
  /** "edge"/"fade" ending: reaches the content edge this far down the band below the text. */
  edgeBandBelow: 0.4,
  branch: [0.94, 0.3],
} as const;

/** Which anchors carry the two waypoint rings, their ring sizes, and where the branch leaves. */
const WAYPOINTS = {
  primaryAnchor: 0,
  secondaryAnchor: 2,
  primarySize: 15,
  secondarySize: 10,
} as const;
const BRANCH_FROM_ANCHOR = 2;

/** "fade" ending: the line fades out over a length tied to the text width, within limits. */
const FADE = { insetPx: 8, minLengthPx: 80, maxLengthPx: 280, textWidthFraction: 0.3 } as const;

/** Waypoint label placement (leader-line offset and the label's box). */
const LABEL = { offsetX: 40, offsetY: 26, gapPx: 4, heightPx: 14, marginPx: 4 } as const;
/** Label directions tried in order: up-right, down-right, up-left, down-left. */
const LABEL_DIRECTIONS = [
  [1, -1],
  [1, 1],
  [-1, -1],
  [-1, 1],
] as const;

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
  let s = Math.floor(seed * PRNG.seedScale) % PRNG.modulus || 1;
  return () => (s = (s * PRNG.multiplier) % PRNG.modulus) / PRNG.modulus;
}

/** Star count scales with area, so density looks the same at any size. */
export function createStars(width: number, height: number, density: number): Star[] {
  const rand = seeded(STAR_FIELD.seed);
  const count = Math.max(
    STAR_FIELD.minStars,
    Math.round(((width * height) / STAR_FIELD.areaPerStarPx) * density),
  );
  return Array.from({ length: count }, () => ({
    x: rand() * width,
    y: rand() * height,
    r: rand() * STAR_FIELD.radius.range + STAR_FIELD.radius.min,
    p: rand() * Math.PI * 2,
    s: rand() * STAR_FIELD.twinkleSpeed.range + STAR_FIELD.twinkleSpeed.min,
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
  const hysteresis = prev === 'side' ? -MODE.hysteresisPx : MODE.hysteresisPx;
  if (freeRight >= need + hysteresis) return 'side';
  if (band < MODE.shortBandPx && freeRight >= MODE.shortScreenMinFreePx) return 'side';
  return 'hidden';
}

/** Catmull-Rom spline through the points, sampled with cumulative arc length. */
export function sampleSpline(
  pts: { x: number; y: number }[],
  perSegment = SAMPLES_PER_SEGMENT,
): PathPoint[] {
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
      // Uniform Catmull-Rom basis (its coefficients are part of the formula, not tuning).
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
  const need = Math.max(((frame.right - frame.left) * opts.sideMin) / PERCENT, MODE.minSideWidthPx);
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
    const star = best ?? { x, y, ...FALLBACK_STAR };
    used.add(star);
    return star;
  };

  const x0 = zone.r + freeRight * ROUTE_GAP_FRACTION;
  const fw = frame.right - x0;
  const tw = zone.r - zone.l;
  const P = (fx: number, fy: number): [number, number] => [x0 + fx * fw, fy * H];
  // "under" needs a reasonable band beneath the text; otherwise fall back to "beside".
  const shape: RouteShape =
    opts.shape === 'under' && below >= UNDER_MIN_BAND_PX ? 'under' : 'beside';

  let anchors: Star[];
  let start: { x: number; y: number };
  let end: { x: number; y: number };
  let branchStar: Star;
  if (shape === 'under') {
    // Down the side, round the text's bottom-right corner, then sweep left beneath it.
    anchors = (
      [
        [x0 + UNDER.downSide.freeWidth * fw, UNDER.downSide.bandAbove * above],
        [
          x0 + UNDER.besideText.freeWidth * fw,
          zone.t + UNDER.besideText.textHeight * (zone.b - zone.t),
        ],
        [
          zone.r + UNDER.roundCorner.freeRight * freeRight,
          zone.b + UNDER.roundCorner.bandBelow * below,
        ],
        [zone.l + UNDER.underText.textWidth * tw, zone.b + UNDER.underText.bandBelow * below],
      ] as [number, number][]
    ).map(snap);
    start = { x: x0 + UNDER.startFreeWidth * fw, y: -OFFSCREEN_PX };
    end =
      opts.end === 'exit'
        ? { x: zone.l + UNDER.exitTextWidth * tw, y: H + OFFSCREEN_PX }
        : { x: frame.left, y: zone.b + UNDER.edgeBandBelow * below };
    branchStar = snap(P(...UNDER.branch));
  } else {
    // Top to bottom through the free region right of the text.
    anchors = BESIDE.anchors.map(([fx, fy]) => snap(P(fx, fy)));
    start = { x: x0 + BESIDE.startX * fw, y: -OFFSCREEN_PX };
    end = { x: x0 + BESIDE.endX * fw, y: H + OFFSCREEN_PX };
    branchStar = snap(P(...BESIDE.branch));
  }

  const path = sampleSpline([start, ...anchors, end]);
  return {
    mode,
    shape,
    zone,
    anchors,
    path,
    total: path[path.length - 1].d,
    branch: [anchors[BRANCH_FROM_ANCHOR], branchStar],
    waypoints: [
      {
        star: anchors[WAYPOINTS.primaryAnchor],
        label: opts.labels[0],
        size: WAYPOINTS.primarySize,
      },
      {
        star: anchors[WAYPOINTS.secondaryAnchor],
        label: opts.labels[1],
        size: WAYPOINTS.secondarySize,
      },
    ],
    highlighted: new Set([...anchors, branchStar]),
    fade:
      shape === 'under' && opts.end === 'fade'
        ? {
            x0: frame.left + FADE.insetPx,
            len: Math.max(
              FADE.minLengthPx,
              Math.min(FADE.maxLengthPx, FADE.textWidthFraction * tw),
            ),
          }
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
  const { offsetX, offsetY, gapPx, heightPx, marginPx } = LABEL;
  for (const [sx, sy] of LABEL_DIRECTIONS) {
    const ex = x + sx * offsetX;
    const ey = y + sy * offsetY;
    const bx = sx > 0 ? ex + gapPx : ex - gapPx - textWidth;
    const by = sy < 0 ? ey - heightPx : ey;
    const inside =
      bx >= marginPx &&
      bx + textWidth <= width - marginPx &&
      by >= marginPx &&
      by + heightPx <= height - marginPx;
    const clear = bx + textWidth < zone.l || bx > zone.r || by + heightPx < zone.t || by > zone.b;
    if (inside && clear) return { sx, sy, ex, ey, bx, by };
  }
  // Nothing fits cleanly: fall back to the first direction (up-right).
  const [sx, sy] = LABEL_DIRECTIONS[0];
  const ex = x + sx * offsetX;
  const ey = y + sy * offsetY;
  return { sx, sy, ex, ey, bx: ex + gapPx, by: ey - heightPx };
}
