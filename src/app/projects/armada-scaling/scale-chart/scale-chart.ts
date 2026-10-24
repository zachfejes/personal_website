import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { line } from 'd3-shape';
import { Design } from '../design';
import { SCALE_KINDS, ScaleKind, axisTicks, makeScale, sampleRange } from './axis';

export interface NamedPoint {
  name: string;
  x: number;
  y: number;
}

/** What one axis shows: a title, a unit (if any) and how many decimals to print. */
export interface AxisLabel {
  title: string;
  unit?: string;
  decimals?: number;
}

/** The page's usual axes: canon length against model length. */
export const LENGTH_AXES: { x: AxisLabel; y: AxisLabel } = {
  x: { title: 'Canon length', unit: 'm' },
  y: { title: 'Model length', unit: 'mm' },
};

export interface FitLine {
  id: string;
  label: string;
  color: string;
  predict: (x: number) => number;
}

type Series = 'ship' | 'planned' | 'highlight';

interface Plotted extends NamedPoint {
  series: Series;
  cx: number;
  cy: number;
}

/**
 * The chart is drawn at its container's width in CSS pixels, so text stays at its set size on
 * any screen. This width is used for prerendering, before the container can be measured.
 */
const DEFAULT_WIDTH = 720;
/** Narrow screens keep at least this much height, px. */
const MIN_HEIGHT = 260;
const MARGIN = { top: 18, right: 22, bottom: 54, left: 62 } as const;
/** Roughly one tick label per this many px. */
const TICK_SPACING = { x: 90, y: 50 } as const;
const MIN_TICKS = 3;
/** Fit curves are drawn through this many samples. */
const FIT_SAMPLES = 160;
/** On linear axes, curves start just above 0: the log fit is undefined there. */
const FIT_MIN_X = 1;
/** Pointer must be this close to a point (SVG units) to select it. */
const HIT_RADIUS = 28;
const TOOLTIP = {
  padX: 8,
  padY: 6,
  offset: 12,
  lineGap: 4,
  radius: 4,
  /** Average glyph width as a fraction of font size, to size the box without measuring. */
  charWidth: 0.6,
} as const;
const AXIS_TITLE_GAP = { x: 42, y: 46 } as const;
const TICK_GAP = 8;

let nextId = 0;

/**
 * Scatter plot of Armada ships (canon length against model length, unless `axes` says otherwise),
 * with optional fit curves (toggleable), a horizontal reference line, planned ships and one
 * highlighted point. Hover, tap or use the arrow keys to read
 * a point; the same data is available as a table below the chart.
 */
@Component({
  selector: 'app-scale-chart',
  templateUrl: './scale-chart.html',
  styleUrl: './scale-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--chart-panel]': 'design().panelColor' },
})
export class ScaleChart {
  /** Accessible name for the chart, also its caption. */
  readonly caption = input.required<string>();
  readonly ships = input.required<readonly NamedPoint[]>();
  readonly fits = input<readonly FitLine[]>([]);
  readonly planned = input<readonly NamedPoint[]>([]);
  readonly highlight = input<NamedPoint | null>(null);
  readonly axes = input(LENGTH_AXES);
  /** A y value to mark with a line across the chart, e.g. "no error". */
  readonly reference = input<number | null>(null);
  readonly design = input.required<Design['chart']>();

  protected readonly clipId = `scale-chart-clip-${nextId++}`;
  /** Drawing width, px: the container's width once measured. */
  protected readonly width = signal(DEFAULT_WIDTH);
  protected readonly view = {
    margin: MARGIN,
    axisTitleGap: AXIS_TITLE_GAP,
    tickGap: TICK_GAP,
    tooltip: TOOLTIP,
  };

  protected readonly scaleKinds = SCALE_KINDS;
  /** Linear or log axes: starts from the design setting; the reader can switch. */
  protected readonly scale = linkedSignal<ScaleKind>(() => this.design().defaultScale);

  /** Fits switched off by the reader. */
  private readonly hidden = signal<ReadonlySet<string>>(new Set());
  protected readonly active = signal<Plotted | null>(null);
  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');

  protected readonly height = computed(() =>
    Math.max(MIN_HEIGHT, Math.round(this.width() * this.design().aspectRatio)),
  );

  private readonly all = computed(() => {
    const highlight = this.highlight();
    return [...this.ships(), ...this.planned(), ...(highlight ? [highlight] : [])];
  });

  /** Axis titles, saying when the scale is logarithmic. */
  protected readonly titles = computed(() => {
    const log = this.scale() === 'log';
    const title = ({ title, unit }: AxisLabel) => {
      const notes = [...(unit ? [unit] : []), ...(log ? ['log scale'] : [])];
      return notes.length ? `${title} (${notes.join(', ')})` : title;
    };
    const { x, y } = this.axes();
    return { x: title(x), y: title(y) };
  });

  /** Data table headers. */
  protected readonly headers = computed(() => {
    const header = ({ title, unit }: AxisLabel) => (unit ? `${title} (${unit})` : title);
    const { x, y } = this.axes();
    return { x: header(x), y: header(y) };
  });

  protected readonly x = computed(() =>
    makeScale(
      this.scale(),
      this.all().map((p) => p.x),
      [MARGIN.left, this.width() - MARGIN.right],
    ),
  );

