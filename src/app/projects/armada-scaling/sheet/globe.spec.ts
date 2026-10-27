import { GlobeOptions, globe } from './globe';

const OPTIONS: GlobeOptions = {
  width: 800,
  height: 300,
  top: 100,
  radius: 1000,
  tilt: 0.3,
  latitudeStep: 10,
  longitudeStep: 15,
  minLatitude: 20,
  tick: { gap: 5, minor: 10, major: 20 },
};

/** Floating-point slack for "on the circle". */
const SLACK_PX = 0.5;

const points = (d: string) =>
  [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));

describe('globe', () => {
  const g = globe(OPTIONS);

  it('rises into the strip with its top where asked, centred', () => {
    expect(g.cx).toBe(OPTIONS.width / 2);
    expect(g.cy - g.radius).toBe(OPTIONS.top);
  });

  it('draws grid lines only on the face of the globe, inside the strip', () => {
    expect(g.grid.length).toBeGreaterThan(0);
    for (const d of g.grid) {
      for (const p of points(d)) {
        expect(Math.hypot(p.x - g.cx, p.y - g.cy)).toBeLessThanOrEqual(g.radius + SLACK_PX);
        expect(p.y).toBeLessThanOrEqual(OPTIONS.height);
      }
    }
  });

  it('puts ticks just outside the limb, longer every tenth degree', () => {
    const { gap, minor, major } = OPTIONS.tick;
    for (const t of g.ticks) {
      expect(Math.hypot(t.x1 - g.cx, t.y1 - g.cy)).toBeCloseTo(g.radius + gap);
      const length = Math.hypot(t.x2 - t.x1, t.y2 - t.y1);
      expect(length).toBeCloseTo(t.major ? major : minor);
    }
    // The tick straight up is a major one.
    const top = g.ticks.find((t) => Math.abs(t.x1 - g.cx) < SLACK_PX);
    expect(top?.major).toBe(true);
  });

  it('spans the strip with ticks from edge to edge', () => {
    const xs = g.ticks.map((t) => t.x1);
    // A degree of limb here is about 17 px, so the outermost ticks sit within that of each edge.
    const DEGREE_PX = (g.radius * Math.PI) / 180;
    expect(Math.min(...xs)).toBeLessThan(DEGREE_PX);
    expect(Math.max(...xs)).toBeGreaterThan(OPTIONS.width - DEGREE_PX);
  });
});
