import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MEDIUM_LABELS, MediumId } from './physics/media';
import { PatternCurve, SlicePattern } from './physics/pattern';

const R = 120;
const CX = 140;
const CY = 140;
const FLOOR_DB = -30;

const COLORS: Record<MediumId, string> = {
  vacuum: '#e3a857',
  air: '#e3a857',
  oil: '#f0c987',
  water: '#5aa0d2',
};

/**
 * The radiation pattern in the vertical plane through the antenna: relative intensity (dB, on
 * one scale for every medium) against direction, with the antenna drawn at its tilt. Over a
 * liquid, air's curve fills the half above the surface and water's the half below; a thin oil
 * layer's curve is dashed.
 */
@Component({
  selector: 'app-polar-pattern',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="polar"
      viewBox="0 0 280 280"
      role="img"
      aria-label="Radiation pattern in each medium, relative intensity in decibels"
    >
      @if (layered()) {
        <rect class="polar__liquid" x="0" [attr.y]="CY" width="280" [attr.height]="280 - CY" />
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
      @for (c of paths(); track c.medium) {
        <path
          class="polar__pattern"
          [attr.d]="c.d"
          [attr.stroke]="c.color"
          [attr.fill]="c.dashed ? 'none' : c.color"
          [attr.stroke-dasharray]="c.dashed ? '4 3' : null"
        />
      }
      @if (layered()) {
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
    @if (paths().length > 1) {
      <p class="polar__legend">
        @for (c of paths(); track c.medium) {
          <span>
            <i [style.border-color]="c.color" [class.dashed]="c.dashed"></i>
            {{ c.label }}
          </span>
        }
      </p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
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
      fill: rgb(90 160 210 / 8%);
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
      fill-opacity: 0.16;
      stroke-width: 1.5;
    }
    .polar__legend {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.3rem 1rem;
      margin: 0.4rem 0 0;
      font-family: var(--font-label);
      font-size: 0.7rem;
      color: var(--color-muted);
    }
    .polar__legend i {
      display: inline-block;
      width: 0.9rem;
      margin-right: 0.35rem;
      border-top: 2px solid;
      vertical-align: middle;
    }
    .polar__legend i.dashed {
      border-top-style: dashed;
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

  protected readonly layered = computed(() =>
    this.pattern().curves.some((c) => c.sector !== 'full'),
  );

  protected readonly antenna = computed(() => {
    const [ux, uy] = this.axis();
    const l = 26;
    return { x1: CX - ux * l, y1: CY + uy * l, x2: CX + ux * l, y2: CY - uy * l };
  });

  protected readonly paths = computed(() => {
    const { angle, curves } = this.pattern();
    return curves.map((c) => ({
      medium: c.medium,
      label: c.dashed
        ? `${MEDIUM_LABELS[c.medium]} (thin layer, as if unbounded)`
        : MEDIUM_LABELS[c.medium],
      color: COLORS[c.medium],
      dashed: c.dashed,
      d: this.path(angle, c),
    }));
  });

  private path(angle: readonly number[], c: PatternCurve): string {
    const radius = (u: number) => {
      const db = 10 * Math.log10(Math.max(u, 1e-12));
      return (R * Math.max(0, db - FLOOR_DB)) / -FLOOR_DB;
    };
    // Angles clockwise from straight up. A half-space curve is swept from one horizon to the
    // other (through up, or through down) and closed through the center.
    const keyed = angle.map((a, i) => ({ a, u: c.intensity[i] }));
    let order: { a: number; u: number }[];
    if (c.sector === 'upper') {
      order = keyed
        .map((p) => ({ ...p, a: p.a > Math.PI ? p.a - 2 * Math.PI : p.a }))
        .filter((p) => Math.cos(p.a) > 0)
        .sort((p, q) => p.a - q.a);
    } else if (c.sector === 'lower') {
      order = keyed.filter((p) => Math.cos(p.a) < 0).sort((p, q) => p.a - q.a);
    } else {
      order = keyed;
    }
    const pts = order.map(({ a, u }) => {
      const r = radius(u);
      return `${(CX + r * Math.sin(a)).toFixed(2)},${(CY - r * Math.cos(a)).toFixed(2)}`;
    });
    if (!pts.length) return '';
    return c.sector === 'full' ? `M${pts.join('L')}Z` : `M${CX},${CY}L${pts.join('L')}Z`;
  }
}
