import { Directive, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';

/** Reveal once the element is this far above the bottom of the viewport. */
const REVEAL_MARGIN = '0px 0px -10% 0px';

/**
 * Fades and slides an element in as it scrolls into view. Content is visible by default
 * (prerendered HTML, no JS, reduced motion); only elements that start below the fold in the
 * browser are hidden until they arrive.
 */
@Directive({ selector: '[appReveal]' })
export class RevealDirective {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.classList.add('reveal-pending');
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          el.classList.add('reveal-in');
          el.classList.remove('reveal-pending');
          observer.disconnect();
        },
        { rootMargin: REVEAL_MARGIN },
      );
      observer.observe(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