  protected readonly y = computed(() => {
    const reference = this.reference();
    return makeScale(
      this.scale(),
      [...this.all().map((p) => p.y), ...(reference === null ? [] : [reference])],
      [this.height() - MARGIN.bottom, MARGIN.top],
    );
  });

  protected readonly xTicks = computed(() =>
    axisTicks(
      this.scale(),
      this.x(),
      Math.max(MIN_TICKS, Math.round(this.width() / TICK_SPACING.x)),
    ),
  );
  protected readonly yTicks = computed(() =>
    axisTicks(
      this.scale(),
      this.y(),
      Math.max(MIN_TICKS, Math.round(this.height() / TICK_SPACING.y)),
    ),
  );

  protected readonly points = computed((): Plotted[] => {
    const x = this.x();
    const y = this.y();
    const plot = (series: Series) => (p: NamedPoint) => ({ ...p, series, cx: x(p.x), cy: y(p.y) });
    const highlight = this.highlight();
    return [
      ...this.ships().map(plot('ship')),
      ...this.planned().map(plot('planned')),
      ...(highlight ? [plot('highlight')(highlight)] : []),
    ];
  });

  /** Points in reading order, for the arrow keys. */
  private readonly ordered = computed(() => [...this.points()].sort((a, b) => a.x - b.x));

  protected readonly curves = computed(() => {
    const kind = this.scale();
    const x = this.x();
    const y = this.y();
    const [minX, maxX] = x.domain();
    const xs = sampleRange(kind, kind === 'linear' ? FIT_MIN_X : minX, maxX, FIT_SAMPLES);
    const hidden = this.hidden();
    return this.fits().map((fit) => ({
      ...fit,
      on: !hidden.has(fit.id),
      d:
        line<number>()
          // Skip where a fit has no value to plot (a log axis can't show zero or less).
          .defined((v) => {
            const value = fit.predict(v);
            return Number.isFinite(value) && (kind === 'linear' || value > 0);
          })
          .x((v) => x(v))
          .y((v) => y(fit.predict(v)))(xs) ?? '',
    }));
  });

  protected readonly tooltip = computed(() => {
    const p = this.active();
    if (!p) return null;
    const size = this.design().labelSizePx;
    const { x, y } = this.axes();
    const lines = [p.name, `${this.value(p.x, x)} → ${this.value(p.y, y)}`];
    const width =
      Math.max(...lines.map((l) => l.length)) * size * TOOLTIP.charWidth + 2 * TOOLTIP.padX;
    const height = lines.length * size + (lines.length - 1) * TOOLTIP.lineGap + 2 * TOOLTIP.padY;
    const right = p.cx + TOOLTIP.offset + width <= this.width() - MARGIN.right;
    const above = p.cy - TOOLTIP.offset - height >= MARGIN.top;
    return {
      lines,
      size,
      width,
      height,
      x: right ? p.cx + TOOLTIP.offset : p.cx - TOOLTIP.offset - width,
      y: above ? p.cy - TOOLTIP.offset - height : p.cy + TOOLTIP.offset,
    };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const svg = this.svg().nativeElement;
      const observer = new ResizeObserver(() => {
        const width = Math.round(svg.getBoundingClientRect().width);
        if (width) this.width.set(width);
      });
      observer.observe(svg);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected toggle(id: string): void {
    const next = new Set(this.hidden());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.hidden.set(next);
  }

  /** Select the point nearest the pointer, if it's close enough. */
  protected pick(event: PointerEvent): void {
    const rect = this.svg().nativeElement.getBoundingClientRect();
    const scale = this.width() / rect.width;
    const px = (event.clientX - rect.left) * scale;
    const py = (event.clientY - rect.top) * scale;
    let best: Plotted | null = null;
    let bestDistance = HIT_RADIUS;
    for (const p of this.points()) {
      const distance = Math.hypot(p.cx - px, p.cy - py);
      if (distance < bestDistance) {
        best = p;
        bestDistance = distance;
      }
    }
    // Touch keeps the last pick until another tap; a mouse clears when it moves away.
    if (best || event.pointerType === 'mouse') this.active.set(best);
  }

  protected step(event: KeyboardEvent): void {
    const ordered = this.ordered();
    const current = this.active();
    const index = current
      ? ordered.findIndex((p) => p.name === current.name && p.series === current.series)
      : -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      this.active.set(ordered[Math.min(ordered.length - 1, index + 1)]);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      this.active.set(ordered[Math.max(0, index - 1)]);
    } else if (event.key === 'Escape') {
      this.active.set(null);
    } else {
      return;
    }
    event.preventDefault();
  }

  protected radius(p: Plotted): number {
    const { pointRadius, plannedRadius } = this.design();
    return p.series === 'ship' ? pointRadius : plannedRadius;
  }

  /** A value with its axis's unit, e.g. "57.6 mm". */
  protected value(value: number, axis: AxisLabel): string {
    const text = format(value, axis.decimals);
    return axis.unit ? `${text} ${axis.unit}` : text;
  }

  protected readonly format = format;
}

const DEFAULT_DECIMALS = 1;
/** "1,600" or "57.6": at most `decimals` decimals, thousands separated. */
function format(value: number, decimals = DEFAULT_DECIMALS): string {
  return value.toLocaleString('en', { maximumFractionDigits: decimals });
}
