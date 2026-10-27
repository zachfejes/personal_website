import { CalloutPlacement, leaderPath } from './hero-layout';

const HUB = { x: 500, y: 300 };
const BOX = { width: 200, anchorDrop: 20, shelf: 50 };

describe('leaderPath', () => {
  it('leads from the right edge of a box left of the hub', () => {
    // Box spans x 0–200, so the line starts at (200, 100 + 20), shelves to x 250, then aims at the target.
    const LEFT: CalloutPlacement = { at: { x: 0, y: 100 }, target: { x: 400, y: 200 } };
    expect(leaderPath(LEFT, HUB, BOX)).toBe('M200 120 H250 L400 200');
  });

  it('leads from the left edge of a box right of the hub', () => {
    const RIGHT: CalloutPlacement = { at: { x: 800, y: 100 }, target: { x: 600, y: 200 } };
    expect(leaderPath(RIGHT, HUB, BOX)).toBe('M800 120 H750 L600 200');
  });

  it('never shelves past its target', () => {
    // The target is only 30 units out, closer than the 50-unit shelf: the line runs level to it.
    const NEAR: CalloutPlacement = { at: { x: 0, y: 100 }, target: { x: 230, y: 120 } };
    expect(leaderPath(NEAR, HUB, BOX)).toBe('M200 120 H230 L230 120');
  });
});
