import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FarField } from './physics/solver';

const R = 120;
const CX = 140;
const CY = 136;
const FLOOR_DB = -30;

/**
 * The radiation pattern in a plane through the needle: relative power (dB) against the angle
 * from the axis, over the half-space above the ground plane.
 */
@Component({
  selector: 'app-polar-pattern',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="polar"
      viewBox="0 0 280 150"
      role="img"
      aria-label="Radiation pattern, relative power in decibels"
    >
      @for (ring of rings; track ring.db) {
        <path class="polar__ring" [attr.d]="ring.d" />
        <text class="polar__label" [attr.x]="CX + 3" [attr.y]="CY - ring.r - 2">
          {{ ring.db }} dB
        </text>
      }
      @for (s of spokes; track $index) {
        <line class="polar__ring" [attr.x1]="CX" [attr.y1]="CY" [attr.x2]="s.x" [attr.y2]="s.y" />
      }
      <line
        class="polar__ground"
        [attr.x1]="CX - R - 8"
        [attr.x2]="CX + R + 8"
        [attr.y1]="CY"
        [attr.y2]="CY"
      />
      <line
        class="polar__needle"
        [attr.x1]="CX"
        [attr.x2]="CX"
        [attr.y1]="CY"
        [attr.y2]="CY - 22"
      />
      <path class="polar__pattern" [attr.d]="pattern()" />
    </svg>
  `,
  styles: `
    .polar {
      display: block;
      width: 100%;
      max-width: 26rem;
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
    .polar__ground {
      stroke: #e3a857;
      opacity: 0.7;
    }
    .polar__needle {
      stroke: #e8e6df;
      stroke-width: 2;
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
  protected readonly R = R;

  protected readonly rings = [0, -10, -20].map((db) => {
    const r = (R * (db - FLOOR_DB)) / -FLOOR_DB;
    return { db, r, d: `M${CX - r},${CY}A${r},${r} 0 0 1 ${CX + r},${CY}` };
  });

  protected readonly spokes = [30, 60, 90, 120, 150].map((deg) => ({
    x: CX + R * Math.cos((deg * Math.PI) / 180),
    y: CY - R * Math.sin((deg * Math.PI) / 180),
  }));

  protected readonly pattern = computed(() => {
    const { theta, intensity } = this.farField();
    const max = Math.max(...intensity) || 1;
    const radius = (u: number) => {
      const db = 10 * Math.log10(Math.max(u / max, 1e-12));
      return (R * Math.max(0, db - FLOOR_DB)) / -FLOOR_DB;
    };
    const pts: string[] = [];
    // Right half (θ from the axis toward +ρ), then mirrored.
    for (let i = 0; i < theta.length; i++) {
      const r = radius(intensity[i]);
      pts.push(
        `${(CX + r * Math.sin(theta[i])).toFixed(2)},${(CY - r * Math.cos(theta[i])).toFixed(2)}`,
      );
    }
    for (let i = 0; i < theta.length; i++) {
      const r = radius(intensity[i]);
      pts.unshift(
        `${(CX - r * Math.sin(theta[i])).toFixed(2)},${(CY - r * Math.cos(theta[i])).toFixed(2)}`,
      );
    }
    return `M${CX},${CY}L${pts.join('L')}Z`;
  });
}
