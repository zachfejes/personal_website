import { Type } from '@angular/core';
import { ComingSoonProject, DraftProject, PublishedProject } from './project';
import {
  formatDate,
  formatMonth,
  formatTimeline,
  homeProjects,
  projectRoutes,
  publishedProjects,
} from './project-list';

class StubPage {}
const loadStub = () => Promise.resolve(StubPage as Type<unknown>);

const base = { category: 'Test', summary: 'A test project.', tags: [], art: 'chart' } as const;

const OLDER: PublishedProject = {
  ...base,
  slug: 'older',
  title: 'Older',
  status: 'published',
  timeline: { start: '2019-03', end: '2019-06' },
  posted: '2026-01-10',
  page: loadStub,
};
const NEWER: PublishedProject = { ...OLDER, slug: 'newer', title: 'Newer', posted: '2026-05-02' };
const SOON_A: ComingSoonProject = {
  ...base,
  slug: 'soon-a',
  title: 'Soon A',
  status: 'coming-soon',
};
const SOON_B: ComingSoonProject = { ...SOON_A, slug: 'soon-b', title: 'Soon B' };
const SOON_C: ComingSoonProject = { ...SOON_A, slug: 'soon-c', title: 'Soon C' };
const DRAFT: DraftProject = {
  ...base,
  slug: 'draft',
  title: 'Draft',
  status: 'draft',
  page: loadStub,
};

const REGISTRY = [SOON_A, OLDER, DRAFT, SOON_B, NEWER, SOON_C];

describe('publishedProjects', () => {
  it('lists only published projects, newest post first', () => {
    expect(publishedProjects(REGISTRY)).toEqual([NEWER, OLDER]);
  });

  it('is empty when nothing is published', () => {
    expect(publishedProjects([SOON_A, DRAFT])).toEqual([]);
  });
});

describe('homeProjects', () => {
  const FOUR_SLOTS = 4;
  const TWO_SLOTS = 2;

  it('puts published projects first, then fills the slots with coming-soon ones in order', () => {
    expect(homeProjects(REGISTRY, FOUR_SLOTS)).toEqual([NEWER, OLDER, SOON_A, SOON_B]);
  });

  it('never shows drafts, even with slots to spare', () => {
    expect(homeProjects([DRAFT, SOON_A], FOUR_SLOTS)).toEqual([SOON_A]);
  });

  it('drops coming-soon projects first when published ones fill the slots', () => {
    expect(homeProjects(REGISTRY, TWO_SLOTS)).toEqual([NEWER, OLDER]);
  });
});

describe('projectRoutes', () => {
  const paths = (showDrafts: boolean) =>
    projectRoutes(REGISTRY, showDrafts).map((route) => route.path);

  it('routes published projects under /projects, and nothing else', () => {
    expect(paths(false)).toEqual(['projects/older', 'projects/newer']);
  });

  it('adds drafts when drafts are shown', () => {
    expect(paths(true)).toEqual(['projects/older', 'projects/draft', 'projects/newer']);
  });

  it('titles each page after its project and loads its page component', async () => {
    const [route] = projectRoutes([OLDER], false);
    expect(route.title).toBe('Older · Zach Fejes');
    expect(await route.loadComponent?.()).toBe(StubPage);
  });
});

describe('formatTimeline', () => {
  it('formats a month', () => {
    expect(formatMonth('2019-03')).toBe('Mar 2019');
  });

  it('shows a start and end month', () => {
    expect(formatTimeline({ start: '2019-03', end: '2021-06' })).toBe('Mar 2019 – Jun 2021');
  });

  it('shows one month when the work started and ended in it', () => {
    expect(formatTimeline({ start: '2024-08', end: '2024-08' })).toBe('Aug 2024');
  });

  it('marks ongoing work as continuing to the present', () => {
    expect(formatTimeline({ start: '2025-11' })).toBe('Nov 2025 – present');
  });
});

describe('formatDate', () => {
  it('formats a posting date as day, month and year', () => {
    expect(formatDate('2026-10-08')).toBe('8 Oct 2026');
  });
});
