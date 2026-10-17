export interface FluidScale {
  /** Hero widths (px) where the small and large sizes apply. */
  refSmall: number;
  refLarge: number;
  /** Sizes in px at those widths. */
  headlineSmall: number;
  headlineLarge: number;
  ledeSmall: number;
  ledeLarge: number;
}

/** Below this fraction of the small headline size, stop locking lines and let them wrap. */
const MIN_LOCKED_SCALE = 0.8;
/** Shrink-to-fit lands this fraction under the exact fit, so rounding never wraps a line. */
const FIT_MARGIN = 0.99;
/** The intro never narrows below this, px, even under a short headline. */
const MIN_LEDE_WIDTH_PX = 280;

/** Linear interpolation of a size by hero width, clamped to the two reference points. */
export function interpolate(width: number, small: number, large: number, s: FluidScale): number {
  const k = Math.min(1, Math.max(0, (width - s.refSmall) / Math.max(1, s.refLarge - s.refSmall)));
  return small + k * (large - small);
}

/**
 * Keeps the hero headline on its authored line breaks. The size interpolates by hero width; if
 * the widest line would overflow, the headline shrinks to fit instead of wrapping. Below 80% of
 * the small size it gives up and lets lines wrap normally. The intro text is set to the
 * headline's width so the two read as one block. Browser only.
 */
export class HeadlineFitter {
  private lastWidth = -1;
  private readonly observer: ResizeObserver;

  constructor(
    private readonly hero: HTMLElement,
    private readonly headline: HTMLElement,
    private readonly scale: FluidScale,
  ) {
    this.observer = new ResizeObserver(() => {
      if (hero.clientWidth !== this.lastWidth) this.fit();
    });
    this.observer.observe(hero);
    void document.fonts.ready.then(() => this.fit());
  }

  fit(): void {
    const { hero, headline, scale } = this;
    this.lastWidth = hero.clientWidth;
    const css = getComputedStyle(hero);
    const avail = hero.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    const target = interpolate(hero.clientWidth, scale.headlineSmall, scale.headlineLarge, scale);
    hero.style.setProperty(
      '--hero-lede-size',
      `${interpolate(hero.clientWidth, scale.ledeSmall, scale.ledeLarge, scale)}px`,
    );

    headline.classList.add('is-locked');
    headline.style.fontSize = `${target}px`;
    const lines = Array.from(headline.children) as HTMLElement[];
    const widest = () => Math.max(...lines.map((l) => l.getBoundingClientRect().width));
    let size = target;
    if (lines.length && widest() > avail) size = ((target * avail) / widest()) * FIT_MARGIN;
    const minLocked = scale.headlineSmall * MIN_LOCKED_SCALE;
    const locked = size >= minLocked;
    if (!locked) size = minLocked;
    headline.classList.toggle('is-locked', locked);
    headline.style.fontSize = `${size}px`;
    const blockWidth = locked && lines.length ? widest() : avail;
    hero.style.setProperty('--hero-lede-max', `${Math.max(blockWidth, MIN_LEDE_WIDTH_PX)}px`);
  }

  destroy(): void {
    this.observer.disconnect();
  }
}
