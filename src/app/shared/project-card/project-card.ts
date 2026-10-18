import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComingSoonProject, PublishedProject } from '../../projects/project';
import { PROJECTS_PATH, formatDate, formatTimeline } from '../../projects/project-list';

const COMING_SOON = 'Coming soon';

/**
 * A project teaser: cover art, category, title, summary and tags. Published projects link to
 * their page and show when the work happened and when it was posted; coming-soon projects say so
 * and don't link anywhere.
 */
@Component({
  selector: 'app-project-card',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './project-card.html',
  styleUrl: './project-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card' },
})
export class ProjectCard {
  readonly project = input.required<PublishedProject | ComingSoonProject>();
  /** Heading level of the title, to fit the page's outline. */
  readonly headingLevel = input<2 | 3>(3);

  protected readonly link = computed(() => {
    const p = this.project();
    return p.status === 'published' ? `/${PROJECTS_PATH}/${p.slug}` : null;
  });

  protected readonly when = computed(() => {
    const p = this.project();
    return p.status === 'published' ? formatTimeline(p.timeline) : COMING_SOON;
  });

  protected readonly posted = computed(() => {
    const p = this.project();
    return p.status === 'published' ? { iso: p.posted, label: formatDate(p.posted) } : null;
  });
}
