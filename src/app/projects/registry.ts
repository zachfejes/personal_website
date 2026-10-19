import { Project } from './project';

/** How many project cards the home page shows. Three columns, two rows. */
export const HOME_PROJECT_SLOTS = 6;

/**
 * Every project the site knows about. Order matters for coming-soon projects: the first ones
 * fill whatever home-page slots published projects leave free. Summaries are drafts until each
 * write-up exists.
 */
export const PROJECTS: readonly Project[] = [
  {
    slug: 'armada-scaling',
    status: 'coming-soon',
    page: () => import('./armada-scaling/armada-scaling.page').then((m) => m.ArmadaScalingPage),
    timeline: { start: '2018-09', end: '2018-09' },
    title: 'Armada Scaling',
    category: 'Data · Tabletop',
    summary:
      'Working out the non-linear model scale in Star Wars: Armada, so a custom station feels right on the table.',
    tags: ['Regression', 'Charts', 'Modeling'],
    art: 'chart',
  },
  {
    slug: 'padi-advanced-open-water',
    status: 'coming-soon',
    timeline: { start: '2026-08' },
    title: 'PADI Advanced Open Water',
    category: 'Exploration · Training',
    summary:
      'Going beyond open water: advanced scuba training, deeper dives, and learning to explore a very different world.',
    tags: ['Scuba', 'Travel', 'Training'],
    art: 'dive',
  },
  {
    slug: 'generic-graphing-library',
    status: 'coming-soon',
    timeline: { start: '2026-06' },
    title: 'Generic Graphing Library',
    category: 'Software · Math',
    summary:
      'A multi-purpose graph library in Angular and TypeScript: graph theory, tooling, and interfaces for working with connected data.',
    tags: ['TypeScript', 'Graph theory', 'GUI'],
    art: 'graph',
  },
  {
    slug: 'hi-seas-analog-mission',
    status: 'coming-soon',
    timeline: { start: '2024-04', end: '2024-04' },
    title: 'HI-SEAS Analog Mission',
    category: 'Space · Research',
    summary:
      'An analog space mission at HI-SEAS, a simulated planetary habitat in Hawaii: research, exploration, and life as crew.',
    tags: ['Astronautics', 'Research', 'Exploration'],
    art: 'contours',
  },
  {
    slug: 'mandalorian-cosplay',
    status: 'coming-soon',
    timeline: { start: '2020-05' },
    title: 'Mandalorian Cosplay',
    category: 'Fabrication · Star Wars',
    summary:
      'Designing and building a Mandalorian costume, from research and CAD to 3D printing, sewing, and electronics.',
    tags: ['CAD', '3D printing', 'Electronics'],
    art: 'visor',
  },
  {
    slug: 'modular-cave-terrain',
    status: 'coming-soon',
    timeline: { start: '2022-05' },
    title: 'Modular Cave Terrain',
    category: 'Tabletop · Design',
    summary:
      'Modular, 3D-printed cave terrain for Dungeons & Dragons, designed to work with the OpenForge 2.0 system.',
    tags: ['D&D', 'CAD', '3D printing'],
    art: 'tiles',
  },
];
