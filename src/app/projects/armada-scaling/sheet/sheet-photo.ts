import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

/**
 * A photo on the drawing sheet: framed, with a caption. Until the photo exists it shows a hatched
 * placeholder saying what will go there. Once it does, clicking it opens it larger, whole and
 * uncropped, in a modal viewer: Esc, the close button or a click outside the photo closes it.
 */
@Component({
  selector: 'app-sheet-photo',
  template: `
    <figure>
      @if (src(); as src) {
        <button
          type="button"
          class="zoom"
          [attr.aria-label]="'View larger: ' + caption()"
          (click)="show()"
        >
          <img [src]="src" [alt]="alt()" loading="lazy" />
        </button>
        <dialog
          #viewer
          class="viewer"
          tabindex="-1"
          [attr.aria-label]="caption()"
          (click)="closeOutside($event)"
          (keydown.escape)="hide()"
          (close)="closed()"
        >
          @if (open()) {
            <figure class="viewer__figure">
              <img class="viewer__image" [src]="src" [alt]="alt()" />
              <figcaption>{{ caption() }}</figcaption>
            </figure>
          }
          <button type="button" class="viewer__close" aria-label="Close" (click)="hide()">×</button>
        </dialog>
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

  protected readonly open = signal(false);
  private readonly viewer = viewChild<ElementRef<HTMLDialogElement>>('viewer');
  private readonly root = inject(DOCUMENT).documentElement;

  protected show(): void {
    this.open.set(true);
    this.viewer()?.nativeElement.showModal();
    // The page behind stays put while the photo is open.
    this.root.style.overflow = 'hidden';
  }

  protected hide(): void {
    this.viewer()?.nativeElement.close();
  }

  /** A click on the dialog itself, not the photo or its caption, is a click outside the photo. */
  protected closeOutside(event: MouseEvent): void {
    if (event.target === this.viewer()?.nativeElement) this.hide();
  }

  /** However it was closed (Esc, the button, outside): tidy up. */
  protected closed(): void {
    this.open.set(false);
    this.root.style.overflow = '';
  }
}
