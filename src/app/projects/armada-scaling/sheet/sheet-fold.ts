import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { NARROW_QUERY } from './layout';

let nextId = 0;

/**
 * A field note's body that folds away on phones: there it starts collapsed to a one-line summary
 * and a button, and opens and closes smoothly. On wider screens the body is always shown and the
 * summary and button are hidden. Folded content stays in the page (for search and the prerendered
 * HTML) but is inert, so keyboards and screen readers skip it until it's opened.
 */
@Component({
  selector: 'app-sheet-fold',
  template: `
    <p class="summary">{{ summary() }}</p>
    <button
      type="button"
      class="toggle"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="bodyId"
      (click)="open.set(!open())"
    >
      {{ open() ? '− Close the field note' : '+ Read the field note' }}
    </button>
    <div class="body" [id]="bodyId" [class.open]="open()" [attr.inert]="folded() ? '' : null">
      <div class="inner"><ng-content /></div>
    </div>
  `,
  styleUrl: './sheet-fold.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFold {
  /** What the note says, in a sentence, while it's folded. */
  readonly summary = input.required<string>();

  protected readonly bodyId = `sheet-fold-${nextId++}`;
  protected readonly open = signal(false);
  /** Whether the phone layout applies (it's the only one that folds). */
  private readonly narrow = signal(false);
  protected readonly folded = computed(() => this.narrow() && !this.open());

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const query = matchMedia(NARROW_QUERY);
      const update = () => this.narrow.set(query.matches);
      update();
      query.addEventListener('change', update);
      destroyRef.onDestroy(() => query.removeEventListener('change', update));
    });
  }
}
