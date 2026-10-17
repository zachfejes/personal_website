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

const HEX_RADIX = 16;
const SHORT_HEX_LENGTH = 3;
const BYTE = 255;
const FALLBACK_COLOR: Rgb = [BYTE, BYTE, BYTE];
/** Bit offsets of red, green and blue in a packed 0xRRGGBB value. */
const CHANNEL_SHIFTS = { red: 16, green: 8 } as const;
const ALPHA_DIGITS = 3;
const FULL_CIRCLE = Math.PI * 2;
const MS_PER_SECOND = 1000;

/** Device pixel ratio cap: sharper canvases cost more than they show. */
const MAX_PIXEL_RATIO = 2;

/** How far the route may run past the content padding, px. */
const ROUTE_BOUNDS = { edgeInsetPx: 24, leftOverhangPx: 64, rightOverhangPx: 40 } as const;
/** Text-zone movement below this many px doesn't re-plan the route. */
const ZONE_KEY_STEP_PX = 12;

const STARS = {
  dimAlpha: 0.35,
  twinkleAlpha: 0.45,
  stillAlpha: 0.6,
  /** Brightness floor for stars on the route, so they read even at low intensity. */
  routeIntensityMin: 0.8,
  routeRadiusMin: 1.5,
  glowRadiusPx: 9,
  glowAlpha: 0.45,
} as const;

const PATH = {
  alpha: 0.55,
  fadeMidAlpha: 0.2,
  widthPx: 1.6,
  anchorRadiusPx: 2.2,
  anchorAlpha: 0.9,
} as const;

const BRANCH = {
  dash: [5, 7],
  alpha: 0.3,
  widthPx: 1.1,
  /** How far the curve's control point rises above the higher end, px. */
  bowPx: 40,
  targetRadiusPx: 6,
  targetAlpha: 0.7,
} as const;

const WAYPOINT = {
  ringAlpha: 0.95,
  ringWidthPx: 1.5,
  pulsePeriodMs: 3200,
  /** Offsets each waypoint's pulse phase by its size, so they don't pulse in step. */
  pulsePhaseSizePx: 10,
  pulseAlpha: 0.6,
  pulseStartScale: 0.6,
  pulseGrowth: 1.8,
  leaderAlpha: 0.6,
  /** Leader lines start this fraction of the ring radius from the star. */
  leaderStart: 0.7,
} as const;

const LABEL_TEXT = { sizePx: 11, letterSpacing: '1px' } as const;

const PROBE = {
  /** Pause between laps, as extra px of travel. */
  lapGapPx: 160,
  trailStepPx: 1.5,
  trailAlpha: 0.55,
  trailRadius: { min: 0.4, range: 1.3 },
  glowRadiusPx: 10,
  glowAlpha: 0.55,
  radiusPx: 2.4,
} as const;

function parseColor(value: string): Rgb {
  const hex = value.trim().replace('#', '');
  const full = hex.length === SHORT_HEX_LENGTH ? [...hex].map((c) => c + c).join('') : hex;
  const n = parseInt(full, HEX_RADIX);
  return Number.isNaN(n)
    ? FALLBACK_COLOR
    : [(n >> CHANNEL_SHIFTS.red) & BYTE, (n >> CHANNEL_SHIFTS.green) & BYTE, n & BYTE];
}

const rgba = (c: Rgb, a: number) =>
  `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(ALPHA_DIGITS)})`;

/** Sine wave rescaled to 0–1. */
const wave = (phase: number) => 0.5 + 0.5 * Math.sin(phase);

