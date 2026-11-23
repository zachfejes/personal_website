import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EMBER, Lut, TIDE, lutGradient } from './colormap';
import { si } from './format';
import {
  FieldGrid,
  FieldWindow,
  Mask,
  contourSegments,
  createGrid,
  fillRows,
  heating,
  xAt,
} from './physics/fields';
import { radiusAt } from './physics/geometry';
import { MEDIUM_LABELS } from './physics/media';
import { Solution, worldAt } from './physics/solver';

export type FieldView = 'radiation' | 'antenna' | 'entry' | 'point' | 'apex' | 'other-end';
export type FieldQuantity = 'e' | 'e-rms' | 'h' | 'h-rms' | 'heat';

export const FIELD_VIEWS: readonly { id: FieldView; label: string; layeredOnly?: boolean }[] = [
  { id: 'radiation', label: 'Radiation zone' },
  { id: 'antenna', label: 'Whole antenna' },
  { id: 'entry', label: 'Into the liquid', layeredOnly: true },
  { id: 'point', label: 'Point' },
  { id: 'apex', label: 'Apex' },
  { id: 'other-end', label: 'Other end' },
];

export const FIELD_QUANTITIES: readonly {
  id: FieldQuantity;
  label: string;
  layeredOnly?: boolean;
}[] = [
  { id: 'e', label: 'E, instantaneous' },
  { id: 'e-rms', label: 'E, RMS' },
  { id: 'h', label: 'H, instantaneous' },
  { id: 'h-rms', label: 'H, RMS' },
  { id: 'heat', label: 'Heating in liquid', layeredOnly: true },
];

/** A square window around a point. */
const around = (cx: number, cy: number, half: number): FieldWindow => ({
  x0: cx - half,
  x1: cx + half,
  y0: cy - half,
  y1: cy + half,
});

/** The window of the vertical plane each view shows. */
export function fieldWindow(sol: Solution, view: FieldView): FieldWindow {
  const g = sol.params.geometry;
  const D = g.length;
  const p = sol.placement;
  const up = sol.arms[0].profile.length;
  const down = sol.arms[1].profile.length;
  const apex = worldAt(p, up);
  const end = worldAt(p, -down);
  const mid: [number, number] = [(apex[0] + end[0]) / 2, (apex[1] + end[1]) / 2];
  switch (view) {
    case 'radiation': {
      const lambda = sol.wavelength / Math.sqrt(sol.layers.eps[0].re);
      return around(mid[0], mid[1], Math.max(0.8 * D, 1.25 * lambda));
    }
    case 'antenna': {
      // The antenna's bounding box plus a margin, no flatter than 3:4 either way.
      let hw = Math.abs(apex[0] - end[0]) / 2 + 0.18 * D;
      let hh = Math.abs(apex[1] - end[1]) / 2 + 0.18 * D;
      hw = Math.max(hw, 0.75 * hh);
      hh = Math.max(hh, 0.75 * hw);
      return { x0: mid[0] - hw, x1: mid[0] + hw, y0: mid[1] - hh, y1: mid[1] + hh };
    }
    case 'entry': {
      // Where the needle crosses the oil, centered mid-layer.
      const t = sol.params.environment.oilThickness;
      const dy = p.axis[1];
      const s = Math.abs(dy) > 1e-9 ? (-t / 2 - p.gap[1]) / dy : up;
      const c = worldAt(p, Math.min(Math.max(s, -down), up));
      return around(c[0], c[1], Math.max(2.5 * t, 6 * g.radius, 1e-4));
    }
    case 'point': {
      const s = Math.max(Math.min(g.taperLength, up), 4 * g.radius, 1e-9);
      const c = worldAt(p, up - 0.5 * s);
      return around(c[0], c[1], 0.9 * s);
    }
    case 'apex': {
      const s = Math.max(30 * Math.min(g.tipRadius, g.radius), 1e-9);
      const c = worldAt(p, up - 0.4 * s);
      return around(c[0], c[1], s);
    }
    case 'other-end': {
      const prof = sol.arms[1].profile;
      const s = Math.max(6 * prof.capRadius, 4 * prof.shaftRadius, 1e-9);
      const c = worldAt(p, -down + 0.5 * s);
      return around(c[0], c[1], s);
    }
  }
}

