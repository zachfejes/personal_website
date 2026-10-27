import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { GlobeOptions, globe } from './globe';

/** Drawn at this width before the strip can be measured (prerendering). */
const DEFAULT_WIDTH_PX = 1440;
/** Phones get a smaller, more curved globe in a shorter strip. Matches $narrow in _sheet.scss. */
const NARROW_MAX_PX = 760;

type Preset = Omit<GlobeOptions, 'width'>;
const SHARED = { tilt: 0.32, latitudeStep: 5, longitudeStep: 10, minLatitude: 15 } as const;
const PRESETS: { wide: Preset; narrow: Preset } = {
  wide: { ...SHARED, height: 330, top: 150, radius: 2100, tick: { gap: 5, minor: 11, major: 20 } },
  narrow: { ...SHARED, height: 170, top: 34, radius: 900, tick: { gap: 4, minor: 8, major: 14 } },
};
/** The globe's surface fades out over the lower part of the strip, into the next section. */
const FADE_FROM = 0.45;
const RING_OFFSET_PX = 10;

let nextId = 0;

/**
 * The edge between the hero and the first section: a wireframe planet rising out of the page,
 * continuing the hero's construction rings. Its surface takes the next section's tone and fades
 * into it.
 */
@Component({
  selector: 'app-globe-edge',
  templateUrl: './globe-edge.html',
  styleUrl: './globe-edge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[style.height.px]': 'preset().height' },
})
export class GlobeEdge {
  protected readonly id = `globe-${nextId++}`;
  private readonly width = signal(DEFAULT_WIDTH_PX);
  protected readonly preset = computed(() =>
    this.width() <= NARROW_MAX_PX ? PRESETS.narrow : PRESETS.wide,
  );
  protected readonly shape = computed(() => globe({ ...this.preset(), width: this.width() }));
  protected readonly view = computed(() => ({
    width: this.width(),
    height: this.preset().height,
    top: this.preset().top,
    fadeFrom: this.preset().top + (this.preset().height - this.preset().top) * FADE_FROM,
    ringRadius: this.shape().radius + RING_OFFSET_PX,
  }));

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new ResizeObserver(() => {
        const width = Math.round(host.getBoundingClientRect().width);
        if (width) this.width.set(width);
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
