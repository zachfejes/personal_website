import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';

/** Pulse once the head is this far up from the bottom of the viewport. */
const PULSE_MARGIN = '0px 0px -15% 0px';

/**
 * A section's head on the drawing sheet: an orbit marker sitting on the thread in the left margin,
 * then the section's number (or kind, e.g. "Field note") and its short title. The first time it
 * scrolls into view, the marker's orbit sends out one ping (not with reduced motion).
 */
@Component({
  selector: 'app-sheet-head',
  template: `
    <span class="marker" [class.pulse]="pulsed()" aria-hidden="true">
      <span class="ping"></span>
    </span>
    <span class="number">{{ number() }}</span>
    <span class="title">{{ title() }}</span>
  `,
  styleUrl: './sheet-head.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetHead {
  readonly number = input.required<string>();
  readonly title = input.required<string>();

  protected readonly pulsed = signal(false);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          this.pulsed.set(true);
          observer.disconnect();
        },
        { rootMargin: PULSE_MARGIN },
      );
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
