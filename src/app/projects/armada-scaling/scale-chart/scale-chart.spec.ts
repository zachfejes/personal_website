import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { DESIGN } from '../design';
import { AxisLabel, Band, FitLine, NamedPoint, ScaleChart } from './scale-chart';

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

/**
 * The read-out line as a reader sees it ("150 m → 57.6 mm"), though the value is styled
 * separately from the rest of the line.
 */
const readOut = (line: string) => (_: string, el: Element | null) =>
  el?.tagName.toLowerCase() === 'text' && el.textContent.replace(/\s+/g, ' ').trim() === line;
/** The page's chart design, starting on log axes. */
const CHART_DESIGN = { ...DESIGN.chart, defaultScale: 'log' as const };

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

const renderChart = (
  inputs: Partial<{
    fits: FitLine[];
    planned: NamedPoint[];
    axes: { x: AxisLabel; y: AxisLabel };
    annotate: string[];
    design: typeof CHART_DESIGN;
    optional: { name: string; label: string };
    band: Band;
  }> = {},
) =>
  render(ScaleChart, {
    inputs: { caption: CAPTION, ships: SHIPS, design: CHART_DESIGN, ...inputs },
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
    expect(screen.queryByRole('group', { name: 'Fits to show' })).toBeNull();
  });

  it('starts on the scale the design sets, and says so on the axes', async () => {
    await renderChart();
    const scale = within(screen.getByRole('group', { name: 'Axis scale' }));
    expect(scale.getByRole('button', { name: 'Log' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/Canon length \(m, log scale\)/)).toBeTruthy();
  });

  it('switches between log and linear axes', async () => {
    const user = userEvent.setup();
    await renderChart();
    const scale = within(screen.getByRole('group', { name: 'Axis scale' }));
    await user.click(scale.getByRole('button', { name: 'Linear' }));
    expect(scale.getByRole('button', { name: 'Linear' }).getAttribute('aria-pressed')).toBe('true');
    expect(scale.getByRole('button', { name: 'Log' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByText(/log scale/)).toBeNull();
  });

  it('reads out points from the keyboard', async () => {
    const user = userEvent.setup();
    await renderChart();
    screen.getByRole('img').focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText(readOut('150 m → 57.6 mm'))).toBeTruthy();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText(readOut('900 m → 137.4 mm'))).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByText(readOut('900 m → 137.4 mm'))).toBeNull();
  });

  it('labels the axes, table and read-out from the axes it is given', async () => {
    const user = userEvent.setup();
    const RATIO_DECIMALS = 2;
    await renderChart({
      axes: {
        x: { title: 'Canon length', unit: 'm' },
        y: { title: 'Measured ÷ predicted', decimals: RATIO_DECIMALS },
      },
    });
    expect(screen.getByText('Measured ÷ predicted (log scale)')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Measured ÷ predicted' })).toBeTruthy();
    screen.getByRole('img').focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText(readOut('150 m → 57.6'))).toBeTruthy();
  });

  // jsdom can't measure, so the chart keeps its default width (720 px) in these tests.
  it('labels the named ships when the chart is wide enough', async () => {
    await renderChart({ annotate: ['Victory'] });
    expect(screen.getByText('Victory · 900 m → 137.4 mm')).toBeTruthy();
  });

  it('leaves the labels off a chart narrower than the setting', async () => {
    const WIDER_THAN_DEFAULT_PX = 2000;
    await renderChart({
      annotate: ['Victory'],
      design: { ...CHART_DESIGN, annotateMinWidthPx: WIDER_THAN_DEFAULT_PX },
    });
    expect(screen.queryByText('Victory · 900 m → 137.4 mm')).toBeNull();
  });

  describe('with an optional ship', () => {
    const OPTIONAL = { name: 'Victory', label: 'Victory' };
    const VICTORY_READOUT = readOut('900 m → 137.4 mm');

    it('hides it to start, and shows it from its toggle', async () => {
      const user = userEvent.setup();
      await renderChart({ optional: OPTIONAL });
      const toggle = screen.getByRole('button', { name: OPTIONAL.label });
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
      // Reading every point from the keyboard reaches the CR90 and stops: the Victory is hidden.
      screen.getByRole('img').focus();
      await user.keyboard('{ArrowRight}{ArrowRight}');
      expect(screen.queryByText(VICTORY_READOUT)).toBeNull();
      await user.click(toggle);
      expect(toggle.getAttribute('aria-pressed')).toBe('true');
      screen.getByRole('img').focus();
      await user.keyboard('{ArrowRight}{ArrowRight}');
      expect(screen.getByText(VICTORY_READOUT)).toBeTruthy();
    });

    it('still lists it in the data table', async () => {
      await renderChart({ optional: OPTIONAL });
      const rows = within(screen.getByRole('table')).getAllByRole('rowheader');
      expect(rows.map((r) => r.textContent.trim())).toEqual(['CR90', 'Victory']);
    });
  });

  it('reads out a point with its spread', async () => {
    const user = userEvent.setup();
    const SPREAD_MM = 10;
    await renderChart({ planned: [{ ...PLANNED[0], spread: SPREAD_MM }] });
    screen.getByRole('img').focus();
    // In reading order: CR90 (150 m), XQ2 Platform (884 m).
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByText(readOut('884 m → 146 ± 10 mm'))).toBeTruthy();
  });

  it('names its band in the legend', async () => {
    const BAND: Band = {
      label: 'Typical miss',
      lower: (x) => x / 2,
      upper: (x) => x * 2,
      maxX: 1000,
    };
    await renderChart({ band: BAND });
    expect(screen.getByText(BAND.label)).toBeTruthy();
  });
});
