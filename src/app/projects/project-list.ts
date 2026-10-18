import { Route } from '@angular/router';
import { ComingSoonProject, IsoDate, Project, PublishedProject, Timeline } from './project';

export const SITE_NAME = 'Zach Fejes';
export const PROJECTS_PATH = 'projects';

const isPublished = (p: Project): p is PublishedProject => p.status === 'published';
const isComingSoon = (p: Project): p is ComingSoonProject => p.status === 'coming-soon';

/** Published projects, newest post first. */
export function publishedProjects(projects: readonly Project[]): PublishedProject[] {
  return projects.filter(isPublished).sort((a, b) => b.posted.localeCompare(a.posted));
}

/**
 * The home page's project slots: published projects first (newest first), then coming-soon
 * projects in registry order to fill the remaining slots. Everything else stays hidden.
 */
export function homeProjects(
  projects: readonly Project[],
  slots: number,
): (PublishedProject | ComingSoonProject)[] {
  return [...publishedProjects(projects), ...projects.filter(isComingSoon)].slice(0, slots);
}

/** Routes for every project with a page: published ones, plus drafts when asked for. */
export function projectRoutes(projects: readonly Project[], showDrafts: boolean): Route[] {
  return projects.flatMap((p) =>
    p.status === 'published' || (p.status === 'draft' && showDrafts)
      ? [
          {
            path: `${PROJECTS_PATH}/${p.slug}`,
            title: `${p.title} · ${SITE_NAME}`,
            loadComponent: p.page,
          },
        ]
      : [],
  );
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** "Mar 2019", from `YYYY-MM`. */
export function formatMonth(month: Timeline['start']): string {
  const [year, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${year}`;
}

/** "Mar 2019 – Jun 2021", "Mar 2019" for a single month, or "Mar 2019 – present". */
export function formatTimeline({ start, end }: Timeline): string {
  if (!end) return `${formatMonth(start)} – present`;
  if (end === start) return formatMonth(start);
  return `${formatMonth(start)} – ${formatMonth(end)}`;
}

/** "18 Oct 2026", from `YYYY-MM-DD`. */
export function formatDate(date: IsoDate): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
