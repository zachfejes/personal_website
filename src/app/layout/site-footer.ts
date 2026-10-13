import { Component } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-site-footer',
  template: `
    <div class="container footer">
      <p>© {{ year }} Zach Fejes</p>
      @if (environmentName !== 'production') {
        <p class="env">{{ environmentName }} build</p>
      }
    </div>
  `,
  styles: `
    .footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.5rem 1rem;
      padding-block: 1.5rem;
      font-size: 0.85rem;
      color: var(--color-muted);
    }
    p {
      margin: 0;
    }
    .env {
      font-family: var(--font-label);
      letter-spacing: var(--label-tracking);
      text-transform: uppercase;
      color: var(--color-highlight);
    }
  `,
  host: { class: 'band band--dark' },
})
export class SiteFooter {
  protected readonly year = new Date().getFullYear();
  protected readonly environmentName = environment.name;
}
