import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import katex from 'katex';

/** KaTeX's stylesheet, built as its own file (angular.json) so only pages with math load it. */
const KATEX_STYLESHEET = { id: 'katex-css', href: 'katex.css' } as const;

/**
 * An equation, typeset with KaTeX. Rendered during prerendering, so readers get finished HTML and
 * MathML (for screen readers) without waiting for scripts. Only ever given TeX written in this
 * codebase, which is why its HTML can be trusted.
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

  protected readonly html = computed((): SafeHtml => {
    const markup = katex.renderToString(this.tex(), {
      displayMode: this.display(),
      throwOnError: false,
      output: 'htmlAndMathml',
    });
    return this.sanitizer.bypassSecurityTrustHtml(markup);
  });

  constructor() {
    const document = inject(DOCUMENT);
    if (!document.getElementById(KATEX_STYLESHEET.id)) {
      const link = document.createElement('link');
      link.id = KATEX_STYLESHEET.id;
      link.rel = 'stylesheet';
      link.href = KATEX_STYLESHEET.href;
      document.head.appendChild(link);
    }
  }
}
