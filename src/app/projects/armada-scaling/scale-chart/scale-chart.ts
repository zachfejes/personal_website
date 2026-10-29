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
import { area, line } from 'd3-shape';
import { Design } from '../design';
import { placeLabel } from './annotation';
import { SCALE_KINDS, ScaleKind, axisTicks, makeScale, sampleRange } from './axis';

export interface NamedPoint {
  name: string;
  x: number;
  y: number;
  /** Drawn as an error bar of ± this much (y units), and quoted in the read-out. */
  spread?: number;
}

/** A shaded band around the data, e.g. "typical miss": its edges, and how far along x it runs. */
export interface Band {
  label: string;
  lower: (x: number) => number;
  upper: (x: number) => number;
  /** The band stops here: past the data that supports it. */
  maxX: number;
}

/** A ship the reader can show or hide (hidden to start), e.g. one far outside the others. */
export interface OptionalShip {
  name: string;
  /** The toggle's text. */
  label: string;
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
  /** Any CSS color, including a variable such as `var(--sheet-accent)`. */
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
  /** Average glyph width (spaced, upper-case mono) as a fraction of font size, to size the box. */
  charWidth: 0.68,
} as const;
const AXIS_TITLE_GAP = { x: 42, y: 46 } as const;
/** Annotated ships: how far their labels sit from them, SVG units. */
const ANNOTATION_OFFSET = { dx: 56, dy: 44 } as const;
/** Glyph width of the spaced, upper-case mono labels, as a fraction of font size. */
const ANNOTATION_CHAR_WIDTH = 0.68;
const TICK_GAP = 8;
/** Half the width of an error bar's end caps, SVG units. */
const CAP_HALF_WIDTH = 4;

let nextId = 0;

/**
 * Scatter plot of Armada ships (canon length against model length, unless `axes` says otherwise),
 * with optional fit curves (toggleable), a horizontal reference line, planned ships, one
 * highlighted point and, on wide screens, a few named ships labelled on leader lines. Hover, tap
 * or use the arrow keys to read a point; the same data is available as a table below the chart.
 * Drawn in the page's line style, with its colors (CSS variables), so it sits on dark or paper.
 */
@Component({
  selector: 'app-scale-chart',
  templateUrl: './scale-chart.html',
  styleUrl: './scale-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--chart-grid-opacity]': 'design().gridOpacity' },
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
  /** Ships to label on the chart (by name), when it's wide enough to fit them. */
  readonly annotate = input<readonly string[]>([]);
  readonly band = input<Band | null>(null);
  /** A ship hidden until the reader shows it; the axes rescale to fit what's shown. */
  readonly optional = input<OptionalShip | null>(null);

  protected readonly showOptional = signal(false);
  /** The ships drawn: all of them, less the optional one while it's hidden. */
  private readonly shownShips = computed(() => {
    const optional = this.optional();
    return optional && !this.showOptional()
      ? this.ships().filter((s) => s.name !== optional.name)
      : this.ships();
  });

  protected readonly clipId = `scale-chart-clip-${nextId++}`;
  /** Drawing width, px: the container's width once measured. */
  protected readonly width = signal(DEFAULT_WIDTH);
  protected readonly view = {
    margin: MARGIN,
    axisTitleGap: AXIS_TITLE_GAP,
    tickGap: TICK_GAP,
    tooltip: TOOLTIP,
    capHalfWidth: CAP_HALF_WIDTH,
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
    return [...this.shownShips(), ...this.planned(), ...(highlight ? [highlight] : [])];
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
      ...this.shownShips().map(plot('ship')),
      ...this.planned().map(plot('planned')),
      ...(highlight ? [plot('highlight')(highlight)] : []),
    ];
  });

  /** The data table lists every point, including a hidden optional ship. */
  protected readonly rows = computed(() => {
    const highlight = this.highlight();
    const row = (series: Series) => (p: NamedPoint) => ({ ...p, series });
    return [
      ...this.ships().map(row('ship')),
      ...this.planned().map(row('planned')),
      ...(highlight ? [row('highlight')(highlight)] : []),
    ];
  });

  /** The band as an SVG area, from the left edge to its end (or the right edge). */
  protected readonly bandPath = computed(() => {
    const band = this.band();
    if (!band) return null;
    const kind = this.scale();
    const x = this.x();
    const y = this.y();
    const [minX, maxX] = x.domain();
    const from = kind === 'linear' ? FIT_MIN_X : minX;
    const to = Math.min(band.maxX, maxX);
    if (to <= from) return null;
    const xs = sampleRange(kind, from, to, FIT_SAMPLES);
    return (
      area<number>()
        // A log axis can't show zero or less.
        .defined((v) => kind === 'linear' || band.lower(v) > 0)
        .x((v) => x(v))
        .y0((v) => y(band.lower(v)))
        .y1((v) => y(band.upper(v)))(xs) ?? null
    );
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

  /** Labels for the named ships, on leader lines, when there's room for them. */
  protected readonly annotations = computed(() => {
    if (this.width() < this.design().annotateMinWidthPx) return [];
    const { x, y } = this.axes();
    const plot = {
      left: MARGIN.left,
      right: this.width() - MARGIN.right,
      top: MARGIN.top,
      bottom: this.height() - MARGIN.bottom,
    };
    const points = this.points();
    return this.annotate().flatMap((name) => {
      const p = points.find((q) => q.name === name);
      if (!p) return [];
      const text = `${p.name} · ${this.value(p.x, x)} → ${this.value(p.y, y)}`;
      const textWidth = text.length * this.design().labelSizePx * ANNOTATION_CHAR_WIDTH;
      return [{ ...placeLabel(p, plot, ANNOTATION_OFFSET, textWidth), cx: p.cx, cy: p.cy, text }];
    });
  });

  protected readonly tooltip = computed(() => {
    const p = this.active();
    if (!p) return null;
    const size = this.design().labelSizePx;
    const { x, y } = this.axes();
    const from = `${this.value(p.x, x)} → `;
    const to =
      p.spread === undefined
        ? this.value(p.y, y)
        : `${format(p.y, y.decimals)} ± ${this.value(p.spread, y)}`;
    const lines = [p.name, from + to];
    const width =
      Math.max(...lines.map((l) => l.length)) * size * TOOLTIP.charWidth + 2 * TOOLTIP.padX;
    const height = lines.length * size + (lines.length - 1) * TOOLTIP.lineGap + 2 * TOOLTIP.padY;
    const right = p.cx + TOOLTIP.offset + width <= this.width() - MARGIN.right;
    const above = p.cy - TOOLTIP.offset - height >= MARGIN.top;
    return {
      name: p.name,
      from,
      to,
      size,
      width,
      height,
      // Crosshairs from the point to both axes
      cx: p.cx,
      cy: p.cy,
      axisLeft: MARGIN.left,
      axisBottom: this.height() - MARGIN.bottom,
      // Kept inside the plot: on narrow charts, a box to the left can't cover the axis labels.
      x: right ? p.cx + TOOLTIP.offset : Math.max(MARGIN.left, p.cx - TOOLTIP.offset - width),
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

  protected toggleOptional(): void {
    this.showOptional.set(!this.showOptional());
    this.active.set(null);
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
