import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Turns a section of the drawing sheet into paper: a light panel with large curved corners, with
 * the page's colors swapped for ink so everything inside follows, the thread included. With
 * `narrowOnly`, the section is paper on phones and part of the dark sheet elsewhere.
 */
@Component({
  selector: 'app-sheet-paper',
  template: '<section [attr.aria-labelledby]="labelledBy()"><ng-content /></section>',
  styleUrl: './sheet-paper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.narrow-only]': 'narrowOnly()' },
})
export class SheetPaper {
  readonly narrowOnly = input(false);
  /** Id of the section's heading. */
  readonly labelledBy = input.required<string>();
}
