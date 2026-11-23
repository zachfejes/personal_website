import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FarField } from './physics/solver';

const R = 120;
const CX = 140;
const CY = 140;
const FLOOR_DB = -30;

/**
 * The radiation pattern in a plane through the antenna: relative power (dB) against the angle
 * from its axis (needle up), all the way round. The solver samples 0 ≤ θ ≤ π; the pattern is
 * the same at every angle around the axis.
 */
@Component({
  selector: 'app-polar-pattern',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="polar"
      viewBox="0 0 280 280"
      role="img"
      aria-label="Radiation pattern, relative power in decibels"
    >
      @for (ring of rings; track ring.db) {
        <circle class="polar__ring" [attr.cx]="CX" [attr.cy]="CY" [attr.r]="ring.r" />
        <text class="polar__label" [attr.x]="CX + 3" [attr.y]="CY - ring.r - 2">
          {{ ring.db }} dB
        </text>
      }
      @for (s of spokes; track $index) {
        <line class="polar__ring" [attr.x1]="CX" [attr.y1]="CY" [attr.x2]="s.x" [attr.y2]="s.y" />
      }
      <path class="polar__pattern" [attr.d]="pattern()" />
      <line
        class="polar__needle"
        [attr.x1]="CX"
        [attr.x2]="CX"
        [attr.y1]="CY - 22"
        [attr.y2]="CY + 22"
      />
      <rect class="polar__gap" [attr.x]="CX - 4" [attr.y]="CY - 1.5" width="8" height="3" />
    </svg>
  `,
  styles: `
    .polar {
      display: block;
      width: 100%;
      max-width: 22rem;
      margin-inline: auto;
      font-family: var(--font-label);
    }
    .polar__ring {
      fill: none;
      stroke: rgb(236 229 214 / 14%);
      stroke-dasharray: 2 3;
    }
    .polar__label {
      font-size: 7px;
      fill: var(--color-muted);
    }
    .polar__needle {
      stroke: #e8e6df;
      stroke-width: 2;
    }
    .polar__gap {
      fill: #e3a857;
    }
    .polar__pattern {
      fill: rgb(227 168 87 / 18%);
      stroke: #e3a857;
      stroke-width: 1.5;
    }
  `,
})
export class PolarPattern {
  readonly farField = input.required<FarField>();
  protected readonly CX = CX;
  protected readonly CY = CY;

  protected readonly rings = [0, -10, -20].map((db) => ({
    db,
    r: (R * (db - FLOOR_DB)) / -FLOOR_DB,
  }));

  protected readonly spokes = Array.from({ length: 12 }, (_, k) => ({
    x: CX + R * Math.cos((k * Math.PI) / 6),
    y: CY - R * Math.sin((k * Math.PI) / 6),
  }));

  protected readonly pattern = computed(() => {
    const { theta, intensity } = this.farField();
    const max = Math.max(...intensity) || 1;
    const radius = (u: number) => {
      const db = 10 * Math.log10(Math.max(u / max, 1e-12));
      return (R * Math.max(0, db - FLOOR_DB)) / -FLOOR_DB;
    };
    // θ from 0 (up the needle) to π (down the other arm) on the right, mirrored on the left:
    // the pattern is the same all the way round the axis.
    const n = theta.length;
    const pts: string[] = [];
    const point = (angle: number, u: number) => {
      const r = radius(u);
      pts.push(`${(CX + r * Math.sin(angle)).toFixed(2)},${(CY - r * Math.cos(angle)).toFixed(2)}`);
    };
    for (let i = 0; i < n; i++) point(theta[i], intensity[i]);
    for (let i = n - 1; i >= 0; i--) point(-theta[i], intensity[i]);
    return `M${pts.join('L')}Z`;
  });
}
