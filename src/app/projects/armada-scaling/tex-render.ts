import { InjectionToken } from '@angular/core';
import type { KatexOptions } from 'katex';

/** Typesets TeX to HTML (with MathML for screen readers): at once, or once KaTeX has loaded. */
export type TexRenderer = (tex: string, display: boolean) => string | Promise<string>;

/** What `katex.renderToString` needs here: the library's one call, so callers can pass `katex`. */
interface Katex {
  renderToString(tex: string, options: KatexOptions): string;
}

/** The same output wherever an equation is typeset: HTML to see, MathML to read aloud. */
export function typeset(katex: Katex, tex: string, display: boolean): string {
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    output: 'htmlAndMathml',
  });
}

/**
 * How `Tex` typesets an equation. In the browser KaTeX is fetched only when an equation actually
 * needs typesetting there: prerendered pages already carry every equation, so normally it never
 * loads. The server build provides a renderer that typesets at once (app.config.server.ts).
 */
export const TEX_RENDERER = new InjectionToken<TexRenderer>('TEX_RENDERER', {
  providedIn: 'root',
  factory: () => async (tex, display) => typeset((await import('katex')).default, tex, display),
});
