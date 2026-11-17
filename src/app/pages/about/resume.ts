import { Timeline } from '../../projects/project';

/** One role on the experience timeline. */
export interface Role {
  title: string;
  organization: string;
  /** Exact months where known; `years` (e.g. "2014") for earlier, shorter roles. */
  timeline?: Timeline;
  years?: string;
  /** Earlier titles in the same role, newest first, e.g. promotions. */
  steps?: readonly string[];
  /** One or two lines on what the role was. */
  summary: string;
}

/** Experience, newest first. From the master resume; the PDF carries the full detail. */
export const EXPERIENCE: readonly Role[] = [
  {
    title: 'Software Architect, Ground Segment',
    organization: 'MDA Space',
    timeline: { start: '2021-03' },
    steps: ['Staff MTS from Aug 2025', 'Senior MTS from Jun 2022', 'MTS from Mar 2021'],
    summary:
      'Owned the ground software architecture for Canadarm3 through its preliminary and critical design reviews. Now the ground segment architect across about eight programs, from the lunar surface to Earth orbit.',
  },
  {
    title: 'Team Lead, Voice Lab',
    organization: 'Royal Bank of Canada',
    timeline: { start: '2019-12', end: '2021-03' },
    summary:
      'Led the Voice Lab: its budget, its projects and its technology partners, keeping customer data in Canada while moving to the cloud.',
  },
  {
    title: 'Innovation Developer, Voice Lab',
    organization: 'Royal Bank of Canada',
    timeline: { start: '2018-11', end: '2019-12' },
    summary:
      'Built voice apps and prototypes for employees, some using early language models. Named in the top 1% of performers across RBC.',
  },
  {
    title: 'Co-Founder and VP Technology',
    organization: 'Second Closet',
    timeline: { start: '2017-01', end: '2018-10' },
    summary:
      'Built and ran the point-of-sale platform and warehouse tools for a storage and moving company, and IoT tools for its vans.',
  },
  {
    title: 'CEO',
    organization: 'Voyager Space Exploration Corporation',
    timeline: { start: '2015-09', end: '2017-05' },
    summary:
      'Led 22 developers building a space mission-planning suite, and wrote its real-time trajectory planner and n-body simulator.',
  },
  {
    title: 'Team Lead, Project Voyager',
    organization: 'Icarus Interstellar',
    timeline: { start: '2014-05', end: '2016-05' },
    summary:
      'Led 20 contributors modelling the solar system from NASA ephemeris data, with patched-conic trajectory planning.',
  },
  {
    title: 'Co-Founder',
    organization: 'Sensassure',
    years: '2014',
    summary:
      'Designed the sensors, electronics and circuit boards for a medical device for hospitals and long-term care. Named inventor on its US patent.',
  },
  {
    title: 'Research Intern',
    organization: 'FH Joanneum, Graz, Austria',
    years: '2012',
    summary:
      'Built a structured-English analyzer for automated approval workflows, later co-authoring a paper on it.',
  },
];

/** Skills in groups, from the resume's competencies and technical skills. */
export const SKILLS: readonly { group: string; items: readonly string[] }[] = [
  {
    group: 'Architecture',
    items: [
      'Ground segment and systems architecture',
      'Microservices, publish-subscribe, multi-tenant platforms',
      'C4, UML, SysML',
      'Trade studies and design reviews',
    ],
  },
  {
    group: 'Safety-critical engineering',
    items: [
      'Requirements traceability',
      'FMEA',
      'Verification and validation planning',
      'NPR 7150.2, NASA-STD-8739.8, ISO/IEC/IEEE 12207',
    ],
  },
  {
    group: 'Software',
    items: [
      'TypeScript, Angular, Node.js, React',
      'C#, C++, C, MATLAB',
      'AWS, GCP, Azure',
      'Git, Jenkins, SonarQube',
    ],
  },
  {
    group: 'Hardware and making',
    items: ['PCB design, ESP32', 'Kinematics', 'CAD, 3D printing, CNC, laser cutting', 'Sewing'],
  },
];

/** Education, and other experience worth listing alongside it. */
export const EDUCATION: readonly { title: string; detail: string; years: string }[] = [
  {
    title: 'BASc, Electrical Engineering',
    detail:
      'University of Toronto. Chair of the Electrical Engineering Club (800+ undergraduates).',
    years: '2014',
  },
  {
    title: 'Analog lunar mission crew member',
    detail: 'Isolated lunar-simulant habitat on Mauna Loa, Hawaii.',
    years: '2024',
  },
  {
    title: 'Robotics Canada task force',
    detail: 'Supported the founding of Robotics Canada.',
    years: '2021',
  },
];

/** The downloadable resume, in public/. */
export const RESUME_PDF = 'zachary-fejes-resume.pdf';
