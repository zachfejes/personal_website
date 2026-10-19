import { Type } from '@angular/core';

/** Cover artwork drawn by the project card (see shared/project-card). */
export type CardArt = 'chart' | 'contours' | 'dive' | 'graph' | 'tiles' | 'visor';

/** A calendar date, `YYYY-MM-DD`. */
export type IsoDate = `${number}-${number}-${number}`;

/** When the work itself happened. Months are enough; no end means it's ongoing. */
export interface Timeline {
  /** `YYYY-MM`. */
  start: `${number}-${number}`;
  end?: `${number}-${number}`;
}

/** Lazy-loads a project's page component. */
export type PageLoader = () => Promise<Type<unknown>>;

interface ProjectBase {
  /** URL segment under /projects/, lowercase words joined by hyphens. */
  slug: string;
  title: string;
  /** Short field label, e.g. "Data · Tabletop". */
  category: string;
  /** One or two sentences for cards and link previews. */
  summary: string;
  /** A few topic tags. */
  tags: readonly string[];
  art: CardArt;
  timeline?: Timeline;
}

/** Written and live: listed, linked and routed. */
export interface PublishedProject extends ProjectBase {
  status: 'published';
  timeline: Timeline;
  posted: IsoDate;
  page: PageLoader;
}

/** Announced on the home page while its slot is free; no page yet. */
export interface ComingSoonProject extends ProjectBase {
  status: 'coming-soon';
}

/** Being written: routed only where environment.showDrafts is on, never listed. */
export interface DraftProject extends ProjectBase {
  status: 'draft';
  page: PageLoader;
}

export type Project = PublishedProject | ComingSoonProject | DraftProject;
export type ProjectStatus = Project['status'];
