import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SheetFold } from './sheet-fold';

const SUMMARY = 'The short version.';
const CONTENT = 'The whole field note.';

/** jsdom has no matchMedia: stand in for a phone (matches) or a wider screen (doesn't). */
const stubScreen = (narrow: boolean) =>
  vi.stubGlobal('matchMedia', () => ({
    matches: narrow,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

const renderFold = () =>
  render(`<app-sheet-fold summary="${SUMMARY}"><p>${CONTENT}</p></app-sheet-fold>`, {
    imports: [SheetFold],
  });

const body = () => screen.getByText(CONTENT).closest('.body');

/**
 * The button is shown by a phone-width media query, which jsdom doesn't apply, so it has no
 * accessible role or name here: find it by its text.
 */
const button = (text: RegExp) => {
  const el = screen.getByText(text).closest('button');
  if (!el) throw new Error(`No button reading ${String(text)}`);
  return el;
};

afterEach(() => vi.unstubAllGlobals());

describe('SheetFold', () => {
  it('starts folded on a phone, its content out of reach until opened', async () => {
    stubScreen(true);
    await renderFold();
    const toggle = button(/read the field note/i);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(body()?.hasAttribute('inert')).toBe(true);
  });

  it('opens and closes from its button', async () => {
    stubScreen(true);
    const user = userEvent.setup();
    await renderFold();
    await user.click(button(/read the field note/i));
    const close = button(/close the field note/i);
    expect(close.getAttribute('aria-expanded')).toBe('true');
    expect(body()?.hasAttribute('inert')).toBe(false);
    await user.click(close);
    expect(body()?.hasAttribute('inert')).toBe(true);
  });

  it('never folds on wider screens', async () => {
    stubScreen(false);
    await renderFold();
    expect(body()?.hasAttribute('inert')).toBe(false);
  });
});
