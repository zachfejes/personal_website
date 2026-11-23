import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SlicePattern } from './physics/pattern';

const R = 120;
const CX = 140;
const CY = 140;
const FLOOR_DB = -30;

/**
 * The radiation pattern in the vertical plane through the antenna: relative power (dB) against
 * direction, with the antenna drawn at its tilt. Over a liquid, only the air above the surface
 * is shown.
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
      @if (pattern().upperOnly) {
        <rect class="polar__liquid" x="0" [attr.y]="CY" width="280" [attr.height]="280 - CY" />
        <text class="polar__label" x="8" [attr.y]="CY + 14">LIQUID (NOT SHOWN)</text>
      }
      @for (ring of rings; track ring.db) {
        <circle class="polar__ring" [attr.cx]="CX" [attr.cy]="CY" [attr.r]="ring.r" />
        <text class="polar__label" [attr.x]="CX + 3" [attr.y]="CY - ring.r - 2">
          {{ ring.db }} dB
        </text>
      }
      @for (s of spokes; track $index) {
        <line class="polar__ring" [attr.x1]="CX" [attr.y1]="CY" [attr.x2]="s.x" [attr.y2]="s.y" />
      }
      <path class="polar__pattern" [attr.d]="path()" />
      @if (pattern().upperOnly) {
        <line class="polar__surface" x1="0" x2="280" [attr.y1]="CY" [attr.y2]="CY" />
      }
      <line
        class="polar__needle"
        [attr.x1]="antenna().x1"
        [attr.y1]="antenna().y1"
        [attr.x2]="antenna().x2"
        [attr.y2]="antenna().y2"
      />
      <circle class="polar__gap" [attr.cx]="CX" [attr.cy]="CY" r="3" />
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
    .polar__liquid {
      fill: rgb(90 160 210 / 10%);
    }
    .polar__surface {
      stroke: rgb(236 229 214 / 55%);
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
  readonly pattern = input.required<SlicePattern>();
  /** The antenna's direction in the plane (x right, y up), from the gap toward the apex. */
  readonly axis = input.required<readonly [number, number]>();
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

  protected readonly antenna = computed(() => {
    const [ux, uy] = this.axis();
    const l = 26;
    return { x1: CX - ux * l, y1: CY + uy * l, x2: CX + ux * l, y2: CY - uy * l };
  });

  protected readonly path = computed(() => {
    const { angle, intensity, upperOnly } = this.pattern();
    const radius = (u: number) => {
      const db = 10 * Math.log10(Math.max(u, 1e-12));
      return (R * Math.max(0, db - FLOOR_DB)) / -FLOOR_DB;
    };
    // Clockwise from straight up; over a liquid, swept left horizon → up → right horizon.
    const order = angle
      .map((a, i) => ({ a: a > Math.PI ? a - 2 * Math.PI : a, u: intensity[i] }))
      .filter((p) => !upperOnly || Math.cos(p.a) > 0)
      .sort((p, q) => p.a - q.a);
    const pts = order.map(({ a, u }) => {
      const r = radius(u);
      return `${(CX + r * Math.sin(a)).toFixed(2)},${(CY - r * Math.cos(a)).toFixed(2)}`;
    });
    if (!pts.length) return '';
    // Over a liquid the pattern is a fan above the surface, closed through the center.
    return upperOnly ? `M${CX},${CY}L${pts.join('L')}Z` : `M${pts.join('L')}Z`;
  });
}
