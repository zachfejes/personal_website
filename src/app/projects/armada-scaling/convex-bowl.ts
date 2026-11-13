import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The drawing's frame and the bowl inside it, in SVG units. */
export const BOWL = {
  view: { width: 320, height: 226 },
  centerX: 140,
  /** Where the rim sits and how deep the bowl goes below it. */
  rimY: 52,
  depth: 132,
  rimRadius: 118,
  /** Ellipses are seen at an angle: their height is this share of their width. */
  tilt: 0.26,
  contours: 5,
  /** Steps along each side of the outline. */
  outlineSteps: 24,
  /** Half the width of the flat tangent drawn at the lowest point, and the dot marking it. */
  tangentHalf: 44,
  minimumRadius: 4,
  /** Labels: gap from what they name, baseline drop, and line spacing. */
  label: { gap: 8, baseline: 4, line: 16 },
} as const;

/** What the geometry needs: the bowl's shape, and how finely to draw it. */
export interface BowlShape {
  centerX: number;
  rimY: number;
  depth: number;
  rimRadius: number;
  tilt: number;
  contours: number;
  outlineSteps: number;
}

export interface Contour {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/**
 * A paraboloid, S = r², seen from slightly above: level contours (equal S) and the side outline.
 * A contour at height h has radius √h, so equal steps in S crowd together towards the rim.
 */
export function bowlGeometry(bowl: BowlShape = BOWL): {
  contours: Contour[];
  outline: string;
  bottom: { x: number; y: number };
} {
  const bottomY = bowl.rimY + bowl.depth;
  const at = (share: number) => ({
    r: bowl.rimRadius * Math.sqrt(share),
    y: bottomY - bowl.depth * share,
  });
  const contours = Array.from({ length: bowl.contours }, (_, i) => {
    const { r, y } = at((i + 1) / bowl.contours);
    return { cx: bowl.centerX, cy: y, rx: r, ry: r * bowl.tilt };
  });
  const side = (direction: number) =>
    Array.from({ length: bowl.outlineSteps + 1 }, (_, i) => {
      const { r, y } = at(i / bowl.outlineSteps);
      return `${bowl.centerX + direction * r},${y}`;
    });
  const outline = `M ${side(-1).reverse().join(' L ')} L ${side(1).slice(1).join(' L ')}`;
  return { contours, outline, bottom: { x: bowl.centerX, y: bottomY } };
}

/** Half an ellipse: the front (nearer, lower) half or the back half. */
const halfEllipse = (c: Contour, front: boolean) =>
  `M ${c.cx - c.rx},${c.cy} A ${c.rx} ${c.ry} 0 0 ${front ? 0 : 1} ${c.cx + c.rx},${c.cy}`;

/**
 * Why least squares has one answer: S, the sum of squared gaps, drawn over every m and c as a
 * bowl. It has a single lowest point, where the slope is zero in every direction.
 */
@Component({
  selector: 'app-convex-bowl',
  template: `
    <figure>
      <svg
        [attr.viewBox]="'0 0 ' + bowl.view.width + ' ' + bowl.view.height"
        role="img"
        aria-label="A bowl-shaped surface with level rings, narrowing to one lowest point."
      >
        <path class="outline" [attr.d]="geometry.outline" />
        @for (c of geometry.contours; track $index) {
          <path class="contour contour--back" [attr.d]="back(c)" />
          <path class="contour" [attr.d]="front(c)" />
        }
        <line
          class="tangent"
          [attr.x1]="geometry.bottom.x - bowl.tangentHalf"
          [attr.x2]="geometry.bottom.x + bowl.tangentHalf"
          [attr.y1]="geometry.bottom.y"
          [attr.y2]="geometry.bottom.y"
        />
        <circle
          class="minimum"
          [attr.cx]="geometry.bottom.x"
          [attr.cy]="geometry.bottom.y"
          [attr.r]="bowl.minimumRadius"
        />
        <text class="label" [attr.x]="labelX" [attr.y]="labelY">Lowest point</text>
        <text class="label label--muted" [attr.x]="labelX" [attr.y]="labelY + bowl.label.line">
          slopes = 0
        </text>
        <text
          class="label label--muted"
          [attr.x]="bowl.centerX - bowl.rimRadius"
          [attr.y]="surfaceLabelY"
        >
          S(m, c)
        </text>
      </svg>
      <figcaption>
        S over every m and c: one bowl, one lowest point. Wherever you start, downhill leads there.
      </figcaption>
    </figure>
  `,
  styleUrl: './convex-bowl.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConvexBowl {
  protected readonly bowl = BOWL;
  protected readonly geometry = bowlGeometry();
  /** Where the minimum's label starts: just past the tangent's right end. */
  protected readonly labelX = this.geometry.bottom.x + BOWL.tangentHalf + BOWL.label.gap;
  protected readonly labelY = this.geometry.bottom.y + BOWL.label.baseline;
  /** The surface's name sits just above the far side of the rim. */
  protected readonly surfaceLabelY = BOWL.rimY - BOWL.rimRadius * BOWL.tilt - BOWL.label.gap;
  protected readonly front = (c: Contour) => halfEllipse(c, true);
  protected readonly back = (c: Contour) => halfEllipse(c, false);
}
