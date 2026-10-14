import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Hero } from '../../home/hero/hero';
import { RevealDirective } from '../../shared/reveal.directive';

interface ProjectTeaser {
  title: string;
  category: string;
  status: string;
  summary: string;
  tags: string[];
  art: 'chart' | 'dive' | 'graph' | 'contours' | 'visor' | 'tiles';
}

@Component({
  selector: 'app-home-page',
  imports: [Hero, RevealDirective, RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  protected readonly hero = {
    eyebrow: 'Field notes from the world to the workbench',
    headline: 'Motivated by *wonder*, | and the deep desire | to improve the world',
    lede: 'A portfolio of projects and interactive write-ups: math, models, design, art, and the lessons learned.',
  };

  // Featured projects (draft summaries) until the project registry lands in milestone 4.
  protected readonly projects: ProjectTeaser[] = [
    {
      title: 'Armada Scaling',
      category: 'Data · Tabletop',
      status: 'First write-up',
      summary:
        'Working out the non-linear model scale in Star Wars: Armada, so a custom station feels right on the table.',
      tags: ['Regression', 'Charts', 'Modeling'],
      art: 'chart',
    },
    {
      title: 'PADI Advanced Open Water',
      category: 'Exploration · Training',
      status: 'Coming soon',
      summary:
        'Going beyond open water: advanced scuba training, deeper dives, and learning to explore a very different world.',
      tags: ['Scuba', 'Travel', 'Training'],
      art: 'dive',
    },
    {
      title: 'Generic Graphing Library',
      category: 'Software · Math',
      status: 'Coming soon',
      summary:
        'A multi-purpose graph library in Angular and TypeScript: graph theory, tooling, and interfaces for working with connected data.',
      tags: ['TypeScript', 'Graph theory', 'GUI'],
      art: 'graph',
    },
    {
      title: 'HI-SEAS Analog Mission',
      category: 'Space · Research',
      status: 'Coming soon',
      summary:
        'An analog space mission at HI-SEAS, a simulated planetary habitat in Hawaii: research, exploration, and life as crew.',
      tags: ['Astronautics', 'Research', 'Exploration'],
      art: 'contours',
    },
    {
      title: 'Mandalorian Cosplay',
      category: 'Fabrication · Star Wars',
      status: 'Coming soon',
      summary:
        'Designing and building a Mandalorian costume, from research and CAD to 3D printing, sewing, and electronics.',
      tags: ['CAD', '3D printing', 'Electronics'],
      art: 'visor',
    },
    {
      title: 'Modular Cave Terrain',
      category: 'Tabletop · Design',
      status: 'Coming soon',
      summary:
        'Modular, 3D-printed cave terrain for Dungeons & Dragons, designed to work with the OpenForge 2.0 system.',
      tags: ['D&D', 'CAD', '3D printing'],
      art: 'tiles',
    },
  ];

  protected readonly facts = [
    { label: 'Based in', value: 'Mississauga, Ontario' },
    { label: 'Currently', value: 'Ground Segment Architect, MDA Space' },
    { label: 'Focus', value: 'Space robotics · Ground systems · Software architecture' },
    { label: 'Goal', value: 'Astronaut' },
  ];
}
