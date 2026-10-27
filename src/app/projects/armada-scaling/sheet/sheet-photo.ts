import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A photo on the drawing sheet: framed, with a caption. Until the photo exists it shows a hatched
 * placeholder saying what will go there.
 */
@Component({
  selector: 'app-sheet-photo',
  template: `
    <figure>
      @if (src(); as src) {
        <img [src]="src" [alt]="alt()" loading="lazy" />
      } @else {
        <div class="placeholder">
          <span>Photo to come</span>
          <small>{{ alt() }}</small>
        </div>
      }
      <figcaption>{{ caption() }}</figcaption>
    </figure>
  `,
  styleUrl: './sheet-photo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPhoto {
  /** The image, once there is one. */
  readonly src = input<string | null>(null);
  /** What the photo shows: its alt text, and the placeholder's description until then. */
  readonly alt = input.required<string>();
  readonly caption = input.required<string>();
}
