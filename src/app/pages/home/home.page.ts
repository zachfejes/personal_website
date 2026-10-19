import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Hero } from '../../home/hero/hero';
import { homeProjects, publishedProjects } from '../../projects/project-list';
import { HOME_PROJECT_SLOTS, PROJECTS } from '../../projects/registry';
import { ProjectCard } from '../../shared/project-card/project-card';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-home-page',
  imports: [Hero, ProjectCard, RevealDirective, RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  protected readonly hero = {
    eyebrow: 'Field notes from the world to the workbench',
    eyebrowShort: 'Field notes · world to workbench',
    headline: 'Motivated by *wonder*, | and the deep desire | to improve the world',
    lede: 'A portfolio of projects and interactive write-ups: math, models, design, art, and the lessons learned.',
  };

  protected readonly projects = homeProjects(PROJECTS, HOME_PROJECT_SLOTS);
  protected readonly hasPublished = publishedProjects(PROJECTS).length > 0;

  protected readonly facts = [
    { label: 'Based in', value: 'Mississauga, Ontario' },
    { label: 'Currently', value: 'Ground Segment Architect, MDA Space' },
    { label: 'Focus', value: 'Space robotics · Ground systems · Software architecture' },
    { label: 'Education', value: 'BASc Electrical Engineering, University of Toronto' },
    { label: 'Goal', value: 'Astronaut' },
  ];
}
