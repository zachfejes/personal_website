import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TEX_RENDERER } from './tex-render';

/** KaTeX's stylesheet, built as its own file (angular.json) so only pages with math load it. */
const KATEX_STYLESHEET = { id: 'katex-css', href: 'katex.css' } as const;

/**
 * An equation, typeset with KaTeX. Typeset during prerendering, so readers get finished HTML and
 * MathML (for screen readers) without waiting for scripts, and the browser keeps that markup
 * instead of typesetting it again: KaTeX's script only loads if an equation has to be typeset in
 * the browser (e.g. arriving on the page by in-app navigation). Only ever given TeX written in
 * this codebase, which is why its HTML can be trusted.
 */
@Component({
  selector: 'app-tex',
  template: '<span [innerHTML]="html()"></span>',
  styles: ':host { display: inline; } :host(.tex--display) { display: block; overflow-x: auto; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.tex--display]': 'display()' },
})
export class Tex {
  /** TeX source, e.g. `y = ax^{b}`. */
  readonly tex = input.required<string>();
  /** Display (centered, on its own line) rather than inline math. */
  readonly display = input(false);

  private readonly sanitizer = inject(DomSanitizer);
  private readonly render = inject(TEX_RENDERER);

  /** Markup already in the page from prerendering, when the browser is taking it over. */
  private prerendered = prerenderedMarkup(
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
  );

  protected readonly html = signal<SafeHtml | null>(this.trust(this.prerendered));

  constructor() {
    const document = inject(DOCUMENT);
    if (!document.getElementById(KATEX_STYLESHEET.id)) {
      const link = document.createElement('link');
      link.id = KATEX_STYLESHEET.id;
      link.rel = 'stylesheet';
      link.href = KATEX_STYLESHEET.href;
      document.head.appendChild(link);
    }

    effect(() => {
      const tex = this.tex();
      const display = this.display();
      // The first time round, prerendered markup is the equation already: keep it.
      if (this.prerendered !== null) {
        this.prerendered = null;
        return;
      }
      const markup = this.render(tex, display);
      // Typeset at once where it can be (prerendering), so the page is written with it.
      if (typeof markup === 'string') {
        untracked(() => this.html.set(this.trust(markup)));
      } else {
        void markup.then((loaded) => this.html.set(this.trust(loaded)));
      }
    });
  }

  private trust(markup: string | null): SafeHtml | null {
    return markup === null ? null : this.sanitizer.bypassSecurityTrustHtml(markup);
  }
}

/** The equation markup a prerendered page already holds in this element, if any. */
function prerenderedMarkup(host: HTMLElement): string | null {
  const markup = host.firstElementChild?.innerHTML;
  return markup === undefined || markup === '' ? null : markup;
}
