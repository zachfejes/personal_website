import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="band band--dark">
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist or has moved.</p>
      <p><a routerLink="/">Back to the home page</a></p>
    </section>
  `,
  styles: `
    section {
      min-height: 60vh;
    }
    a {
      color: var(--color-accent-bright);
    }
  `,
})
export class NotFoundPage {}
