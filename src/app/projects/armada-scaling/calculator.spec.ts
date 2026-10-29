import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ScaleCalculator } from './calculator';

/** A stand-in fit that's easy to check by hand. */
const HALVE = (canonM: number) => canonM / 2;
const START_M = 884;

const renderCalculator = () =>
  render(ScaleCalculator, { inputs: { canonM: START_M, predict: HALVE } });

describe('ScaleCalculator', () => {
  it('shows the model length for the starting canon length', async () => {
    await renderCalculator();
    expect(screen.getByRole('status').textContent).toContain(`${HALVE(START_M)} mm`);
  });

  it('updates the model length as a length is typed', async () => {
    const user = userEvent.setup();
    const TYPED_M = 1600;
    await renderCalculator();
    const input = screen.getByRole('spinbutton', { name: /canon length/i });
    await user.clear(input);
    await user.type(input, String(TYPED_M));
    expect(screen.getByRole('status').textContent).toContain(`${HALVE(TYPED_M)} mm`);
  });

  it('asks for a valid length when the field is empty', async () => {
    const user = userEvent.setup();
    await renderCalculator();
    await user.clear(screen.getByRole('spinbutton', { name: /canon length/i }));
    expect(screen.getByRole('status').textContent).toMatch(/enter a length/i);
  });

  it('gives the typical miss where there is one, and none elsewhere', async () => {
    const user = userEvent.setup();
    // A tenth of the model length, but only up to 1,000 m.
    const RANGE_MAX_M = 1000;
    const TENTH = (canonM: number) => (canonM <= RANGE_MAX_M ? HALVE(canonM) / 10 : undefined);
    const OUTSIDE_M = 2000;
    await render(ScaleCalculator, { inputs: { canonM: START_M, predict: HALVE, spread: TENTH } });
    // 884 m: 442 mm, ± 44.2 mm, shown to the nearest mm.
    expect(screen.getByRole('status').textContent).toContain('± 44 mm');
    const input = screen.getByRole('spinbutton', { name: /canon length/i });
    await user.clear(input);
    await user.type(input, String(OUTSIDE_M));
    expect(screen.getByRole('status').textContent).not.toContain('±');
  });
});
