import { Type } from '@angular/core';
import { render, screen, within } from '@testing-library/angular';
import { ComingSoonProject, PublishedProject, Timeline } from '../../projects/project';
import { ProjectCard } from './project-card';

class StubPage {}

const PUBLISHED: PublishedProject = {
  slug: 'armada-scaling',
  status: 'published',
  title: 'Armada Scaling',
  category: 'Data · Tabletop',
  summary: 'Working out the model scale.',
  tags: ['Regression', 'Charts'],
  art: 'chart',
  timeline: { start: '2019-03', end: '2019-06' },
  posted: '2026-10-08',
  page: () => Promise.resolve(StubPage as Type<unknown>),
};
const PUBLISHED_PATH = '/projects/armada-scaling';
const PUBLISHED_TIMELINE = 'Mar 2019 – Jun 2019';
const PUBLISHED_ON = '8 Oct 2026';

const COMING_SOON: ComingSoonProject = {
  slug: 'mandalorian-cosplay',
  status: 'coming-soon',
  title: 'Mandalorian Cosplay',
  category: 'Fabrication · Star Wars',
  summary: 'Designing and building a costume.',
  tags: ['CAD'],
  art: 'visor',
};

const ONGOING: Timeline = { start: '2020-05' };
const ONGOING_LABEL = 'May 2020 – present';

const renderCard = (project: PublishedProject | ComingSoonProject, headingLevel?: 2 | 3) =>
  render(ProjectCard, { inputs: { project, ...(headingLevel ? { headingLevel } : {}) } });

describe('ProjectCard', () => {
  describe('for a published project', () => {
    it('links its title to the project page', async () => {
      await renderCard(PUBLISHED);
      const link = screen.getByRole('link', { name: PUBLISHED.title });
      expect(link.getAttribute('href')).toBe(PUBLISHED_PATH);
    });

    it('shows when the work happened and when it was posted', async () => {
      await renderCard(PUBLISHED);
      expect(screen.getByText(PUBLISHED_TIMELINE)).toBeTruthy();
      const posted = screen.getByText(PUBLISHED_ON);
      expect(posted.getAttribute('datetime')).toBe(PUBLISHED.posted);
    });
  });

  describe('for a coming-soon project', () => {
    it('says it is coming soon and does not link anywhere', async () => {
      await renderCard(COMING_SOON);
      expect(screen.getByText('Coming soon')).toBeTruthy();
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('does not show a posting date', async () => {
      await renderCard(COMING_SOON);
      expect(screen.queryByText(/posted/i)).toBeNull();
    });

    it('shows when the work happened, if known', async () => {
      await renderCard({ ...COMING_SOON, timeline: ONGOING });
      expect(screen.getByText(ONGOING_LABEL)).toBeTruthy();
    });

    it('leaves the timeline out when it is not known', async () => {
      await renderCard(COMING_SOON);
      expect(screen.queryByText(/present|\d{4}/)).toBeNull();
    });
  });

  it('shows the category, summary and topics', async () => {
    await renderCard(COMING_SOON);
    expect(screen.getByText(COMING_SOON.category)).toBeTruthy();
    expect(screen.getByText(COMING_SOON.summary)).toBeTruthy();
    const topics = within(screen.getByRole('list', { name: 'Topics' }));
    expect(topics.getAllByRole('listitem').map((item) => item.textContent.trim())).toEqual(
      COMING_SOON.tags,
    );
  });

  it('titles the card with a level-3 heading by default', async () => {
    await renderCard(COMING_SOON);
    expect(screen.getByRole('heading', { level: 3, name: COMING_SOON.title })).toBeTruthy();
  });

  it('uses the heading level it is given', async () => {
    const LEVEL = 2;
    await renderCard(COMING_SOON, LEVEL);
    expect(screen.getByRole('heading', { level: LEVEL, name: COMING_SOON.title })).toBeTruthy();
  });

  it('keeps its cover art out of the accessibility tree', async () => {
    const { container } = await renderCard(COMING_SOON);
    expect(container.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
