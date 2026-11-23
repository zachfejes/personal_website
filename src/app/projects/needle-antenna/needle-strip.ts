import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Lut, lutColor } from './colormap';
import { Profile, radiusAt } from './physics/geometry';

const WIDTH = 1000;
const MID = 22;
/** Half-height of the shaft in the drawing. */
const SHAFT = 16;
const GAP = 6;

/**
 * The whole antenna drawn lying down (the other arm on the left, the needle on the right, the
 * feed gap between them), its radius exaggerated so the point stays visible, and filled with a
 * color that varies along its length (e.g. heat).
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
        <linearGradient
          [attr.id]="id"
          x1="0"
          x2="1000"
          y1="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          @for (s of stops(); track $index) {
            <stop [attr.offset]="s.offset" [attr.stop-color]="s.color" />
          }
        </linearGradient>
      </defs>
      @for (d of outlines(); track $index) {
        <path class="strip__needle" [attr.d]="d" [attr.fill]="'url(#' + id + ')'" />
      }
      <rect class="strip__feed" [attr.x]="500 - GAP / 2" y="2" [attr.width]="GAP" height="40" />
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
    .strip__feed {
      fill: #e3a857;
    }
    .strip__needle {
      stroke: rgb(236 229 214 / 50%);
      stroke-width: 0.8;
      vector-effect: non-scaling-stroke;
    }
  `,
})
export class NeedleStrip {
  /** [the needle, the other arm]. */
  readonly profiles = input.required<readonly [Profile, Profile]>();
  /** Heights (m, negative on the other arm) and values to color by, normalized to the maximum. */
  readonly z = input.required<readonly number[]>();
  readonly values = input.required<readonly number[]>();
  readonly lut = input.required<Lut>();
  readonly label = input('');

  protected readonly id = `strip-${Math.random().toString(36).slice(2, 9)}`;
  protected readonly GAP = GAP;

  /** x in the drawing for a height z. */
  private readonly x = computed(() => {
    const L = this.profiles()[0].length;
    return (z: number) => WIDTH / 2 + (Math.sign(z) * GAP) / 2 + (z / L) * (WIDTH / 2 - GAP / 2);
  });

  protected readonly outlines = computed(() => {
    const x = this.x();
    return this.profiles().map((p, a) => {
      const side = a === 0 ? 1 : -1;
      const n = 300;
      const top: string[] = [];
      const bottom: string[] = [];
      for (let i = 0; i <= n; i++) {
        const s = p.length * Math.min(i / n, 1 - 1e-9);
        const r = (radiusAt(p, s) / p.shaftRadius) * SHAFT;
        const px = x(side * Math.max(s, 1e-12)).toFixed(1);
        top.push(`${px},${(MID - r).toFixed(2)}`);
        bottom.unshift(`${px},${(MID + r).toFixed(2)}`);
      }
      return `M${top.join('L')}L${bottom.join('L')}Z`;
    });
  });

  protected readonly stops = computed(() => {
    const x = this.x();
    const zs = this.z();
    const vs = this.values();
    const hi = Math.max(...vs) || 1;
    const every = Math.max(1, Math.floor(zs.length / 200));
    return zs
      .map((z, i) => ({ z, v: vs[i] }))
      .filter((_, i) => i % every === 0 || i === zs.length - 1)
      .map(({ z, v }) => ({
        offset: (x(z) / WIDTH).toFixed(4),
        color: lutColor(this.lut(), v / hi),
      }));
  });
}
