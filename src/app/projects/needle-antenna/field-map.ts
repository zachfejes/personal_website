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
  rhoAt,
} from './physics/fields';
import { Solution, needleRadius } from './physics/solver';

export type FieldView = 'radiation' | 'needle' | 'point' | 'apex';
export type FieldQuantity = 'e' | 'e-rms' | 'h' | 'h-rms';

export const FIELD_VIEWS: readonly { id: FieldView; label: string }[] = [
  { id: 'radiation', label: 'Radiation zone' },
  { id: 'needle', label: 'Whole needle' },
  { id: 'point', label: 'Point' },
  { id: 'apex', label: 'Apex' },
];

export const FIELD_QUANTITIES: readonly { id: FieldQuantity; label: string }[] = [
  { id: 'e', label: 'E, instantaneous' },
  { id: 'e-rms', label: 'E, RMS' },
  { id: 'h', label: 'H, instantaneous' },
  { id: 'h-rms', label: 'H, RMS' },
];

/** The half-plane window each view shows. */
export function fieldWindow(sol: Solution, view: FieldView): FieldWindow {
  const g = sol.params.geometry;
  const L = g.length;
  switch (view) {
    case 'radiation': {
      const d = Math.max(1.6 * L, 1.25 * sol.wavelength);
      return { rhoMax: d, zMin: -0.03 * d, zMax: d };
    }
    case 'needle':
      return { rhoMax: 0.7 * L, zMin: -0.04 * L, zMax: 1.36 * L };
    case 'point': {
      const s = Math.max(g.taperLength, 4 * g.radius, 1e-9);
      return { rhoMax: s, zMin: L - 1.6 * s, zMax: L + 0.4 * s };
    }
    case 'apex': {
      const s = Math.max(30 * Math.min(g.tipRadius, g.radius), 1e-9);
      return { rhoMax: s, zMin: L - 1.5 * s, zMax: L + 0.5 * s };
    }
  }
}

/** Half-width resolution of the field grid (samples from the axis to the edge). */
const HALF_SAMPLES = 110;
/** Rows computed per slice before yielding to the browser. */
const ROWS_PER_SLICE = 6;
/** Color range of the log-magnitude maps (decades below the top). */
const DECADES = 3.5;
/** E field lines per sign. */
const LINE_LEVELS = 14;

interface Stats {
  /** Top of the color scale for E and H amplitudes (99.5th percentile, air only). */
  eTop: number;
  hTop: number;
  /** Field-line spacing for ρ·H_φ. */
  psiTop: number;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 1;
  values.sort((a, b) => a - b);
  return values[Math.min(values.length - 1, Math.floor(p * values.length))] || 1;
}

function stats(grid: FieldGrid): Stats {
  const e: number[] = [];
  const h: number[] = [];
  const psi: number[] = [];
  for (let j = 0; j < grid.nZ; j++) {
    for (let i = 0; i < grid.nRho; i++) {
      const k = j * grid.nRho + i;
      if (grid.mask[k] !== Mask.Air) continue;
      e.push(Math.hypot(grid.eRhoRe[k], grid.eRhoIm[k], grid.eZRe[k], grid.eZIm[k]));
      const hAmp = Math.hypot(grid.hPhiRe[k], grid.hPhiIm[k]);
      h.push(hAmp);
      psi.push(hAmp * rhoAt(grid, i));
    }
  }
  return { eTop: percentile(e, 0.995), hTop: percentile(h, 0.995), psiTop: percentile(psi, 0.99) };
}

