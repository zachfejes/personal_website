import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A drawing frame for orthographic views: a hairline border with a dimension line across the top
 * (end ticks, the measurement in the middle). The views and their labels are the content.
 */
@Component({
  selector: 'app-sheet-frame',
  template: `
    <figure>
      <p class="dimension">
        <span>{{ dimension() }}</span>
      </p>
      <ng-content />
    </figure>
  `,
  styleUrl: './sheet-frame.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFrame {
  /** What the dimension line measures, e.g. "884 m". */
  readonly dimension = input.required<string>();
}
