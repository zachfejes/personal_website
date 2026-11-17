import { Component } from '@angular/core';
import { formatTimeline } from '../../projects/project-list';
import { RevealDirective } from '../../shared/reveal.directive';
import { EDUCATION, EXPERIENCE, RESUME_PDF, Role, SKILLS } from './resume';

/** The long version: bio, experience, skills and education, with the resume to download. */
@Component({
  selector: 'app-about-page',
  imports: [RevealDirective],
  templateUrl: './about.page.html',
  styleUrl: './about.page.scss',
})
export class AboutPage {
  protected readonly experience = EXPERIENCE;
  protected readonly skills = SKILLS;
  protected readonly education = EDUCATION;
  protected readonly resumePdf = RESUME_PDF;

  /** "Mar 2021 – present", or the years for roles without exact months. */
  protected dates(role: Role): string {
    return role.timeline ? formatTimeline(role.timeline) : (role.years ?? '');
  }
}
