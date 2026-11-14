import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/** A header link: a page, or a section of one (`fragment`). */
export interface NavLink {
  label: string;
  path: string;
  fragment?: string;
}

@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  host: { class: 'band band--dark' },
})
export class SiteHeader {
  protected readonly links: NavLink[] = [
    { label: 'Projects', path: '/projects' },
    { label: 'About', path: '/', fragment: 'about' },
    { label: 'Contact', path: '/', fragment: 'contact' },
  ];
  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
