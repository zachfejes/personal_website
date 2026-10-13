import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="band band--dark section not-found">
      <div class="container">
        <p class="eyebrow">Off the map</p>
        <h1 class="section-title">Page not found</h1>
        <p class="section-lede">The page you're looking for doesn't exist or has moved.</p>
        <a class="btn btn--primary" routerLink="/">Back to the home page</a>
      </div>
    </section>
  `,
  styles: `
    .not-found {
      flex: 1;
      display: grid;
      align-content: center;
    }
    .container {
      display: grid;
      gap: 1rem;
      justify-items: start;
    }
  `,
})
export class NotFoundPage {}
