import { HOME_PROJECT_SLOTS, PROJECTS } from './registry';
import { homeProjects } from './project-list';

/** `YYYY-MM` with a month from 01 to 12. */
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
/** Lowercase words joined by single hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('project registry', () => {
  it('gives every project a unique slug', () => {
    const slugs = PROJECTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('uses URL-friendly slugs', () => {
    for (const { slug } of PROJECTS) expect(slug).toMatch(SLUG_PATTERN);
  });

  it('dates published projects with real calendar dates', () => {
    for (const p of PROJECTS) {
      if (p.status !== 'published') continue;
      expect(new Date(p.posted).toISOString().slice(0, p.posted.length)).toBe(p.posted);
    }
  });

  it('gives timelines real months, ending no earlier than they start', () => {
    for (const { timeline } of PROJECTS) {
      if (!timeline) continue;
      const { start, end = start } = timeline;
      for (const month of [start, end]) expect(month).toMatch(MONTH_PATTERN);
      expect(end >= start).toBe(true);
    }
  });

  it('has enough projects to fill the home page', () => {
    expect(homeProjects(PROJECTS, HOME_PROJECT_SLOTS).length).toBe(HOME_PROJECT_SLOTS);
  });
});