/** Samples along the longer side of the field grid. */
const SAMPLES = 170;
/** Rows computed per slice before yielding to the browser. */
const ROWS_PER_SLICE = 4;
/** Color range of the log-magnitude maps (decades below the top). */
const DECADES = 3.5;
/** E field-line contours per sign (upright needle). */
const LINE_LEVELS = 14;
/** Streamline seed spacing, in grid samples (tilted needle). */
const SEED_SPACING = 7;

/** Translucent tints for the liquids, and their boundary lines. */
const LAYER_TINT: Record<string, string> = {
  oil: 'rgb(227 168 87 / 14%)',
  water: 'rgb(90 160 210 / 16%)',
};

interface Stats {
  /** Top of the color scales (99.5th percentile, outside the metal). */
  eTop: number;
  hTop: number;
  heatTop: number;
  /** Field-line spacing for ρ·H (upright needle). */
  psiTop: number;
  heat: Float64Array;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 1;
  values.sort((a, b) => a - b);
  return values[Math.min(values.length - 1, Math.floor(p * values.length))] || 1;
}

function stats(sol: Solution, grid: FieldGrid): Stats {
  const heat = heating(sol, grid);
  const e: number[] = [];
  const h: number[] = [];
  const q: number[] = [];
  const psi: number[] = [];
  const xa = sol.placement.gap[0];
  for (let j = 0; j < grid.ny; j++) {
    for (let i = 0; i < grid.nx; i++) {
      const k = j * grid.nx + i;
      if (grid.mask[k] !== Mask.Air) continue;
      e.push(Math.hypot(grid.exRe[k], grid.exIm[k], grid.eyRe[k], grid.eyIm[k]));
      const hAmp = Math.hypot(grid.hRe[k], grid.hIm[k]);
      h.push(hAmp);
      if (heat[k] > 0) q.push(heat[k]);
      psi.push(hAmp * Math.abs(xAt(grid, i) - xa));
    }
  }
  return {
    eTop: percentile(e, 0.995),
    hTop: percentile(h, 0.995),
    heatTop: percentile(q, 0.995),
    psiTop: percentile(psi, 0.99),
    heat,
  };
}

/**
 * The fields around the antenna in the vertical plane that contains it and the normal to the
 * liquid surface: a color map of E, H or the liquid's heating, E field lines, the layers, the
 * antenna and its feed. The grid is computed in slices so the page stays responsive, then each
 * animation frame only re-evaluates Re{phasor·e^{jωt}}.
 */
