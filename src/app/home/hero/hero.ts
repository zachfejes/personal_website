import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { parseHeadline } from './accent';
import { FluidScale, HeadlineFitter } from './headline-fitter';
import { StarfieldConfig, StarfieldRenderer } from './starfield-renderer';

/** Hero settings from design/hero-baseline.json. */
const STARFIELD: Omit<StarfieldConfig, 'route'> = {
  intensity: 0.9,
  speed: 1.5,
  density: 3,
  probeSpeed: 53,
  trail: 140,
  zoneMargin: 20,
};

const REM_PX = 16;

/** Headline and intro sizes from the 320px phone to the 1440px desktop, in rem. */
const FLUID_SCALE: FluidScale = {
  refSmall: 320,
  refLarge: 1440,
  headlineSmall: 2.1 * REM_PX,
  headlineLarge: 3.6 * REM_PX,
  ledeSmall: 1 * REM_PX,
  ledeLarge: 1.4 * REM_PX,
};

const ROUTE: Omit<StarfieldConfig['route'], 'labels'> = {
  shape: 'under',
  end: 'fade',
  sideMin: 35,
};

const DEFAULT_WAYPOINTS: [string, string] = ['WP-01 · ARMADA', 'WP-02 · NEXT'];

/**
 * Full-screen hero: eyebrow, headline (authored line breaks with "|", accent words with *…*),
 * intro, and projected action buttons, over an animated star field whose survey route avoids
 * the text. The text is prerendered; the star field and fitting start in the browser.
 */
@Component({
  selector: 'app-hero',
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  host: { class: 'band band--dark hero' },
})
export class Hero {
  readonly eyebrow = input.required<string>();
  /** Optional shorter eyebrow, shown instead of the full one when the hero is narrow (phones). */
  readonly eyebrowShort = input<string>();
  readonly headline = input.required<string>();
  readonly lede = input.required<string>();
  /** Labels for the two route waypoints. */
  readonly waypoints = input<[string, string]>(DEFAULT_WAYPOINTS);

  protected readonly lines = computed(() => parseHeadline(this.headline()));

  private readonly sky = viewChild.required<ElementRef<HTMLCanvasElement>>('sky');
  private readonly headlineEl = viewChild.required<ElementRef<HTMLElement>>('headlineEl');
  private readonly copy = viewChild.required<ElementRef<HTMLElement>>('copy');

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const fitter = new HeadlineFitter(host, this.headlineEl().nativeElement, FLUID_SCALE);
      fitter.fit();

      let renderer: StarfieldRenderer | null = null;
      try {
        renderer = new StarfieldRenderer(
          this.sky().nativeElement,
          host,
          () => Array.from(this.copy().nativeElement.children),
          {
            ...STARFIELD,
            route: { ...ROUTE, labels: this.waypoints() },
          },
        );
        void document.fonts.ready.then(() => renderer?.refresh());
      } catch {
        // No 2D canvas: the hero still works as plain text.
      }

      destroyRef.onDestroy(() => {
        fitter.destroy();
        renderer?.destroy();
      });
    });
  }
}
