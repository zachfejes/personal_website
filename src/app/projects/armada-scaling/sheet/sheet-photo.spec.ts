import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SheetPhoto } from './sheet-photo';

const SRC = 'projects/armada-scaling/xq2-blender.webp';
const ALT = 'A grey render of the XQ2 Platform model';
const CAPTION = 'The XQ2 Platform in Blender';

// jsdom has no modal dialogs: stand in for showModal and close (which fires "close", as browsers do).
beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    },
  });
});

const renderPhoto = (src: string | null) =>
  render(SheetPhoto, { inputs: { src, alt: ALT, caption: CAPTION } });

const viewer = () => document.querySelector('dialog');

describe('SheetPhoto', () => {
  it('shows a placeholder, and nothing to open, until there is a photo', async () => {
    await renderPhoto(null);
    expect(screen.getByText('Photo to come')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens the photo larger when clicked, and stops the page scrolling behind it', async () => {
    const user = userEvent.setup();
    await renderPhoto(SRC);
    await user.click(screen.getByRole('button', { name: `View larger: ${CAPTION}` }));
    expect(viewer()?.hasAttribute('open')).toBe(true);
    expect(viewer()?.querySelector('img')?.getAttribute('src')).toBe(SRC);
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  it('closes from its close button, and lets the page scroll again', async () => {
    const user = userEvent.setup();
    await renderPhoto(SRC);
    await user.click(screen.getByRole('button', { name: `View larger: ${CAPTION}` }));
    await user.click(screen.getByRole('button', { name: 'Close', hidden: true }));
    expect(viewer()?.hasAttribute('open')).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('closes on a click outside the photo, but not on the photo itself', async () => {
    const user = userEvent.setup();
    await renderPhoto(SRC);
    await user.click(screen.getByRole('button', { name: `View larger: ${CAPTION}` }));
    const dialog = viewer();
    const image = dialog?.querySelector('img');
    if (!dialog || !image) throw new Error('No viewer');
    await user.click(image);
    expect(dialog.hasAttribute('open')).toBe(true);
    await user.click(dialog);
    expect(dialog.hasAttribute('open')).toBe(false);
  });
});
