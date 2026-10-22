import { Schema } from '../../dev/tuner/tuning';
import { SCALE_KINDS, ScaleKind } from './scale-chart/axis';

const BANDS = ['dark', 'light', 'accent'] as const;
export type Band = (typeof BANDS)[number];

/**
 * Every adjustable design value on the Armada page, in one place. The tuning panel (staging and
 * development) edits a copy of these; settings copied from the panel are pasted back here.
 */
export const DESIGN = {
  layout: {
    readingWidthCh: 66,
    figureWidthRem: 52,
    sectionPaddingRem: 5,
    bodySizeRem: 1.08,
    lineHeight: 1.7,
    headingSizeRem: 2.2,
    titleSizeRem: 4.4,
    equationSizeEm: 1.15,
  },
  bands: {
    intro: 'dark' as Band,
    problem: 'light' as Band,
    method: 'accent' as Band,
    fitting: 'light' as Band,
    comparison: 'dark' as Band,
    findings: 'light' as Band,
    references: 'dark' as Band,
  },
  chart: {
    /** Axes the charts start on; readers can switch. Log keeps every ship readable. */
    defaultScale: 'log' as ScaleKind,
    aspectRatio: 0.62,
    pointRadius: 4.5,
    plannedRadius: 6,
    fitWidth: 2.2,
    gridOpacity: 0.14,
    labelSizePx: 13,
    showGrid: true,
    pointColor: '#e9dcc4',
    powerColor: '#e3a857',
    logColor: '#8fb3a2',
    plannedColor: '#e3a857',
    panelColor: '#141917',
  },
  figures: {
    wireframeOpacity: 0.9,
    wireframeWidthPct: 100,
  },
};

export type Design = typeof DESIGN;

const band = (label: string) => ({ type: 'select', label, options: BANDS }) as const;

export const DESIGN_SCHEMA: Schema<Design> = {
  layout: {
    label: 'Layout & type',
    controls: {
      readingWidthCh: {
        type: 'range',
        label: 'Reading width',
        min: 40,
        max: 90,
        step: 1,
        unit: 'ch',
      },
      figureWidthRem: {
        type: 'range',
        label: 'Figure width',
        min: 30,
        max: 80,
        step: 1,
        unit: 'rem',
      },
      sectionPaddingRem: {
        type: 'range',
        label: 'Section padding',
        min: 2,
        max: 10,
        step: 0.25,
        unit: 'rem',
      },
      bodySizeRem: {
        type: 'range',
        label: 'Body text',
        min: 0.9,
        max: 1.4,
        step: 0.01,
        unit: 'rem',
      },
      lineHeight: { type: 'range', label: 'Line height', min: 1.3, max: 2, step: 0.05 },
      headingSizeRem: {
        type: 'range',
        label: 'Headings',
        min: 1.4,
        max: 3.5,
        step: 0.05,
        unit: 'rem',
      },
      titleSizeRem: {
        type: 'range',
        label: 'Title (max)',
        min: 2.5,
        max: 7,
        step: 0.1,
        unit: 'rem',
      },
      equationSizeEm: {
        type: 'range',
        label: 'Equations',
        min: 0.9,
        max: 1.6,
        step: 0.05,
        unit: 'em',
      },
    },
  },
  bands: {
    label: 'Section bands',
    controls: {
      intro: band('Intro'),
      problem: band('The problem'),
      method: band('Method'),
      fitting: band('Fitting'),
      comparison: band('Comparison'),
      findings: band('Findings'),
      references: band('References'),
    },
  },
  chart: {
    label: 'Charts',
    controls: {
      defaultScale: { type: 'select', label: 'Starting scale', options: SCALE_KINDS },
      aspectRatio: { type: 'range', label: 'Height ÷ width', min: 0.4, max: 1, step: 0.01 },
      pointRadius: { type: 'range', label: 'Point size', min: 2, max: 9, step: 0.5, unit: 'px' },
      plannedRadius: {
        type: 'range',
        label: 'Planned size',
        min: 2,
        max: 10,
        step: 0.5,
        unit: 'px',
      },
      fitWidth: { type: 'range', label: 'Fit line', min: 0.5, max: 5, step: 0.1, unit: 'px' },
      gridOpacity: { type: 'range', label: 'Grid opacity', min: 0, max: 0.5, step: 0.01 },
      labelSizePx: { type: 'range', label: 'Label size', min: 9, max: 18, step: 0.5, unit: 'px' },
      showGrid: { type: 'toggle', label: 'Show grid' },
      pointColor: { type: 'color', label: 'Ships' },
      powerColor: { type: 'color', label: 'Power fit' },
      logColor: { type: 'color', label: 'Log fit' },
      plannedColor: { type: 'color', label: 'Planned ships' },
      panelColor: { type: 'color', label: 'Chart panel' },
    },
  },
  figures: {
    label: 'Figures',
    controls: {
      wireframeOpacity: { type: 'range', label: 'Wireframe opacity', min: 0.3, max: 1, step: 0.05 },
      wireframeWidthPct: {
        type: 'range',
        label: 'Wireframe width',
        min: 40,
        max: 100,
        step: 5,
        unit: '%',
      },
    },
  },
};
