import {
  Frame,
  Rect,
  RouteOptions,
  createStars,
  fadeAt,
  insideRect,
  planRoute,
  pointAt,
  sampleSpline,
} from './star-field';

/** The hero's settings (design/hero-baseline.json). */
const DENSITY = 3;
const SIDE_MIN_PERCENT = 35;

const FULLY_FADED = 0;
const FULLY_VISIBLE = 1;

const opts = (over: Partial<RouteOptions> = {}): RouteOptions => ({
  shape: 'under',
  end: 'fade',
  sideMin: SIDE_MIN_PERCENT,
  labels: ['WP-01', 'WP-02'],
  ...over,
});

interface Layout {
  name: string;
  frame: Frame;
  zone: Rect;
}

// Text zones roughly as measured in the browser for the baseline hero at each size.
const DESKTOP: Layout = {
  name: '1440x835',
  frame: { width: 1440, height: 835, left: -24, right: 1394 },
  zone: { l: 66, t: 245, r: 640, b: 590 },
};
const ULTRAWIDE: Layout = {
  name: '2560x1375',
  frame: { width: 2560, height: 1375, left: 342, right: 2218 },
  zone: { l: 386, t: 510, r: 960, b: 865 },
};
const LAYOUTS: Layout[] = [
  DESKTOP,
  {
    name: '1920x1015',
    frame: { width: 1920, height: 1015, left: -24, right: 1874 },
    zone: { l: 66, t: 330, r: 640, b: 685 },
  },
  ULTRAWIDE,
  {
    name: '1024x703',
    frame: { width: 1024, height: 703, left: -24, right: 1003 },
    zone: { l: 41, t: 190, r: 560, b: 510 },
  },
];

/** A phone: the text spans the whole width. */
const PHONE: Layout = {
  name: '390x745',
  frame: { width: 390, height: 745, left: -24, right: 366 },
  zone: { l: 0, t: 170, r: 380, b: 580 },
};

const starsFor = ({ frame }: Layout) => createStars(frame.width, frame.height, DENSITY);

describe('planRoute', () => {
  for (const layout of LAYOUTS) {
    for (const shape of ['beside', 'under'] as const) {
      it(`keeps the ${shape} route out of the text at ${layout.name}`, () => {
        const { frame, zone } = layout;
        const route = planRoute(starsFor(layout), zone, frame, opts({ shape }), 'side');
        expect(route.mode).toBe('side');
        expect(route.path.filter((p) => insideRect(p, zone))).toEqual([]);
        for (const s of route.anchors) expect(insideRect(s, zone)).toBe(false);
      });
    }
  }

  it('hides the route when there is no room beside the text', () => {
    const { frame, zone } = PHONE;
    const route = planRoute(starsFor(PHONE), zone, frame, opts(), 'side');
    expect(route.mode).toBe('hidden');
    expect(route.path).toEqual([]);
    expect(route.highlighted.size).toBe(0);
  });

  it('fades the under route to zero at the content edge', () => {
    const { frame, zone } = ULTRAWIDE;
    const route = planRoute(starsFor(ULTRAWIDE), zone, frame, opts(), 'side');
    expect(route.fade).not.toBeNull();
    const end = route.path[route.path.length - 1];
    expect(fadeAt(route, end.x)).toBe(FULLY_FADED);
    expect(fadeAt(route, zone.r)).toBe(FULLY_VISIBLE);
  });

  it('exits through the bottom edge with end = exit', () => {
    const { frame, zone } = DESKTOP;
    const route = planRoute(starsFor(DESKTOP), zone, frame, opts({ end: 'exit' }), 'side');
    expect(route.path[route.path.length - 1].y).toBeGreaterThan(frame.height);
    expect(route.fade).toBeNull();
  });
});

describe('pointAt', () => {
  const WAVY_LINE = [
    { x: 0, y: 0 },
    { x: 100, y: 50 },
    { x: 200, y: 0 },
    { x: 300, y: 80 },
  ];
  const STEP_PX = 2;
  /** Stay clear of the ends, where the position clamps. */
  const END_CLEARANCE_PX = 10;
  /** toBeCloseTo precision: within 0.05 px. */
  const DECIMAL_PLACES = 1;

  it('moves at a constant rate along the path', () => {
    const path = sampleSpline(WAVY_LINE);
    const length = path[path.length - 1].d;
    let prev = pointAt(path, END_CLEARANCE_PX);
    for (let d = END_CLEARANCE_PX + STEP_PX; d < length - END_CLEARANCE_PX; d += STEP_PX) {
      const p = pointAt(path, d);
      expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeCloseTo(STEP_PX, DECIMAL_PLACES);
      prev = p;
    }
  });
});
