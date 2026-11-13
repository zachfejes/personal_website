import { render, screen } from '@testing-library/angular';
import { BOWL, ConvexBowl, bowlGeometry } from './convex-bowl';

const DIGITS = 9;

describe('bowlGeometry', () => {
  const { contours, bottom } = bowlGeometry();
  const rim = contours[contours.length - 1];

  it('puts the lowest point at the bowl centre, a full depth below the rim', () => {
    expect(bottom).toEqual({ x: BOWL.centerX, y: BOWL.rimY + BOWL.depth });
    expect(rim.cy).toBeCloseTo(BOWL.rimY, DIGITS);
    expect(rim.rx).toBeCloseTo(BOWL.rimRadius, DIGITS);
  });

  it('is a paraboloid: a ring at half the depth has radius rim ÷ √2', () => {
    // Height grows with radius squared, so the ring halfway up is 1/√2 of the rim's radius.
    const HALF = { ...BOWL, contours: 2 };
    const [halfway] = bowlGeometry(HALF).contours;
    expect(halfway.cy).toBeCloseTo(BOWL.rimY + BOWL.depth / 2, DIGITS);
    expect(halfway.rx).toBeCloseTo(BOWL.rimRadius / Math.SQRT2, DIGITS);
  });
});

describe('ConvexBowl', () => {
  it('describes the drawing and marks the lowest point', async () => {
    await render(ConvexBowl);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('one lowest point');
    expect(screen.getByText('Lowest point')).toBeTruthy();
  });
});
