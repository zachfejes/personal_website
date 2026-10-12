import { Component, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: `
    <main>
      <router-outlet />
    </main>
    <footer class="footer">
      <p>© {{ year }} Zach Fejes</p>
      @if (environmentName !== 'production') {
        <p class="footer__env">{{ environmentName }} build</p>
      }
    </footer>
  `,
})
export class App {
  protected readonly year = new Date().getFullYear();
  protected readonly environmentName = environment.name;

  constructor() {
    if (!environment.indexable) {
      inject(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
    }
  }
}