/** Soft radial glow centered on (x, y), fading out at radius r. */
function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: Rgb,
  alpha: number,
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}

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
    const dpr = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
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
      left: Math.max(-ROUTE_BOUNDS.edgeInsetPx, padL - ROUTE_BOUNDS.leftOverhangPx),
      right: Math.min(
        this.width - ROUTE_BOUNDS.edgeInsetPx,
        this.width - padR + ROUTE_BOUNDS.rightOverhangPx,
      ),
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
      ...[zone.l, zone.t, zone.r, zone.b].map((v) => Math.round(v / ZONE_KEY_STEP_PX)),
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
          ? STARS.stillAlpha
          : STARS.dimAlpha + STARS.twinkleAlpha * wave((t / MS_PER_SECOND) * s.s + s.p);
      if (steady) {
        glow(ctx, s.x, s.y, STARS.glowRadiusPx, colors.star, STARS.glowAlpha * config.intensity);
      }
      ctx.fillStyle = rgba(
        colors.star,
        a * Math.max(config.intensity, steady ? STARS.routeIntensityMin : 0),
      );
      ctx.beginPath();
      ctx.arc(s.x, s.y, steady ? Math.max(s.r, STARS.routeRadiusMin) : s.r, 0, FULL_CIRCLE);
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
      g.addColorStop(0.5, rgba(colors.line, PATH.fadeMidAlpha));
      g.addColorStop(1, rgba(colors.line, PATH.alpha));
      ctx.strokeStyle = g;
    } else {
      ctx.strokeStyle = rgba(colors.line, PATH.alpha);
    }
    ctx.lineWidth = PATH.widthPx;
    ctx.beginPath();
    path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();

    // Dashed branch toward the next star.
    if (route.branch) {
      const [a, b] = route.branch;
      ctx.setLineDash(BRANCH.dash);
      ctx.strokeStyle = rgba(colors.line, BRANCH.alpha);
      ctx.lineWidth = BRANCH.widthPx;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - BRANCH.bowPx, b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = rgba(colors.accent, BRANCH.targetAlpha);
      ctx.beginPath();
      ctx.arc(b.x, b.y, BRANCH.targetRadiusPx, 0, FULL_CIRCLE);
      ctx.stroke();
    }

    for (const s of route.anchors) {
      ctx.fillStyle = rgba(colors.accent, PATH.anchorAlpha * fadeAt(route, s.x));
      ctx.beginPath();
      ctx.arc(s.x, s.y, PATH.anchorRadiusPx, 0, FULL_CIRCLE);
      ctx.fill();
    }

    // Waypoint rings, pulses, leader lines and labels.
    ctx.font = `${LABEL_TEXT.sizePx}px ${this.labelFont}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = LABEL_TEXT.letterSpacing;
    for (const w of route.waypoints) {
      const { x, y } = w.star;
      ctx.strokeStyle = rgba(colors.accent, WAYPOINT.ringAlpha);
      ctx.lineWidth = WAYPOINT.ringWidthPx;
      ctx.beginPath();
      ctx.arc(x, y, w.size, 0, FULL_CIRCLE);
      ctx.stroke();
      if (!this.reduceMotion) {
        const k = (t / WAYPOINT.pulsePeriodMs + w.size / WAYPOINT.pulsePhaseSizePx) % 1;
        ctx.strokeStyle = rgba(colors.accent, WAYPOINT.pulseAlpha * (1 - k));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
          x,
          y,
          w.size * (WAYPOINT.pulseStartScale + WAYPOINT.pulseGrowth * k),
          0,
          FULL_CIRCLE,
        );
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
      const leader = w.size * WAYPOINT.leaderStart;
      ctx.strokeStyle = rgba(colors.muted, WAYPOINT.leaderAlpha);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + L.sx * leader, y + L.sy * leader);
      ctx.lineTo(L.ex, L.ey);
      ctx.stroke();
      ctx.fillStyle = rgba(colors.muted, 1);
      ctx.fillText(w.label, L.bx, L.by + LABEL_TEXT.sizePx);
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    // Probe: constant speed (px/s of real time), positioned by arc length, with a fading trail.
    if (this.reduceMotion || config.probeSpeed <= 0) return;
    const cycle = route.total + config.trail + PROBE.lapGapPx;
    const head = ((clock / MS_PER_SECOND) * config.probeSpeed) % cycle;
    const step = PROBE.trailStepPx;
    for (let k = Math.floor(config.trail / step); k >= 1; k--) {
      const d = head - k * step;
      if (d < 0 || d > route.total) continue;
      const p = pointAt(path, d);
      const f = 1 - (k * step) / config.trail;
      ctx.fillStyle = rgba(colors.accent, PROBE.trailAlpha * f * f * fadeAt(route, p.x));
      ctx.beginPath();
      ctx.arc(p.x, p.y, PROBE.trailRadius.min + PROBE.trailRadius.range * f, 0, FULL_CIRCLE);
      ctx.fill();
    }
    if (head <= route.total) {
      const p = pointAt(path, head);
      const fa = fadeAt(route, p.x);
      glow(ctx, p.x, p.y, PROBE.glowRadiusPx, colors.accent, PROBE.glowAlpha * fa);
      ctx.fillStyle = rgba(colors.accent, fa);
      ctx.beginPath();
      ctx.arc(p.x, p.y, PROBE.radiusPx, 0, FULL_CIRCLE);
      ctx.fill();
    }
  }
}