@Component({
  selector: 'app-field-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map" [style.aspect-ratio]="aspect()">
      <canvas #canvas class="map__canvas" role="img" [attr.aria-label]="ariaLabel()"></canvas>
      @if (progress() < 1) {
        <div class="map__progress" aria-hidden="true">
          <span [style.width.%]="progress() * 100"></span>
        </div>
      }
    </div>
    <div class="legend">
      <span class="legend__label">{{ legend().label }}</span>
      <span class="legend__min">{{ legend().min }}</span>
      <span class="legend__bar" [style.background]="legend().gradient"></span>
      <span class="legend__max">{{ legend().max }}</span>
      <span class="legend__scale">Scale bar: {{ scaleBar() }}</span>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .map {
      position: relative;
      width: 100%;
      max-height: 78vh;
      margin-inline: auto;
      border: 1px solid rgb(236 229 214 / 14%);
      border-radius: var(--radius);
      overflow: hidden;
      background: #0c0f0e;
    }
    .map__canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .map__progress {
      position: absolute;
      inset: auto 0 0;
      height: 3px;
      background: rgb(0 0 0 / 40%);
    }
    .map__progress span {
      display: block;
      height: 100%;
      background: var(--color-highlight);
    }
    .legend {
      display: grid;
      grid-template-columns: auto auto 1fr auto;
      gap: 0.3rem 0.6rem;
      align-items: center;
      margin-top: 0.6rem;
      font-family: var(--font-label);
      font-size: 0.7rem;
      color: var(--color-muted);
    }
    .legend__label {
      color: var(--color-on-dark);
    }
    .legend__bar {
      height: 0.55rem;
      border-radius: 2px;
    }
    .legend__scale {
      grid-column: 1 / -1;
    }
  `,
})
export class FieldMap {
  readonly solution = input.required<Solution>();
  readonly view = input<FieldView>('antenna');
  readonly quantity = input<FieldQuantity>('e');
  /** ωt in radians. */
  readonly phase = input(0);
  readonly lines = input(true);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly grid = signal<{ grid: FieldGrid; stats: Stats; sol: Solution } | undefined>(
    undefined,
  );
  private readonly cssWidth = signal(0);
  protected readonly progress = signal(0);

  protected readonly window = computed(() => fieldWindow(this.solution(), this.view()));
  protected readonly aspect = computed(() => {
    const w = this.window();
    return `${w.x1 - w.x0} / ${w.y1 - w.y0}`;
  });

  protected readonly ariaLabel = computed(
    () =>
      `${FIELD_QUANTITIES.find((q) => q.id === this.quantity())?.label ?? ''} around the antenna, ` +
      `${FIELD_VIEWS.find((v) => v.id === this.view())?.label ?? ''} view`,
  );

  protected readonly legend = computed(() => {
    const q = this.quantity();
    const s = this.grid()?.stats;
    if (q === 'heat') {
      const top = s?.heatTop ?? 0;
      return {
        label: 'Absorbed power density, log',
        min: si(top / Math.pow(10, DECADES), 'W/m³'),
        max: si(top, 'W/m³'),
        gradient: lutGradient(EMBER),
      };
    }
    const isE = q === 'e' || q === 'e-rms';
    const unit = isE ? 'V/m' : 'A/m';
    const top = s ? (isE ? s.eTop : s.hTop) / (q.endsWith('rms') ? Math.SQRT2 : 1) : 0;
    if (q === 'h') {
      return {
        label: 'H (out of page ↔ into page)',
        min: `−${si(top, unit)}`,
        max: `+${si(top, unit)}`,
        gradient: lutGradient(TIDE),
      };
    }
    return {
      label: isE ? (q === 'e' ? '|E(t)|, log' : '|E| RMS, log') : '|H| RMS, log',
      min: si(top / Math.pow(10, DECADES), unit),
      max: si(top, unit),
      gradient: lutGradient(EMBER),
    };
  });

  protected readonly scaleBar = computed(() => si(this.barLength(), 'm'));

  private readonly barLength = computed(() => {
    const w = this.window();
    const span = (w.x1 - w.x0) / 5;
    const p = Math.pow(10, Math.floor(Math.log10(span)));
    return [5, 2, 1].map((m) => m * p).find((v) => v <= span) ?? p;
  });

  constructor() {
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    afterNextRender(() => {
      const observer = new ResizeObserver(([entry]) => this.cssWidth.set(entry.contentRect.width));
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    // Recompute the grid whenever the solution or the window changes, in slices.
    effect((onCleanup) => {
      const sol = this.solution();
      const win = this.window();
      if (!browser) return;
      const w = win.x1 - win.x0;
      const h = win.y1 - win.y0;
      const nx = Math.max(40, Math.round((SAMPLES * w) / Math.max(w, h)));
      const ny = Math.max(40, Math.round((SAMPLES * h) / Math.max(w, h)));
      const grid = createGrid(sol, win, nx, ny);
      let row = 0;
      let timer = 0;
      this.progress.set(0);
      const step = () => {
        const until = performance.now() + 12;
        while (row < ny && performance.now() < until) {
          fillRows(sol, grid, row, Math.min(ny, row + ROWS_PER_SLICE));
          row += ROWS_PER_SLICE;
        }
        this.progress.set(Math.min(1, row / ny));
        if (row < ny) timer = window.setTimeout(step, 0);
        else this.grid.set({ grid, stats: stats(sol, grid), sol });
      };
      timer = window.setTimeout(step, 30);
      onCleanup(() => clearTimeout(timer));
    });

    effect(() => {
      const data = this.grid();
      const width = this.cssWidth();
      const q = this.quantity();
      const wt = this.phase();
      const lines = this.lines();
      if (!data || !width) return;
      this.draw(data.sol, data.grid, data.stats, q, wt, lines);
    });
  }

  private offscreen?: HTMLCanvasElement;

  private draw(
    sol: Solution,
    grid: FieldGrid,
    s: Stats,
    q: FieldQuantity,
    wt: number,
    lines: boolean,
  ): void {
    const canvas = this.canvas().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(rect.width * dpr));
    const H = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.offscreen ??= document.createElement('canvas');
    const off = this.offscreen;
    off.width = grid.nx;
    off.height = grid.ny;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;
    const image = offCtx.createImageData(grid.nx, grid.ny);
    this.paint(image.data, grid, s, q, wt);
    offCtx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, W, H);

    const win = grid.window;
    const px = (x: number) => ((x - win.x0) / (win.x1 - win.x0)) * W;
    const py = (y: number) => ((win.y1 - y) / (win.y1 - win.y0)) * H;
    const perMeter = W / (win.x1 - win.x0);

    // The liquids: a tint over each layer and a line on each surface.
    const lay = sol.layers;
    lay.media.forEach((m, l) => {
      const tint = LAYER_TINT[m] as string | undefined;
      if (!tint) return;
      const top = l === 0 ? win.y1 : Math.min(lay.interfaces[l - 1], win.y1);
      const bottom = l === lay.media.length - 1 ? win.y0 : Math.max(lay.interfaces[l], win.y0);
      if (top <= bottom) return;
      ctx.fillStyle = tint;
      ctx.fillRect(0, py(top), W, py(bottom) - py(top));
    });

    if (lines && (q === 'e' || q === 'h')) this.fieldLines(ctx, sol, grid, s, wt, W, H, dpr);

    ctx.font = `${10 * dpr}px "JetBrains Mono Variable", monospace`;
    lay.interfaces.forEach((y, b) => {
      if (y <= win.y0 || y >= win.y1) return;
      ctx.strokeStyle = b === 0 ? 'rgb(236 229 214 / 55%)' : 'rgb(120 180 220 / 60%)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, py(y));
      ctx.lineTo(W, py(y));
      ctx.stroke();
    });
    // Label each layer at the right edge, where it's visible.
    lay.media.forEach((m, l) => {
      const top = l === 0 ? win.y1 : Math.min(lay.interfaces[l - 1], win.y1);
      const bottom = l === lay.media.length - 1 ? win.y0 : Math.max(lay.interfaces[l], win.y0);
      if (top - bottom < (14 * dpr) / perMeter || lay.media.length < 2) return;
      ctx.fillStyle = 'rgb(236 229 214 / 75%)';
      ctx.textAlign = 'right';
      ctx.fillText(MEDIUM_LABELS[m].toUpperCase(), W - 8 * dpr, py(top) + 14 * dpr);
    });
    ctx.textAlign = 'left';

    this.drawAntenna(ctx, sol, px, py, perMeter, dpr);

    // Scale bar.
    const bar = this.barLength();
    const barPx = bar * perMeter;
    const bx = 14 * dpr;
    const by = H - 14 * dpr;
    ctx.strokeStyle = '#ece5d6';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(bx, by - 4 * dpr);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + barPx, by);
    ctx.lineTo(bx + barPx, by - 4 * dpr);
    ctx.stroke();
    ctx.fillStyle = '#ece5d6';
    ctx.font = `${11 * dpr}px "JetBrains Mono Variable", monospace`;
    ctx.fillText(si(bar, 'm'), bx, by - 7 * dpr);
  }

  /** Both arms from their exact profiles, tilted into place, and the source in the gap. */
  private drawAntenna(
    ctx: CanvasRenderingContext2D,
    sol: Solution,
    px: (x: number) => number,
    py: (y: number) => number,
    perMeter: number,
    dpr: number,
  ): void {
    const { axis } = sol.placement;
    const normal = [-axis[1], axis[0]];
    const minHalf = (0.75 * dpr) / perMeter;
    for (const arm of sol.arms) {
      const p = arm.profile;
      const ss = new Set<number>([0, p.coneStart, p.capStart, p.length]);
      for (let i = 0; i <= 300; i++) ss.add((p.length * i) / 300);
      for (let i = 0; i <= 60; i++) ss.add(p.capStart + ((p.length - p.capStart) * i) / 60);
      const along = [...ss].sort((a, b) => a - b);
      const edge = (side: number) =>
        along.map((s) => {
          const r = radiusAt(p, s);
          const half = r > 0 ? Math.max(r, minHalf) : 0;
          const [x, y] = worldAt(sol.placement, arm.direction * s);
          return [px(x + side * half * normal[0]), py(y + side * half * normal[1])] as const;
        });
      const a = edge(1);
      const b = edge(-1).reverse();
      ctx.beginPath();
      [...a, ...b].forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = '#c9cbc5';
      ctx.fill();
      ctx.strokeStyle = 'rgb(20 25 23 / 80%)';
      ctx.lineWidth = 0.6 * dpr;
      ctx.stroke();
    }
    // The source in the feed gap.
    const [gx, gy] = sol.placement.gap;
    const half = Math.max(sol.params.geometry.radius * 1.8, (3 * dpr) / perMeter);
    ctx.strokeStyle = '#e3a857';
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.moveTo(px(gx - half * normal[0]), py(gy - half * normal[1]));
    ctx.lineTo(px(gx + half * normal[0]), py(gy + half * normal[1]));
    ctx.stroke();
  }

  private paint(
    data: Uint8ClampedArray,
    grid: FieldGrid,
    s: Stats,
    q: FieldQuantity,
    wt: number,
  ): void {
    const cos = Math.cos(wt);
    const sin = Math.sin(wt);
    const { nx, ny } = grid;
    const isE = q === 'e' || q === 'e-rms';
    const top = q === 'heat' ? s.heatTop : isE ? s.eTop : s.hTop;
    const logTop = Math.log10(top);
    const signed = q === 'h';
    const soft = top / 1000;
    const softNorm = Math.asinh(top / soft);
    for (let j = 0; j < ny; j++) {
      // Inside the metal, borrow the nearest field sample in the row so the smoothed image has
      // no dark fringe; the antenna itself is drawn on top from its exact outline.
      let lastAir = -1;
      const nextAir = new Int32Array(nx).fill(-1);
      for (let i = nx - 1, next = -1; i >= 0; i--) {
        if (grid.mask[j * nx + i] === Mask.Air) next = i;
        nextAir[i] = next;
      }
      for (let i = 0; i < nx; i++) {
        let src = i;
        if (grid.mask[j * nx + i] !== Mask.Air) {
          const n = nextAir[i];
          src = lastAir < 0 ? n : n < 0 || i - lastAir <= n - i ? lastAir : n;
        } else lastAir = i;
        const o = (j * nx + i) * 4;
        data[o + 3] = 255;
        if (src < 0) {
          data[o] = 12;
          data[o + 1] = 15;
          data[o + 2] = 14;
          continue;
        }
        const k = j * nx + src;
        let lut: Lut = EMBER;
        let t: number;
        if (signed) {
          const h = grid.hRe[k] * cos - grid.hIm[k] * sin;
          t = 0.5 + (0.5 * Math.asinh(h / soft)) / softNorm;
          lut = TIDE;
        } else {
          let v: number;
          if (q === 'e') {
            const ex = grid.exRe[k] * cos - grid.exIm[k] * sin;
            const ey = grid.eyRe[k] * cos - grid.eyIm[k] * sin;
            v = Math.hypot(ex, ey);
          } else if (q === 'e-rms') {
            v = Math.hypot(grid.exRe[k], grid.exIm[k], grid.eyRe[k], grid.eyIm[k]);
          } else if (q === 'heat') {
            v = s.heat[k];
          } else {
            v = Math.hypot(grid.hRe[k], grid.hIm[k]);
          }
          t = v > 0 ? 1 + (Math.log10(v) - logTop) / DECADES : 0;
        }
        const li = Math.round(Math.min(1, Math.max(0, t)) * 255) * 3;
        data[o] = lut[li];
        data[o + 1] = lut[li + 1];
        data[o + 2] = lut[li + 2];
      }
    }
  }

  /**
   * Instantaneous E field lines: contours of ρ·H for an upright antenna in uniform surroundings,
   * traced streamlines otherwise.
   */
  private fieldLines(
    ctx: CanvasRenderingContext2D,
    sol: Solution,
    grid: FieldGrid,
    s: Stats,
    wt: number,
    W: number,
    H: number,
    dpr: number,
  ): void {
    const sx = W / grid.nx;
    const sy = H / grid.ny;
    ctx.strokeStyle = 'rgb(246 240 226 / 55%)';
    ctx.lineWidth = 0.9 * dpr;
    ctx.beginPath();
    // The stream-function shortcut needs an upright antenna in uniform surroundings: with layers,
    // contours of ρ·H trace D = εE rather than E, and crowd ε times more densely in water.
    const contours = Math.abs(sol.placement.axis[0]) < 1e-6 && sol.layers.interfaces.length === 0;
    if (contours) this.contourLines(ctx, sol, grid, s, wt, sx, sy);
    else this.streamlines(ctx, grid, s, wt, sx, sy);
    ctx.stroke();
  }

  /**
   * Around an upright (axisymmetric) antenna in a uniform medium, E(t) is tangent to the
   * contours of ψ = ρ·Im{H·e^{jωt}}, so evenly spaced contours are field lines whose density
   * follows the field's strength.
   */
  private contourLines(
    ctx: CanvasRenderingContext2D,
    sol: Solution,
    grid: FieldGrid,
    s: Stats,
    wt: number,
    sx: number,
    sy: number,
  ): void {
    const cos = Math.cos(wt);
    const sin = Math.sin(wt);
    const xa = sol.placement.gap[0];
    const psi = new Float64Array(grid.nx * grid.ny);
    for (let j = 0; j < grid.ny; j++) {
      for (let i = 0; i < grid.nx; i++) {
        const k = j * grid.nx + i;
        psi[k] = (xAt(grid, i) - xa) * (grid.hRe[k] * sin + grid.hIm[k] * cos);
      }
    }
    const step = s.psiTop / LINE_LEVELS;
    const levels: number[] = [];
    for (let n = 0; n < LINE_LEVELS * 3; n++) levels.push((n + 0.5) * step, -(n + 0.5) * step);
    const seg = contourSegments(psi, grid.mask, grid.nx, grid.ny, levels);
    for (let n = 0; n < seg.length; n += 4) {
      ctx.moveTo(seg[n] * sx, seg[n + 1] * sy);
      ctx.lineTo(seg[n + 2] * sx, seg[n + 3] * sy);
    }
  }

  /**
   * Otherwise there is no such stream function, so the lines are traced: seeds on a
   * regular grid, each followed both ways along the instantaneous field direction until it
   * leaves the map, hits the metal, fades out or runs into another line.
   */
  private streamlines(
    ctx: CanvasRenderingContext2D,
    grid: FieldGrid,
    s: Stats,
    wt: number,
    sx: number,
    sy: number,
  ): void {
    const { nx, ny } = grid;
    const cos = Math.cos(wt);
    const sin = Math.sin(wt);
    const ex = new Float32Array(nx * ny);
    const ey = new Float32Array(nx * ny);
    for (let k = 0; k < nx * ny; k++) {
      ex[k] = grid.exRe[k] * cos - grid.exIm[k] * sin;
      // Grid rows run downward; flip y so directions are in grid units.
      ey[k] = -(grid.eyRe[k] * cos - grid.eyIm[k] * sin);
    }
    const floor = s.eTop * 2e-4;
    const cell = SEED_SPACING / 2;
    const cw = Math.ceil(nx / cell);
    const ch = Math.ceil(ny / cell);
    const owner = new Int32Array(cw * ch).fill(-1);
    const sample = (x: number, y: number): [number, number] | undefined => {
      const i = Math.floor(x - 0.5);
      const j = Math.floor(y - 0.5);
      if (i < 0 || j < 0 || i >= nx - 1 || j >= ny - 1) return undefined;
      const k = j * nx + i;
      if (grid.mask[k] || grid.mask[k + 1] || grid.mask[k + nx] || grid.mask[k + nx + 1])
        return undefined;
      const fx = x - 0.5 - i;
      const fy = y - 0.5 - j;
      const blend = (a: Float32Array) =>
        (a[k] * (1 - fx) + a[k + 1] * fx) * (1 - fy) +
        (a[k + nx] * (1 - fx) + a[k + nx + 1] * fx) * fy;
      const vx = blend(ex);
      const vy = blend(ey);
      const m = Math.hypot(vx, vy);
      return m < floor ? undefined : [vx / m, vy / m];
    };
    let id = 0;
    for (let cy = 0; cy < ch; cy += 2) {
      for (let cx = 0; cx < cw; cx += 2) {
        if (owner[cy * cw + cx] >= 0) continue;
        const line: [number, number][] = [];
        for (const dir of [1, -1]) {
          let x = (cx + 0.5) * cell;
          let y = (cy + 0.5) * cell;
          const part: [number, number][] = [];
          for (let n = 0; n < 400; n++) {
            const d1 = sample(x, y);
            if (!d1) break;
            const d2 = sample(x + dir * 0.3 * d1[0], y + dir * 0.3 * d1[1]);
            if (!d2) break;
            x += dir * 0.6 * d2[0];
            y += dir * 0.6 * d2[1];
            const c = Math.floor(y / cell) * cw + Math.floor(x / cell);
            if (c < 0 || c >= owner.length) break;
            if (owner[c] >= 0 && owner[c] !== id) break;
            owner[c] = id;
            part.push([x, y]);
          }
          if (dir === 1) line.push(...part.reverse());
          else line.push(...part);
        }
        if (line.length > 14) {
          ctx.moveTo(line[0][0] * sx, line[0][1] * sy);
          for (const [x, y] of line) ctx.lineTo(x * sx, y * sy);
        }
        id++;
      }
    }
  }
}
