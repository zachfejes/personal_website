import { render } from '@testing-library/angular';
import { Tex } from './tex';

const TEX = 'y = a x^{b}';

describe('Tex', () => {
  it('typesets the equation, with MathML for screen readers', async () => {
    const { container } = await render(Tex, { inputs: { tex: TEX } });
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container.querySelector('math annotation')?.textContent).toBe(TEX);
  });

  it('loads the KaTeX stylesheet once, however many equations there are', async () => {
    await render('<app-tex tex="a" /><app-tex tex="b" />', { imports: [Tex] });
    expect(document.querySelectorAll('link#katex-css').length).toBe(1);
  });
});
