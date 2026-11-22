import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Lut, lutColor } from './colormap';
import { NeedleGeometry } from './physics/model';
import { needleRadius } from './physics/solver';

/**
 * The needle drawn lying down (base left, apex right), its radius exaggerated so the point stays
 * visible, and filled with a color that varies along its length (e.g. heat or temperature).
 */
@Component({
  selector: 'app-needle-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="strip"
      viewBox="0 0 1000 44"
      preserveAspectRatio="none"
      role="img"
      [attr.aria-label]="label()"
    >
      <defs>
        <linearGradient [attr.id]="id" x1="0" x2="1" y1="0" y2="0">
          @for (s of stops(); track $index) {
            <stop [attr.offset]="s.offset" [attr.stop-color]="s.color" />
          }
        </linearGradient>
      </defs>
      <rect class="strip__ground" x="0" y="2" width="5" height="40" />
      <path class="strip__needle" [attr.d]="outline()" [attr.fill]="'url(#' + id + ')'" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    .strip {
      display: block;
      width: 100%;
      height: 2.6rem;
    }
    .strip__ground {
      fill: #e3a857;
      opacity: 0.7;
    }
    .strip__needle {
      stroke: rgb(236 229 214 / 50%);
      stroke-width: 0.8;
      vector-effect: non-scaling-stroke;
    }
  `,
})
export class NeedleStrip {
  readonly geometry = input.required<NeedleGeometry>();
  /** Heights (m) and values to color by; values are normalized to their maximum. */
  readonly z = input.required<readonly number[]>();
  readonly values = input.required<readonly number[]>();
  readonly lut = input.required<Lut>();
  /** Lower end of the color scale (values at or below it get the first color). */
  readonly floor = input(0);
  readonly label = input('');

  protected readonly id = `strip-${Math.random().toString(36).slice(2, 9)}`;

  protected readonly outline = computed(() => {
    const g = this.geometry();
    const n = 240;
    const top: string[] = [];
    const bottom: string[] = [];
    const x0 = 6;
    const span = 994;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const z = g.length * Math.min(t, 1 - 1e-9);
      const r = (needleRadius(g, z) / g.radius) * 18;
      const x = x0 + t * span;
      top.push(`${x.toFixed(1)},${(22 - r).toFixed(2)}`);
      bottom.unshift(`${x.toFixed(1)},${(22 + r).toFixed(2)}`);
    }
    return `M${top.join('L')}L${bottom.join('L')}Z`;
  });

  protected readonly stops = computed(() => {
    const zs = this.z();
    const vs = this.values();
    const L = this.geometry().length;
    const lo = this.floor();
    const hi = Math.max(...vs);
    const range = hi - lo || 1;
    const every = Math.max(1, Math.floor(zs.length / 120));
    return zs
      .filter((_, i) => i % every === 0 || i === zs.length - 1)
      .map((z) => {
        const i = zs.indexOf(z);
        return { offset: (z / L).toFixed(4), color: lutColor(this.lut(), (vs[i] - lo) / range) };
      });
  });
}