/**
 * The fields around the needle in a plane through its axis: a color map of E or H, E field
 * lines, the needle and the ground plane. The grid is computed in slices so the page stays
 * responsive, then each animation frame only re-evaluates Re{phasor·e^{jωt}}.
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
  readonly view = input<FieldView>('needle');
  readonly quantity = input<FieldQuantity>('e');
  /** ωt in radians. */
  readonly phase = input(0);
  readonly lines = input(true);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly grid = signal<{ grid: FieldGrid; stats: Stats } | undefined>(undefined);
  private readonly cssWidth = signal(0);
  protected readonly progress = signal(0);

  protected readonly window = computed(() => fieldWindow(this.solution(), this.view()));
  protected readonly aspect = computed(() => {
    const w = this.window();
    return `${2 * w.rhoMax} / ${w.zMax - w.zMin}`;
  });

  protected readonly ariaLabel = computed(
    () =>
      `${FIELD_QUANTITIES.find((q) => q.id === this.quantity())?.label ?? ''} around the needle, ` +
      `${FIELD_VIEWS.find((v) => v.id === this.view())?.label ?? ''} view`,
  );

  protected readonly legend = computed(() => {
    const q = this.quantity();
    const s = this.grid()?.stats;
    const isE = q === 'e' || q === 'e-rms';
    const unit = isE ? 'V/m' : 'A/m';
    const top = s ? (isE ? s.eTop : s.hTop) / (q.endsWith('rms') ? Math.SQRT2 : 1) : 0;
    if (q === 'h') {
      return {
        label: 'H_φ (out of page ↔ into page)',
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
    const span = (2 * this.window().rhoMax) / 5;
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
      const nZ = Math.max(40, Math.round((HALF_SAMPLES * (win.zMax - win.zMin)) / win.rhoMax));
      const grid = createGrid(sol, win, HALF_SAMPLES, nZ);
      let row = 0;
      let timer = 0;
      this.progress.set(0);
      const step = () => {
        const until = performance.now() + 12;
        while (row < nZ && performance.now() < until) {
          fillRows(sol, grid, row, row + ROWS_PER_SLICE);
          row += ROWS_PER_SLICE;
        }
        this.progress.set(Math.min(1, row / nZ));
        if (row < nZ) timer = window.setTimeout(step, 0);
        else this.grid.set({ grid, stats: stats(grid) });
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
      this.draw(data.grid, data.stats, q, wt, lines);
    });
  }

  private offscreen?: HTMLCanvasElement;

  private draw(grid: FieldGrid, s: Stats, q: FieldQuantity, wt: number, lines: boolean): void {
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

    const nx = grid.nRho * 2;
    const ny = grid.nZ;
    this.offscreen ??= document.createElement('canvas');
    const off = this.offscreen;
    off.width = nx;
    off.height = ny;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;
    const image = offCtx.createImageData(nx, ny);
    this.paint(image.data, grid, s, q, wt);
    offCtx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, W, H);

    const win = grid.window;
    const px = (rho: number) => W / 2 + (rho / win.rhoMax) * (W / 2);
    const py = (z: number) => ((win.zMax - z) / (win.zMax - win.zMin)) * H;

    if (lines && (q === 'e' || q === 'h')) this.fieldLines(ctx, grid, s, wt, W, H, dpr);

    // Ground plane.
    if (win.zMin < 0) {
      const y0 = py(0);
      ctx.fillStyle = '#26231f';
      ctx.fillRect(0, y0, W, H - y0);
      ctx.strokeStyle = 'rgb(227 168 87 / 70%)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(W, y0);
      ctx.stroke();
    }

    // The needle, at true scale (never thinner than a hairline).
    const g = this.solution().params.geometry;
    const zs = this.profileHeights(g.length, win);
    const minHalf = 0.75 * dpr;
    ctx.beginPath();
    zs.forEach((z, i) => {
      const r = Math.max(px(needleRadius(g, z)) - W / 2, z < g.length ? minHalf : 0);
      if (i === 0) ctx.moveTo(W / 2 + r, py(z));
      else ctx.lineTo(W / 2 + r, py(z));
    });
    for (let i = zs.length - 1; i >= 0; i--) {
      const z = zs[i];
      const r = Math.max(px(needleRadius(g, z)) - W / 2, z < g.length ? minHalf : 0);
      ctx.lineTo(W / 2 - r, py(z));
    }
    ctx.closePath();
    const metal = ctx.createLinearGradient(0, 0, W, 0);
    metal.addColorStop(0.45, '#8d918c');
    metal.addColorStop(0.5, '#e8e6df');
    metal.addColorStop(0.55, '#7d817c');
    ctx.fillStyle = metal;
    ctx.fill();
    ctx.strokeStyle = 'rgb(20 25 23 / 80%)';
    ctx.lineWidth = 0.6 * dpr;
    ctx.stroke();

    // Scale bar.
    const bar = this.barLength();
    const barPx = (bar / (2 * win.rhoMax)) * W;
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

  /** Heights to trace the needle outline within the window, dense near the apex. */
  private profileHeights(L: number, win: FieldWindow): number[] {
    const lo = Math.max(0, win.zMin);
    const hi = Math.min(L, win.zMax);
    const zs: number[] = [];
    if (hi <= lo) return zs;
    for (let i = 0; i <= 300; i++) zs.push(lo + ((hi - lo) * i) / 300);
    const rTip = Math.min(this.solution().params.geometry.tipRadius, hi - lo);
    for (let i = 1; i <= 40; i++) zs.push(L - rTip + (rTip * i) / 40);
    return zs.filter((z) => z <= hi).sort((a, b) => a - b);
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
    const nR = grid.nRho;
    const nx = nR * 2;
    const isE = q === 'e' || q === 'e-rms';
    const top = isE ? s.eTop : s.hTop;
    const logTop = Math.log10(top);
    const signed = q === 'h';
    const soft = top / 1000;
    const softNorm = Math.asinh(top / soft);
    for (let j = 0; j < grid.nZ; j++) {
      for (let c = 0; c < nx; c++) {
        const right = c >= nR;
        const i = right ? c - nR : nR - 1 - c;
        const k = j * nR + i;
        const o = (j * nx + c) * 4;
        data[o + 3] = 255;
        if (grid.mask[k] !== Mask.Air) {
          data[o] = 12;
          data[o + 1] = 15;
          data[o + 2] = 14;
          continue;
        }
        let lut: Lut = EMBER;
        let t: number;
        if (signed) {
          // H_φ points out of the page on one side of the axis and into it on the other.
          const h = (grid.hPhiRe[k] * cos - grid.hPhiIm[k] * sin) * (right ? 1 : -1);
          t = 0.5 + (0.5 * Math.asinh(h / soft)) / softNorm;
          lut = TIDE;
        } else {
          let v: number;
          if (q === 'e') {
            const er = grid.eRhoRe[k] * cos - grid.eRhoIm[k] * sin;
            const ez = grid.eZRe[k] * cos - grid.eZIm[k] * sin;
            v = Math.hypot(er, ez);
          } else if (q === 'e-rms') {
            v = Math.hypot(grid.eRhoRe[k], grid.eRhoIm[k], grid.eZRe[k], grid.eZIm[k]);
          } else {
            v = Math.hypot(grid.hPhiRe[k], grid.hPhiIm[k]);
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
   * Instantaneous E field lines. Around an axisymmetric TM source, E(t) is everywhere tangent to
   * the contours of ψ = ρ·Im{H_φ·e^{jωt}}, so evenly spaced contours of ψ are field lines whose
   * density follows the field's strength.
   */
  private fieldLines(
    ctx: CanvasRenderingContext2D,
    grid: FieldGrid,
    s: Stats,
    wt: number,
    W: number,
    H: number,
    dpr: number,
  ): void {
    const cos = Math.cos(wt);
    const sin = Math.sin(wt);
    const nR = grid.nRho;
    const psi = new Float64Array(nR * grid.nZ);
    for (let j = 0; j < grid.nZ; j++) {
      for (let i = 0; i < nR; i++) {
        const k = j * nR + i;
        psi[k] = rhoAt(grid, i) * (grid.hPhiRe[k] * sin + grid.hPhiIm[k] * cos);
      }
    }
    const step = s.psiTop / LINE_LEVELS;
    const levels: number[] = [];
    for (let n = 0; n < LINE_LEVELS * 3; n++) levels.push((n + 0.5) * step, -(n + 0.5) * step);
    const seg = contourSegments(psi, grid.mask, nR, grid.nZ, levels);
    const sx = W / 2 / nR;
    const sy = H / grid.nZ;
    ctx.strokeStyle = 'rgb(246 240 226 / 55%)';
    ctx.lineWidth = 0.9 * dpr;
    ctx.beginPath();
    for (let n = 0; n < seg.length; n += 4) {
      const x1 = seg[n] * sx;
      const y1 = seg[n + 1] * sy;
      const x2 = seg[n + 2] * sx;
      const y2 = seg[n + 3] * sy;
      ctx.moveTo(W / 2 + x1, y1);
      ctx.lineTo(W / 2 + x2, y2);
      ctx.moveTo(W / 2 - x1, y1);
      ctx.lineTo(W / 2 - x2, y2);
    }
    ctx.stroke();
  }
}
