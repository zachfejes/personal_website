import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Hero } from '../../home/hero/hero';
import { RevealDirective } from '../../shared/reveal.directive';

interface ProjectTeaser {
  title: string;
  year: string;
  category: string;
  summary: string;
  tags: string[];
  art: 'chart' | 'contours' | 'flows';
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

  // Placeholder content until the project registry lands (milestone 4).
  protected readonly projects: ProjectTeaser[] = [
    {
      title: 'Armada Scaling',
      year: '2018',
      category: 'Data · Tabletop',
      summary:
        'Working out the non-linear model scale in Star Wars: Armada, so a custom station feels right on the table.',
      tags: ['Regression', 'Charts', 'Modeling'],
      art: 'chart',
    },
    {
      title: 'Lorem Survey',
      year: '2024',
      category: 'Maps · Design',
      summary:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed posuere consectetur est at lobortis.',
      tags: ['Cartography', 'Canvas'],
      art: 'contours',
    },
    {
      title: 'Ipsum Engine',
      year: '2025',
      category: 'Systems · Art',
      summary:
        'Vestibulum id ligula porta felis euismod semper. Cras mattis consectetur purus sit amet fermentum.',
      tags: ['Simulation', 'D3'],
      art: 'flows',
    },
  ];

  protected readonly facts = [
    { label: 'Based in', value: 'Lorem, Ipsum' },
    { label: 'Currently', value: 'Dolor sit amet' },
    { label: 'Focus', value: 'Data · Design · Engineering' },
    { label: 'Write-ups', value: '01' },
  ];
}
