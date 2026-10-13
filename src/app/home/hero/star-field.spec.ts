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

const opts = (over: Partial<RouteOptions> = {}): RouteOptions => ({
  shape: 'under',
  end: 'fade',
  sideMin: 35,
  labels: ['WP-01', 'WP-02'],
  ...over,
});

// Text zones roughly as measured in the browser for the baseline hero at each size.
const layouts: { name: string; frame: Frame; zone: Rect }[] = [
  {
    name: '1440x835',
    frame: { width: 1440, height: 835, left: -24, right: 1394 },
    zone: { l: 66, t: 245, r: 640, b: 590 },
  },
  {
    name: '1920x1015',
    frame: { width: 1920, height: 1015, left: -24, right: 1874 },
    zone: { l: 66, t: 330, r: 640, b: 685 },
  },
  {
    name: '2560x1375',
    frame: { width: 2560, height: 1375, left: 342, right: 2218 },
    zone: { l: 386, t: 510, r: 960, b: 865 },
  },
  {
    name: '1024x703',
    frame: { width: 1024, height: 703, left: -24, right: 1003 },
    zone: { l: 41, t: 190, r: 560, b: 510 },
  },
];

describe('planRoute', () => {
  for (const { name, frame, zone } of layouts) {
    for (const shape of ['beside', 'under'] as const) {
      it(`keeps the ${shape} route out of the text at ${name}`, () => {
        const stars = createStars(frame.width, frame.height, 3);
        const route = planRoute(stars, zone, frame, opts({ shape }), 'side');
        expect(route.mode).toBe('side');
        expect(route.path.filter((p) => insideRect(p, zone)).length).toBe(0);
        for (const s of route.anchors) expect(insideRect(s, zone)).toBe(false);
      });
    }
  }

  it('hides the route when there is no room beside the text', () => {
    const frame: Frame = { width: 390, height: 745, left: -24, right: 366 };
    const zone: Rect = { l: 0, t: 170, r: 380, b: 580 };
    const route = planRoute(createStars(390, 745, 3), zone, frame, opts(), 'side');
    expect(route.mode).toBe('hidden');
    expect(route.path.length).toBe(0);
    expect(route.highlighted.size).toBe(0);
  });

  it('fades the under route to zero at the content edge', () => {
    const { frame, zone } = layouts[2];
    const route = planRoute(createStars(frame.width, frame.height, 3), zone, frame, opts(), 'side');
    expect(route.fade).not.toBeNull();
    const end = route.path[route.path.length - 1];
    expect(fadeAt(route, end.x)).toBe(0);
    expect(fadeAt(route, zone.r)).toBe(1);
  });

  it('exits through the bottom edge with end = exit', () => {
    const { frame, zone } = layouts[0];
    const route = planRoute(
      createStars(frame.width, frame.height, 3),
      zone,
      frame,
      opts({ end: 'exit' }),
      'side',
    );
    expect(route.path[route.path.length - 1].y).toBeGreaterThan(frame.height);
    expect(route.fade).toBeNull();
  });
});

describe('pointAt', () => {
  it('moves at a constant rate along the path', () => {
    const path = sampleSpline([
      { x: 0, y: 0 },
      { x: 100, y: 50 },
      { x: 200, y: 0 },
      { x: 300, y: 80 },
    ]);
    const steps: number[] = [];
    let prev = pointAt(path, 10);
    for (let d = 12; d < path[path.length - 1].d - 10; d += 2) {
      const p = pointAt(path, d);
      steps.push(Math.hypot(p.x - prev.x, p.y - prev.y));
      prev = p;
    }
    for (const s of steps) expect(s).toBeCloseTo(2, 1);
  });
});
