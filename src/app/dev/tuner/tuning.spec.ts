import { Schema, mergeSettings } from './tuning';

const DEFAULTS = {
  layout: { width: 40, band: 'dark' },
  chart: { color: '#e3a857', grid: true },
};

const MIN_WIDTH = 20;
const MAX_WIDTH = 80;

const SCHEMA: Schema<typeof DEFAULTS> = {
  layout: {
    label: 'Layout',
    controls: {
      width: { type: 'range', label: 'Width', min: MIN_WIDTH, max: MAX_WIDTH, step: 1 },
      band: { type: 'select', label: 'Band', options: ['dark', 'light'] },
    },
  },
  chart: {
    label: 'Chart',
    controls: {
      color: { type: 'color', label: 'Color' },
      grid: { type: 'toggle', label: 'Grid' },
    },
  },
};

describe('mergeSettings', () => {
  it('applies valid values over the base', () => {
    const NEW_WIDTH = 55;
    const { settings, ignored } = mergeSettings(DEFAULTS, SCHEMA, {
      layout: { width: NEW_WIDTH, band: 'light' },
      chart: { color: '#112233', grid: false },
    });
    expect(settings).toEqual({
      layout: { width: NEW_WIDTH, band: 'light' },
      chart: { color: '#112233', grid: false },
    });
    expect(ignored).toEqual([]);
  });

  it('keeps base values for anything left out', () => {
    const { settings } = mergeSettings(DEFAULTS, SCHEMA, { chart: { grid: false } });
    expect(settings).toEqual({ ...DEFAULTS, chart: { ...DEFAULTS.chart, grid: false } });
  });

  it('clamps numbers to the control range', () => {
    const TOO_WIDE = 500;
    const { settings } = mergeSettings(DEFAULTS, SCHEMA, { layout: { width: TOO_WIDE } });
    expect(settings.layout.width).toBe(MAX_WIDTH);
  });

  it('ignores and reports unknown keys and invalid values', () => {
    const { settings, ignored } = mergeSettings(DEFAULTS, SCHEMA, {
      layout: { band: 'purple', height: 3 },
      chart: { color: 'orange', grid: 'yes' },
      typography: { size: 2 },
    });
    expect(settings).toEqual(DEFAULTS);
    expect(ignored).toEqual([
      'layout.band',
      'layout.height',
      'chart.color',
      'chart.grid',
      'typography',
    ]);
  });

  it('rejects input that is not an object', () => {
    const { settings, ignored } = mergeSettings(DEFAULTS, SCHEMA, 'not settings');
    expect(settings).toEqual(DEFAULTS);
    expect(ignored.length).toBeGreaterThan(0);
  });

  it('never changes the base it was given', () => {
    const base = structuredClone(DEFAULTS);
    mergeSettings(base, SCHEMA, { layout: { band: 'light' } });
    expect(base).toEqual(DEFAULTS);
  });
});
