import { signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TunerPanel } from './tuner-panel';
import { Schema, Settings } from './tuning';

const DEFAULTS = { layout: { width: 40, band: 'dark', grid: true } };
const SCHEMA: Schema<typeof DEFAULTS> = {
  layout: {
    label: 'Layout',
    controls: {
      width: { type: 'range', label: 'Width', min: 20, max: 80, step: 1 },
      band: { type: 'select', label: 'Band', options: ['dark', 'light'] },
      grid: { type: 'toggle', label: 'Grid' },
    },
  },
};
const STORAGE_KEY = 'tuner:test';

async function renderPanel() {
  const settings = signal<Settings>(structuredClone(DEFAULTS));
  await render(
    `<app-tuner-panel title="Test" [storageKey]="key" [schema]="schema" [defaults]="defaults" [(settings)]="settings" />`,
    {
      imports: [TunerPanel],
      componentProperties: { key: STORAGE_KEY, schema: SCHEMA, defaults: DEFAULTS, settings },
    },
  );
  return settings;
}

describe('TunerPanel', () => {
  beforeEach(() => localStorage.clear());

  it('starts closed and opens from its toggle', async () => {
    const user = userEvent.setup();
    await renderPanel();
    expect(screen.queryByRole('region', { name: 'Test tuner' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Tune' }));
    expect(screen.getByRole('region', { name: 'Test tuner' })).toBeTruthy();
  });

  it('applies control changes to the settings', async () => {
    const user = userEvent.setup();
    const settings = await renderPanel();
    await user.click(screen.getByRole('button', { name: 'Tune' }));
    const NEW_WIDTH = 55;
    fireEvent.input(screen.getByRole('slider', { name: /width/i }), {
      target: { valueAsNumber: NEW_WIDTH },
    });
    await user.selectOptions(screen.getByRole('combobox', { name: /band/i }), 'light');
    await user.click(screen.getByRole('checkbox', { name: /grid/i }));
    expect(settings()).toEqual({ layout: { width: NEW_WIDTH, band: 'light', grid: false } });
  });

  it('applies pasted settings and reports what it ignored', async () => {
    const user = userEvent.setup();
    const settings = await renderPanel();
    await user.click(screen.getByRole('button', { name: 'Tune' }));
    await user.click(screen.getByRole('button', { name: 'Paste settings' }));
    const box = screen.getByRole('textbox', { name: /settings json/i });
    await user.clear(box);
    await user.click(box);
    await user.paste(JSON.stringify({ layout: { band: 'light', depth: 3 } }));
    await user.click(screen.getByRole('button', { name: 'Apply pasted settings' }));
    expect(settings()['layout']['band']).toBe('light');
    expect(screen.getByRole('status').textContent).toContain('layout.depth');
  });

  it('resets to the defaults', async () => {
    const user = userEvent.setup();
    const settings = await renderPanel();
    await user.click(screen.getByRole('button', { name: 'Tune' }));
    await user.click(screen.getByRole('checkbox', { name: /grid/i }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(settings()).toEqual(DEFAULTS);
  });

  it('remembers settings between visits', async () => {
    const user = userEvent.setup();
    await renderPanel();
    await user.click(screen.getByRole('button', { name: 'Tune' }));
    await user.click(screen.getByRole('checkbox', { name: /grid/i }));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as typeof DEFAULTS;
    expect(saved.layout.grid).toBe(false);
  });
});
