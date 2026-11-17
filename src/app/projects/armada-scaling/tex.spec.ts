import { render, waitFor } from '@testing-library/angular';
import { Tex } from './tex';
import { TEX_RENDERER } from './tex-render';

const TEX = 'y = a x^{b}';

describe('Tex', () => {
  it('typesets the equation, with MathML for screen readers', async () => {
    const { container } = await render(Tex, { inputs: { tex: TEX } });
    // In the browser KaTeX loads on demand, so the equation arrives a moment later.
    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull());
    expect(container.querySelector('math annotation')?.textContent).toBe(TEX);
  });

  it('typesets with whatever renderer it is given, e.g. the server one', async () => {
    const MARKUP = '<b class="typeset">y</b>';
    const typeset = vi.fn(() => MARKUP);
    const { container } = await render(Tex, {
      inputs: { tex: TEX, display: true },
      providers: [{ provide: TEX_RENDERER, useValue: typeset }],
    });
    expect(typeset).toHaveBeenCalledWith(TEX, true);
    expect(container.querySelector('.typeset')).not.toBeNull();
  });

  it('loads the KaTeX stylesheet once, however many equations there are', async () => {
    await render('<app-tex tex="a" /><app-tex tex="b" />', { imports: [Tex] });
    expect(document.querySelectorAll('link#katex-css').length).toBe(1);
  });
});
