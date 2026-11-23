import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ScaleLinear, ScaleLogarithmic, scaleLinear, scaleLog } from 'd3-scale';
import { area, line } from 'd3-shape';

export interface ChartSeries {
  label: string;
  x: readonly number[];
  y: readonly number[];
  color: string;
  dash?: string;
  /** Shaded band between two curves (e.g. a standing-wave envelope), same x as the series. */
  band?: { lower: readonly number[]; upper: readonly number[] };
  /** Leave out of the hover read-out and legend. */
  quiet?: boolean;
}

type Scale = ScaleLinear<number, number> | ScaleLogarithmic<number, number>;

const MARGIN = { top: 14, right: 18, bottom: 42, left: 70 } as const;
const plain = (v: number) => String(+v.toPrecision(3));

/** Index of the sample nearest x in an ascending array. */
function nearest(xs: readonly number[], x: number): number {
  let lo = 0;
  let hi = xs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < x) lo = mid;
    else hi = mid;
  }
  return Math.abs(xs[lo] - x) <= Math.abs(xs[hi] - x) ? lo : hi;
}

/**
 * A small SVG line chart drawn at its container's real width: linear or log axes, optional
 * envelope bands, a marker line, a hover read-out, and a click that reports the x value.
 */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="chart"
      [attr.width]="width()"
      [attr.height]="height()"
      [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
      role="img"
      [attr.aria-label]="caption()"
    >
      <g class="chart__grid">
        @for (t of xTicks(); track $index) {
          <line [attr.x1]="t.pos" [attr.x2]="t.pos" [attr.y1]="top" [attr.y2]="bottom()" />
        }
        @for (t of yTicks(); track $index) {
          <line [attr.x1]="left" [attr.x2]="right()" [attr.y1]="t.pos" [attr.y2]="t.pos" />
        }
      </g>
      @if (zeroLine(); as z) {
        <line
          class="chart__zero"
          [attr.x1]="left"
          [attr.x2]="right()"
          [attr.y1]="z"
          [attr.y2]="z"
        />
      }
      <g class="chart__labels">
        @for (t of xTicks(); track $index) {
          <text [attr.x]="t.pos" [attr.y]="bottom() + 16" text-anchor="middle">{{ t.text }}</text>
        }
        @for (t of yTicks(); track $index) {
          <text [attr.x]="left - 8" [attr.y]="t.pos + 4" text-anchor="end">{{ t.text }}</text>
        }
        <text
          class="chart__title"
          [attr.x]="(left + right()) / 2"
          [attr.y]="height() - 4"
          text-anchor="middle"
        >
          {{ xLabel() }}
        </text>
        <text
          class="chart__title"
          [attr.transform]="'translate(14 ' + (top + bottom()) / 2 + ') rotate(-90)'"
          text-anchor="middle"
        >
          {{ yLabel() }}
        </text>
      </g>
      <g [attr.clip-path]="'url(#' + clipId + ')'">
        <defs>
          <clipPath [attr.id]="clipId">
            <rect
              [attr.x]="left"
              [attr.y]="top"
              [attr.width]="right() - left"
              [attr.height]="bottom() - top"
            />
          </clipPath>
        </defs>
        @for (p of paths(); track $index) {
          @if (p.band) {
            <path class="chart__band" [attr.d]="p.band" [attr.fill]="p.color" />
          }
          <path
            class="chart__line"
            [attr.d]="p.line"
            [attr.stroke]="p.color"
            [attr.stroke-dasharray]="p.dash ?? null"
          />
        }
        @if (markerX(); as m) {
          <line
            class="chart__marker"
            [attr.x1]="m"
            [attr.x2]="m"
            [attr.y1]="top"
            [attr.y2]="bottom()"
          />
        }
        @if (hover(); as h) {
          <line
            class="chart__hover"
            [attr.x1]="h.pos"
            [attr.x2]="h.pos"
            [attr.y1]="top"
            [attr.y2]="bottom()"
          />
          @for (d of h.dots; track $index) {
            <circle [attr.cx]="h.pos" [attr.cy]="d.y" r="3.5" [attr.fill]="d.color" />
          }
        }
      </g>
      <rect
        class="chart__hit"
        [attr.x]="left"
        [attr.y]="top"
        [attr.width]="right() - left"
        [attr.height]="bottom() - top"
        (pointermove)="onMove($event)"
        (pointerleave)="hover.set(undefined)"
        (click)="onClick($event)"
      />
    </svg>
    <p class="chart__readout" aria-live="off">
      @if (hover(); as h) {
        <span>{{ xLabel() }}: {{ h.x }}</span>
        @for (d of h.dots; track $index) {
          <span><i [style.background]="d.color"></i>{{ d.label }}: {{ d.text }}</span>
        }
      } @else {
        @for (s of legend(); track s.label) {
          <span><i [style.background]="s.color"></i>{{ s.label }}</span>
        }
      }
    </p>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .chart {
      display: block;
      max-width: none;
      overflow: visible;
      font-family: var(--font-label);
      font-size: 10.5px;
    }
    .chart__grid line {
      stroke: rgb(236 229 214 / 9%);
      stroke-dasharray: 2 4;
    }
    .chart__zero {
      stroke: rgb(236 229 214 / 30%);
    }
    .chart__labels text {
      fill: var(--color-muted);
    }
    .chart__labels .chart__title {
      fill: var(--color-on-dark);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-size: 10px;
    }
    .chart__line {
      fill: none;
      stroke-width: 1.8;
      stroke-linejoin: round;
    }
    .chart__band {
      opacity: 0.16;
    }
    .chart__marker {
      stroke: var(--color-highlight);
      stroke-dasharray: 4 3;
    }
    .chart__hover {
      stroke: rgb(236 229 214 / 45%);
    }
    .chart__hit {
      fill: transparent;
      cursor: crosshair;
    }
    .chart__readout {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
      min-height: 1.5rem;
      margin: 0.3rem 0 0 ${MARGIN.left}px;
      font-family: var(--font-label);
      font-size: 0.7rem;
      color: var(--color-muted);
    }
    .chart__readout i {
      display: inline-block;
      width: 0.7rem;
      height: 2px;
      margin-right: 0.35rem;
      vertical-align: middle;
    }
  `,
})
export class LineChart {
  readonly series = input.required<readonly ChartSeries[]>();
  readonly xLabel = input('');
  readonly yLabel = input('');
  readonly caption = input('');
  readonly xLog = input(false);
  readonly yLog = input(false);
  readonly xDomain = input<readonly [number, number]>();
  readonly yDomain = input<readonly [number, number]>();
  /** Draw a dashed vertical line at this x. */
  readonly marker = input<number>();
  readonly height = input(230);
  readonly formatX = input<(v: number) => string>(plain);
  readonly formatY = input<(v: number) => string>(plain);
  /** Emits the x value under a click. */
  readonly picked = output<number>();

  protected readonly clipId = `chart-clip-${Math.random().toString(36).slice(2, 9)}`;
  protected readonly width = signal(640);
  protected readonly top = MARGIN.top;
  protected readonly left = MARGIN.left;
  protected readonly right = computed(() => this.width() - MARGIN.right);
  protected readonly bottom = computed(() => this.height() - MARGIN.bottom);
  protected readonly hover = signal<
    | { pos: number; x: string; dots: { y: number; color: string; label: string; text: string }[] }
    | undefined
  >(undefined);

  private readonly xScale = computed<Scale>(() => {
    const domain = this.xDomain() ?? this.extent((s) => s.x, this.xLog());
    const range = [this.left, this.right()];
    return this.xLog()
      ? scaleLog().domain(domain).range(range)
      : scaleLinear().domain(domain).range(range);
  });

  private readonly yScale = computed<Scale>(() => {
    const domain =
      this.yDomain() ??
      this.extent((s) => [...s.y, ...(s.band?.lower ?? []), ...(s.band?.upper ?? [])], this.yLog());
    const range = [this.bottom(), this.top];
    return this.yLog()
      ? scaleLog().domain(domain).range(range).nice()
      : scaleLinear().domain(domain).range(range).nice();
  });

  protected readonly xTicks = computed(() =>
    this.ticks(this.xScale(), this.formatX(), this.width() / 90),
  );
  protected readonly yTicks = computed(() =>
    this.ticks(this.yScale(), this.formatY(), this.height() / 45),
  );

  protected readonly zeroLine = computed(() => {
    const y = this.yScale();
    const [a, b] = y.domain();
    return !this.yLog() && a < 0 && b > 0 ? y(0) : undefined;
  });

  protected readonly markerX = computed(() => {
    const m = this.marker();
    return m === undefined ? undefined : this.xScale()(m);
  });

  protected readonly paths = computed(() => {
    const x = this.xScale();
    const y = this.yScale();
    const ok = (v: number) => Number.isFinite(v) && (!this.yLog() || v > 0);
    return this.series().map((s) => {
      const pts = s.x.map((xv, i) => [x(xv), s.y[i]] as const);
      const path = line<readonly [number, number]>()
        .defined((d) => ok(d[1]))
        .x((d) => d[0])
        .y((d) => y(d[1]))(pts);
      let band: string | null = null;
      if (s.band) {
        const { lower, upper } = s.band;
        band = area<number>()
          .x((i) => x(s.x[i]))
          .y0((i) => y(lower[i]))
          .y1((i) => y(upper[i]))(s.x.map((_, i) => i));
      }
      return { line: path ?? '', band, color: s.color, dash: s.dash };
    });
  });

  protected readonly legend = computed(() => this.series().filter((s) => !s.quiet));

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new ResizeObserver(([entry]) => {
        this.width.set(Math.max(240, Math.floor(entry.contentRect.width)));
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onMove(event: PointerEvent): void {
    const x = this.xScale();
    const y = this.yScale();
    const xv = x.invert(this.localX(event));
    const dots = this.series()
      .filter((s) => !s.quiet && s.x.length)
      .map((s) => {
        const i = nearest(s.x, xv);
        return { y: y(s.y[i]), color: s.color, label: s.label, text: this.formatY()(s.y[i]) };
      })
      .filter((d) => Number.isFinite(d.y));
    this.hover.set({ pos: x(xv), x: this.formatX()(xv), dots });
  }

  protected onClick(event: MouseEvent): void {
    this.picked.emit(this.xScale().invert(this.localX(event)));
  }

  private localX(event: MouseEvent): number {
    const rect = (event.currentTarget as SVGRectElement).getBoundingClientRect();
    return this.left + ((event.clientX - rect.left) / rect.width) * (this.right() - this.left);
  }

  private extent(pick: (s: ChartSeries) => readonly number[], log: boolean): [number, number] {
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of this.series()) {
      for (const v of pick(s)) {
        if (!Number.isFinite(v) || (log && v <= 0)) continue;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    if (!Number.isFinite(lo)) return log ? [1, 10] : [0, 1];
    if (lo === hi) return log ? [lo / 2, hi * 2] : [lo - 1, hi + 1];
    return [lo, hi];
  }

  private ticks(scale: Scale, format: (v: number) => string, count: number) {
    const values = scale.ticks(Math.max(2, Math.floor(count)));
    // Log axes: label only the decades and a few between, so labels don't collide.
    const shown =
      this.isLog(scale) && values.length > count * 1.5
        ? values.filter((v) =>
            [1, 2, 5].includes(Math.round(v / Math.pow(10, Math.floor(Math.log10(v) + 1e-9)))),
          )
        : values;
    return shown.map((v) => ({ pos: scale(v), text: format(v) }));
  }

  private isLog(scale: Scale): boolean {
    return 'base' in scale;
  }
}
