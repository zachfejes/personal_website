import {
  Frame,
  Rect,
  RouteMode,
  RouteOptions,
  Star,
  StarRoute,
  createStars,
  fadeAt,
  placeLabel,
  planRoute,
  pointAt,
} from './star-field';

export interface StarfieldConfig {
  /** Star brightness, 0–1. */
  intensity: number;
  /** Twinkle and waypoint-pulse speed multiplier. */
  speed: number;
  density: number;
  /** Probe speed along the route, px per second. */
  probeSpeed: number;
  /** Probe trail length, px. */
  trail: number;
  /** Margin kept clear around the hero text, px. */
  zoneMargin: number;
  route: RouteOptions;
}

interface Palette {
  star: string;
  accent: string;
  line: string;
  muted: string;
  labelFont: string;
}

type Rgb = [number, number, number];

function parseColor(value: string): Rgb {
  const hex = value.trim().replace('#', '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const n = parseInt(full, 16);
  return Number.isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const rgba = (c: Rgb, a: number) =>
  `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;

/**
 * Draws the hero's star field and survey trajectory on a canvas. Browser only: construct it
 * after render. It reads colors and fonts from the hero's CSS custom properties, re-plans the
 * route when the hero resizes or the text moves, and pauses when the hero is off-screen or the
 * tab is hidden. With prefers-reduced-motion it draws one still frame (no twinkle, no probe).
 */
export class StarfieldRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly colors: { star: Rgb; accent: Rgb; line: Rgb; muted: Rgb };
  private readonly labelFont: string;
  private width = 0;
  private height = 0;
  private stars: Star[] = [];
  private starsKey = '';
  private route: StarRoute | null = null;
  private routeKey = '';
  private mode: RouteMode = 'side';
  private frameId = 0;
  private visible = true;
  private readonly resizeObserver: ResizeObserver;
  private readonly intersectionObserver: IntersectionObserver;
  private readonly onVisibility = () => this.schedule();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly hero: HTMLElement,
    private readonly textElements: () => Element[],
    private readonly config: StarfieldConfig,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not supported');
    this.ctx = ctx;
    const css = getComputedStyle(hero);
    const palette: Palette = {
      star: css.getPropertyValue('--color-starlight'),
      accent: css.getPropertyValue('--color-highlight'),
      line: css.getPropertyValue('--color-on-dark'),
      muted: css.getPropertyValue('--color-muted'),
      labelFont: css.getPropertyValue('--font-label'),
    };
    this.colors = {
      star: parseColor(palette.star),
      accent: parseColor(palette.accent),
      line: parseColor(palette.line),
      muted: parseColor(palette.muted),
    };
    this.labelFont = palette.labelFont || 'monospace';

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.schedule();
    });
    this.intersectionObserver.observe(hero);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
  }

  /** Re-measure the text and redraw (call after the text changes size, e.g. fonts loaded). */
  refresh(): void {
    this.routeKey = '';
    this.schedule();
  }

  destroy(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private resize(): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.round(this.width * dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.refresh();
  }

  private schedule(): void {
    cancelAnimationFrame(this.frameId);
    if (this.visible && !document.hidden) {
      this.frameId = requestAnimationFrame((t) => this.frame(t));
    }
  }

  /** Tight bounds of the hero text and buttons, in canvas coordinates, plus the margin. */
  private measureZone(): Rect {
    const c = this.canvas.getBoundingClientRect();
    const m = this.config.zoneMargin;
    const rects: DOMRect[] = [];
    for (const el of this.textElements()) {
      if (el.children.length && el.querySelector('a, button')) {
        el.querySelectorAll('a, button').forEach((b) => rects.push(b.getBoundingClientRect()));
      } else {
        const range = document.createRange();
        range.selectNodeContents(el);
        rects.push(range.getBoundingClientRect());
      }
    }
    const live = rects.filter((r) => r.width > 0 && r.height > 0);
    if (!live.length) return { l: 0, t: 0, r: 0, b: 0 };
    return {
      l: Math.min(...live.map((r) => r.left)) - c.left - m,
      t: Math.min(...live.map((r) => r.top)) - c.top - m,
      r: Math.max(...live.map((r) => r.right)) - c.left + m,
      b: Math.max(...live.map((r) => r.bottom)) - c.top + m,
    };
  }

  /** The route stays within the content area; the stars run full width. */
  private measureFrame(): Frame {
    const css = getComputedStyle(this.hero);
    const padL = parseFloat(css.paddingLeft) || 0;
    const padR = parseFloat(css.paddingRight) || 0;
    return {
      width: this.width,
      height: this.height,
      left: Math.max(-24, padL - 64),
      right: Math.min(this.width - 24, this.width - padR + 40),
    };
  }

  private plan(): StarRoute {
    const starsKey = `${this.width}|${this.height}`;
    if (starsKey !== this.starsKey) {
      this.stars = createStars(this.width, this.height, this.config.density);
      this.starsKey = starsKey;
      this.routeKey = '';
    }
    const zone = this.measureZone();
    const frame = this.measureFrame();
    const key = [
      starsKey,
      frame.left,
      frame.right,
      ...[zone.l, zone.t, zone.r, zone.b].map((v) => Math.round(v / 12)),
    ].join('|');
    if (!this.route || key !== this.routeKey) {
      this.route = planRoute(this.stars, zone, frame, this.config.route, this.mode);
      this.mode = this.route.mode;
      this.routeKey = key;
    }
    return this.route;
  }

  private frame(time: number): void {
    const { ctx, colors, config } = this;
    const route = this.plan();
    const t = this.reduceMotion ? 0 : time * config.speed;
    ctx.clearRect(0, 0, this.width, this.height);

    for (const s of this.stars) {
      const steady = route.highlighted.has(s);
      const a = steady
        ? 1
        : this.reduceMotion
          ? 0.6
          : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin((t / 1000) * s.s + s.p));
      if (steady) {
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 9);
        g.addColorStop(0, rgba(colors.star, 0.45 * config.intensity));
        g.addColorStop(1, rgba(colors.star, 0));
        ctx.fillStyle = g;
        ctx.fillRect(s.x - 9, s.y - 9, 18, 18);
      }
      ctx.fillStyle = rgba(colors.star, a * Math.max(config.intensity, steady ? 0.8 : 0));
      ctx.beginPath();
      ctx.arc(s.x, s.y, steady ? Math.max(s.r, 1.5) : s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (route.mode !== 'hidden') this.drawRoute(route, t, time);
    if (!this.reduceMotion) this.schedule();
  }

  private drawRoute(route: StarRoute, t: number, clock: number): void {
    const { ctx, colors, config } = this;
    const { path, fade } = route;

    // Path line, fading toward the content edge when enabled.
    if (fade) {
      const g = ctx.createLinearGradient(fade.x0, 0, fade.x0 + fade.len, 0);
      g.addColorStop(0, rgba(colors.line, 0));
      g.addColorStop(0.5, rgba(colors.line, 0.2));
      g.addColorStop(1, rgba(colors.line, 0.55));
      ctx.strokeStyle = g;
    } else {
      ctx.strokeStyle = rgba(colors.line, 0.55);
    }
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();

    // Dashed branch toward the next star.
    if (route.branch) {
      const [a, b] = route.branch;
      ctx.setLineDash([5, 7]);
      ctx.strokeStyle = rgba(colors.line, 0.3);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - 40, b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = rgba(colors.accent, 0.7);
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const s of route.anchors) {
      ctx.fillStyle = rgba(colors.accent, 0.9 * fadeAt(route, s.x));
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Waypoint rings, pulses, leader lines and labels.
    ctx.font = `11px ${this.labelFont}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
    for (const w of route.waypoints) {
      const { x, y } = w.star;
      ctx.strokeStyle = rgba(colors.accent, 0.95);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, w.size, 0, Math.PI * 2);
      ctx.stroke();
      if (!this.reduceMotion) {
        const k = (t / 3200 + w.size / 10) % 1;
        ctx.strokeStyle = rgba(colors.accent, 0.6 * (1 - k));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, w.size * (0.6 + 1.8 * k), 0, Math.PI * 2);
        ctx.stroke();
      }
      const L = placeLabel(
        x,
        y,
        ctx.measureText(w.label).width,
        route.zone,
        this.width,
        this.height,
      );
      ctx.strokeStyle = rgba(colors.muted, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + L.sx * w.size * 0.7, y + L.sy * w.size * 0.7);
      ctx.lineTo(L.ex, L.ey);
      ctx.stroke();
      ctx.fillStyle = rgba(colors.muted, 1);
      ctx.fillText(w.label, L.bx, L.by + 11);
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    // Probe: constant speed (px/s of real time), positioned by arc length, with a fading trail.
    if (this.reduceMotion || config.probeSpeed <= 0) return;
    const cycle = route.total + config.trail + 160;
    const head = ((clock / 1000) * config.probeSpeed) % cycle;
    const step = 1.5;
    for (let k = Math.floor(config.trail / step); k >= 1; k--) {
      const d = head - k * step;
      if (d < 0 || d > route.total) continue;
      const p = pointAt(path, d);
      const f = 1 - (k * step) / config.trail;
      ctx.fillStyle = rgba(colors.accent, 0.55 * f * f * fadeAt(route, p.x));
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.4 + 1.3 * f, 0, Math.PI * 2);
      ctx.fill();
    }
    if (head <= route.total) {
      const p = pointAt(path, head);
      const fa = fadeAt(route, p.x);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
      g.addColorStop(0, rgba(colors.accent, 0.55 * fa));
      g.addColorStop(1, rgba(colors.accent, 0));
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 10, p.y - 10, 20, 20);
      ctx.fillStyle = rgba(colors.accent, fa);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
