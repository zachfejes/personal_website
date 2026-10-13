import { Component, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { SiteFooter } from './layout/site-footer';
import { SiteHeader } from './layout/site-header';

@Component({
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <app-site-header />
    <main id="main">
      <router-outlet />
    </main>
    <app-site-footer />
  `,
})
export class App {
  constructor() {
    if (!environment.indexable) {
      inject(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
    }
  }
}
