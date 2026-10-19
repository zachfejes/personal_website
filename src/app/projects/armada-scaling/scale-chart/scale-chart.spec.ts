import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { DESIGN } from '../design';
import { FitLine, NamedPoint, ScaleChart } from './scale-chart';

const SHIPS: NamedPoint[] = [
  { name: 'CR90', x: 150, y: 57.6 },
  { name: 'Victory', x: 900, y: 137.4 },
];
const PLANNED: NamedPoint[] = [{ name: 'XQ2 Platform', x: 884, y: 146 }];
const FITS: FitLine[] = [
  { id: 'power', label: 'Power fit', color: '#e3a857', predict: (x) => x },
  { id: 'log', label: 'Logarithmic fit', color: '#8fb3a2', predict: (x) => Math.log(x) },
];
const CAPTION = 'Test chart';

// jsdom doesn't lay anything out, so there's nothing to observe; the chart keeps its default width.
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
});
afterAll(() => vi.unstubAllGlobals());

const renderChart = (inputs: Partial<{ fits: FitLine[]; planned: NamedPoint[] }> = {}) =>
  render(ScaleChart, {
    inputs: { caption: CAPTION, ships: SHIPS, design: DESIGN.chart, ...inputs },
  });

describe('ScaleChart', () => {
  it('names the chart with its caption', async () => {
    await renderChart();
    expect(screen.getByRole('img', { name: new RegExp(CAPTION) })).toBeTruthy();
  });

  it('lists every point in its data table, marking predicted ones', async () => {
    await renderChart({ planned: PLANNED });
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent.trim())).toEqual([
      'CR90',
      'Victory',
      'XQ2 Platform (predicted)',
    ]);
  });

  it('shows a toggle per fit, all on to start', async () => {
    await renderChart({ fits: FITS });
    for (const fit of FITS) {
      const toggle = screen.getByRole('button', { name: fit.label });
      expect(toggle.getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('switches a fit off and on again', async () => {
    const user = userEvent.setup();
    await renderChart({ fits: FITS });
    const toggle = screen.getByRole('button', { name: 'Logarithmic fit' });
    await user.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('has no fit toggles when there are no fits', async () => {
    await renderChart();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('reads out points from the keyboard', async () => {
    const user = userEvent.setup();
    await renderChart();
    screen.getByRole('img').focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('150 m → 57.6 mm')).toBeTruthy();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('900 m → 137.4 mm')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('900 m → 137.4 mm')).toBeNull();
  });
});
