import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Zach Fejes',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    // Prerendered to /404/index.html, then copied to /404.html by scripts/postbuild.mjs.
    path: '404',
    title: 'Page not found · Zach Fejes',
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
  {
    path: '**',
    title: 'Page not found · Zach Fejes',
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
