import { render, screen, within } from '@testing-library/angular';
import { AboutPage } from './about.page';
import { EXPERIENCE, RESUME_PDF } from './resume';

describe('AboutPage', () => {
  it('offers the resume as a PDF download', async () => {
    await render(AboutPage);
    const link = screen.getByRole('link', { name: 'Download resume (PDF)' });
    expect(link.getAttribute('href')).toBe(RESUME_PDF);
    expect(link.hasAttribute('download')).toBe(true);
  });

  it('lists every role, newest first, with its dates', async () => {
    await render(AboutPage);
    const roles = within(screen.getByRole('list', { name: 'Experience' })).getAllByRole('listitem');
    expect(roles).toHaveLength(EXPERIENCE.length);
    // The current role first, still running; an earlier one with exact months; one by year only.
    expect(roles[0].textContent).toContain('Mar 2021 – present');
    expect(roles[1].textContent).toContain('Dec 2019 – Mar 2021');
    expect(roles[roles.length - 1].textContent).toContain('2012');
  });
});
