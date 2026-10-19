import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

const RESULT_DECIMALS = 0;
const INPUT_LIMITS = { min: 1, max: 20000, step: 1 } as const;

/**
 * "How big should my model be?": enter a ship's canon length, get the Armada model length the
 * power fit predicts.
 */
@Component({
  selector: 'app-scale-calculator',
  template: `
    <form class="calc" (submit)="$event.preventDefault()">
      <label class="calc__field">
        <span class="calc__label">Canon length</span>
        <span class="calc__input">
          <input
            type="number"
            inputmode="decimal"
            [min]="limits.min"
            [max]="limits.max"
            [step]="limits.step"
            [value]="canonM()"
            (input)="update($event)"
          />
          <span aria-hidden="true">m</span>
        </span>
      </label>
      <p class="calc__result" role="status">
        @if (modelMm() !== null) {
          <span class="calc__label">Model length</span>
          <span class="calc__value">{{ modelMm() }}<span> mm</span></span>
        } @else {
          <span class="calc__label"
            >Enter a length between {{ limits.min }} and {{ limits.max }} m</span
          >
        }
      </p>
    </form>
  `,
  styleUrl: './calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScaleCalculator {
  /** Canon length in m, shared with the page so the chart can mark it. */
  readonly canonM = model.required<number | null>();
  readonly predict = input.required<(canonM: number) => number>();

  protected readonly limits = INPUT_LIMITS;

  protected readonly modelMm = computed(() => {
    const canonM = this.canonM();
    return canonM === null ? null : this.predict()(canonM).toFixed(RESULT_DECIMALS);
  });

  protected update(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    const valid = Number.isFinite(value) && value >= INPUT_LIMITS.min && value <= INPUT_LIMITS.max;
    this.canonM.set(valid ? value : null);
  }
}
