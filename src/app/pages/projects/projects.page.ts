import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { publishedProjects } from '../../projects/project-list';
import { PROJECTS } from '../../projects/registry';
import { ProjectCard } from '../../shared/project-card/project-card';
import { RevealDirective } from '../../shared/reveal.directive';

/** Every published project, newest first. Coming-soon projects only appear on the home page. */
@Component({
  selector: 'app-projects-page',
  imports: [ProjectCard, RevealDirective, RouterLink],
  template: `
    <section class="band band--light section projects" aria-labelledby="projects-title">
      <div class="container stack">
        <header class="section-head">
          <p class="eyebrow">All work</p>
          <h1 id="projects-title" class="section-title">Projects &amp; write-ups</h1>
          <p class="section-lede">
            Things I’ve built, studied and explored, written up with the data and the lessons
            learned.
          </p>
        </header>
        @if (projects.length) {
          <div class="cards">
            @for (project of projects; track project.slug) {
              <app-project-card [project]="project" [headingLevel]="2" appReveal />
            }
          </div>
        } @else {
          <div class="empty">
            <p>The first write-ups are on their way.</p>
            <a class="btn btn--ink" routerLink="/" fragment="work">See what’s coming</a>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .projects {
      flex: 1;
    }
    .empty {
      display: grid;
      gap: 1rem;
      justify-items: start;
    }
    .empty p {
      margin: 0;
      font-size: 1.1rem;
    }
  `,
})
export class ProjectsPage {
  protected readonly projects = publishedProjects(PROJECTS);
}
