import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A section's head on the drawing sheet: an orbit marker sitting on the thread in the left margin,
 * then the section's number (or kind, e.g. "Field note") and its short title.
 */
@Component({
  selector: 'app-sheet-head',
  template: `
    <span class="marker" aria-hidden="true"></span>
    <span class="number">{{ number() }}</span>
    <span class="title">{{ title() }}</span>
  `,
  styleUrl: './sheet-head.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetHead {
  readonly number = input.required<string>();
  readonly title = input.required<string>();
}
