import { Schema } from '../../dev/tuner/tuning';
import { SCALE_KINDS, ScaleKind } from './scale-chart/axis';

/**
 * Every adjustable design value on the Armada page, in one place. The tuning panel (staging and
 * development) edits a copy of these; settings copied from the panel are pasted back here.
 */
export const DESIGN = {
  layout: {
    readingWidthCh: 62,
    figureWidthRem: 52,
    sectionPaddingRem: 5,
    bodySizeRem: 1.08,
    lineHeight: 1.7,
    headingSizeRem: 2.5,
    titleSizeRem: 4.4,
    equationSizeEm: 1.15,
  },
  /** The drawing-sheet background: a fine grid with a coarser one over it, and soft glows. */
  sheet: {
    gridOpacity: 0.03,
    gridMajorOpacity: 0.055,
    glowOpacity: 0.5,
  },
  /** Motion (all off with reduced motion). */
  motion: {
    /** The hero's lines drawing themselves on arrival. */
    drawMs: 1000,
    /** Gap between each callout appearing. */
    calloutStaggerMs: 180,
    /** One trip of the amber marker round the hero's dashed ring. */
    orbitSeconds: 60,
    /** The ping from a section's marker when it first scrolls into view. */
    pulseMs: 1200,
    pulseScale: 1.8,
    /** Phone field notes opening and closing. */
    foldMs: 350,
  },
  chart: {
    /** Axes the charts start on; readers can switch. Log keeps every ship readable. */
    defaultScale: 'log' as ScaleKind,
    aspectRatio: 0.62,
    pointRadius: 4.5,
    plannedRadius: 6,
    fitWidth: 2.2,
    gridOpacity: 0.3,
    labelSizePx: 12,
    showGrid: true,
    /** Named ships are labelled on charts at least this wide. */
    annotateMinWidthPx: 560,
    /** Ships, the power fit and planned ships take the page's colors; the log fit has its own. */
    logColor: '#8fb3a2',
  },
  figures: {
    wireframeOpacity: 0.9,
    wireframeWidthPct: 100,
  },
};

export type Design = typeof DESIGN;

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
  sheet: {
    label: 'Sheet',
    controls: {
      gridOpacity: { type: 'range', label: 'Fine grid', min: 0, max: 0.2, step: 0.005 },
      gridMajorOpacity: { type: 'range', label: 'Major grid', min: 0, max: 0.2, step: 0.005 },
      glowOpacity: { type: 'range', label: 'Glow', min: 0, max: 1, step: 0.05 },
    },
  },
  motion: {
    label: 'Motion',
    controls: {
      drawMs: { type: 'range', label: 'Hero draw-in', min: 0, max: 3000, step: 50, unit: 'ms' },
      calloutStaggerMs: {
        type: 'range',
        label: 'Callout stagger',
        min: 0,
        max: 600,
        step: 10,
        unit: 'ms',
      },
      orbitSeconds: { type: 'range', label: 'Orbit period', min: 10, max: 180, step: 5, unit: 's' },
      pulseMs: { type: 'range', label: 'Pulse', min: 200, max: 3000, step: 50, unit: 'ms' },
      pulseScale: { type: 'range', label: 'Pulse size', min: 1, max: 3, step: 0.1 },
      foldMs: { type: 'range', label: 'Field note fold', min: 0, max: 1000, step: 25, unit: 'ms' },
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
      gridOpacity: { type: 'range', label: 'Grid opacity', min: 0, max: 1, step: 0.01 },
      labelSizePx: { type: 'range', label: 'Label size', min: 9, max: 18, step: 0.5, unit: 'px' },
      showGrid: { type: 'toggle', label: 'Show grid' },
      annotateMinWidthPx: {
        type: 'range',
        label: 'Label ships from',
        min: 320,
        max: 1200,
        step: 10,
        unit: 'px',
      },
      logColor: { type: 'color', label: 'Log fit' },
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
