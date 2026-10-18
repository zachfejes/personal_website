import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { PROJECTS_PATH, SITE_NAME, projectRoutes } from './projects/project-list';
import { PROJECTS } from './projects/registry';

export const routes: Routes = [
  {
    path: '',
    title: 'Zach Fejes',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: PROJECTS_PATH,
    title: `Projects · ${SITE_NAME}`,
    loadComponent: () => import('./pages/projects/projects.page').then((m) => m.ProjectsPage),
  },
  // One route per project page, generated from the registry and prerendered like the rest.
  ...projectRoutes(PROJECTS, environment.showDrafts),
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
