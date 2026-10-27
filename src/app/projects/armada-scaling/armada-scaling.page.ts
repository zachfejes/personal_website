import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TunerPanel } from '../../dev/tuner/tuner-panel';
import { Schema, Settings } from '../../dev/tuner/tuning';
import { RevealDirective } from '../../shared/reveal.directive';
import {
  CANDIDATE_SCORES,
  LOG_FIT,
  LOG_PERCENT_ERROR,
  LOG_RMSE,
  PLANNED_POINTS,
  POWER_FIT,
  POWER_PERCENT_ERROR,
  POWER_CURVATURE,
  POWER_RESIDUALS,
  POWER_RMSE,
  POWER_SIZE_BANDS,
  SPLIT_POWER,
  logFitZeroM,
  modelNeighbors,
  nearestByCanon,
  predictModelMm,
  scaleRatio,
} from './analysis';
import { ScaleCalculator } from './calculator';
import { CandidateRow, CandidatesTable } from './candidates-table';
import { ArmadaHero, HeroFacts } from './hero/armada-hero';
import { DESIGN, DESIGN_SCHEMA, Design } from './design';
import { AxisLabel, FitLine, NamedPoint, ScaleChart } from './scale-chart/scale-chart';
import { MEASUREMENT_SOURCES, SHIPS, XQ2 } from './ships';
import { GlobeEdge } from './sheet/globe-edge';
import { SheetFold } from './sheet/sheet-fold';
import { SheetFrame } from './sheet/sheet-frame';
import { SheetHead } from './sheet/sheet-head';
import { SheetPaper } from './sheet/sheet-paper';
import { SheetPhoto } from './sheet/sheet-photo';
import { Tex } from './tex';
import { signedTerm } from './tex-format';

/** Coefficients as published: a and b to 2–3 significant decimals. */
const COEFFICIENT_DECIMALS = { a: 2, b: 3, rmse: 1, percent: 1, curvature: 3 } as const;
const fixed = (value: number, decimals: number) => value.toFixed(decimals);
/** "1,248.5": fixed decimals, thousands separated, for numbers that can run large. */
const grouped = (value: number, decimals: number) =>
  value.toLocaleString('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const PERCENT = 100;
/** "a, b and c". */
const listOf = (items: readonly string[]) =>
  items.length > 1
    ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
    : items.join('');
/** Ratios on the error chart: two decimals tell 0.98 from 1.02. */
const RATIO_DECIMALS = 2;

const DOUBLE = 2;
/** The fit the page uses is drawn in the page's accent. */
const POWER_FIT_COLOR = 'var(--sheet-accent)';
/** Ships labelled on the charts (on wide screens): the extremes, and the planned ones that matter. */
const LABELLED = {
  data: ['Executor Star Destroyer', 'TIE Fighter'],
  fits: ['TIE Fighter'],
  planned: ['Tri-fighter Droid', 'Naboo Royal Cruiser', 'MC40a'],
} as const;
/** The error chart labels the ships furthest from the power fit. */
const RESIDUAL_LABELS = 2;
/** Scales are quoted to two significant digits: "1 : 6,200". */
const SCALE_DIGITS = 2;
/** The familiar small ship the hero compares the XQ2's scale with. */
const REFERENCE_FIGHTER = 'TIE Fighter';

/** "the Victory Star Destroyer (137 mm)": a measured ship by name and rounded model length. */
const shipLabel = (ship: { name: string; modelMm: number } | null) =>
  ship && `${ship.name} (${Math.round(ship.modelMm)} mm)`;
function neighborNames(modelMm: number) {
  const { below, above } = modelNeighbors(SHIPS, modelMm);
  return { below: shipLabel(below), above: shipLabel(above) };
}

/** Ships the log fit gives a negative model length: those shorter than where it crosses zero. */
function negativeBelow(zeroM: number | null) {
  const count = zeroM === null ? 0 : SHIPS.filter((s) => s.canonM < zeroM).length;
  return zeroM !== null && count > 0 ? { belowM: Math.round(zeroM), count } : null;
}

/**
 * Armada Scaling: working out the non-linear model scale in Star Wars: Armada. First written in
 * 2018; the fits, numbers and charts here are computed from the data, not copied.
 */
@Component({
  selector: 'app-armada-scaling-page',
  imports: [
    ArmadaHero,
    CandidatesTable,
    GlobeEdge,
    RevealDirective,
    ScaleCalculator,
    ScaleChart,
    SheetFold,
    SheetFrame,
    SheetHead,
    SheetPaper,
    SheetPhoto,
    Tex,
    TunerPanel,
  ],
  templateUrl: './armada-scaling.page.html',
  styleUrl: './armada-scaling.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--reading-width.ch]': 'design().layout.readingWidthCh',
    '[style.--figure-width.rem]': 'design().layout.figureWidthRem',
    '[style.--section-padding.rem]': 'design().layout.sectionPaddingRem',
    '[style.--body-size.rem]': 'design().layout.bodySizeRem',
    '[style.--body-line-height]': 'design().layout.lineHeight',
    '[style.--heading-size.rem]': 'design().layout.headingSizeRem',
    '[style.--title-size.rem]': 'design().layout.titleSizeRem',
    '[style.--equation-size.em]': 'design().layout.equationSizeEm',
    '[style.--wireframe-opacity]': 'design().figures.wireframeOpacity',
    '[style.--wireframe-width.%]': 'design().figures.wireframeWidthPct',
    '[style.--grid-opacity]': 'design().sheet.gridOpacity',
    '[style.--grid-major-opacity]': 'design().sheet.gridMajorOpacity',
    '[style.--glow-opacity]': 'design().sheet.glowOpacity',
    '[style.--draw-ms.ms]': 'design().motion.drawMs',
    '[style.--callout-stagger-ms.ms]': 'design().motion.calloutStaggerMs',
    '[style.--orbit-s.s]': 'design().motion.orbitSeconds',
    '[style.--pulse-ms.ms]': 'design().motion.pulseMs',
    '[style.--pulse-scale]': 'design().motion.pulseScale',
    '[style.--fold-ms.ms]': 'design().motion.foldMs',
  },
})
export class ArmadaScalingPage {
  protected readonly showTuner = environment.showDrafts;
  /** The tuner edits settings generically; the page reads them back as its own Design type. */
  protected readonly designSchema = DESIGN_SCHEMA as unknown as Schema<Settings>;
  protected readonly designDefaults: Settings = DESIGN;
  protected readonly settings = signal<Settings>(structuredClone(DESIGN));
  protected readonly design = computed(() => this.settings() as Design);

  protected readonly ships: NamedPoint[] = SHIPS.map((s) => ({
    name: s.name,
    x: s.canonM,
    y: s.modelMm,
  }));
  protected readonly planned: NamedPoint[] = PLANNED_POINTS;
  /** Credited in the references, straight from ships.json. */
  protected readonly dataSources = MEASUREMENT_SOURCES;

  protected readonly fits = computed((): FitLine[] => {
    const chart = this.design().chart;
    return [
      { id: 'power', label: 'Power fit', color: POWER_FIT_COLOR, predict: POWER_FIT.predict },
      { id: 'log', label: 'Logarithmic fit', color: chart.logColor, predict: LOG_FIT.predict },
    ];
  });

  /** Each ship against the power fit's prediction, with 1 marking a perfect prediction. */
  protected readonly residuals: NamedPoint[] = POWER_RESIDUALS;
  protected readonly labelled = {
    ...LABELLED,
    residuals: [...POWER_RESIDUALS]
      .sort((a, b) => Math.abs(Math.log(b.y)) - Math.abs(Math.log(a.y)))
      .slice(0, RESIDUAL_LABELS)
      .map((r) => r.name),
  };
  protected readonly residualAxes: { x: AxisLabel; y: AxisLabel } = {
    x: { title: 'Canon length', unit: 'm' },
    y: { title: 'Model ÷ predicted', decimals: RATIO_DECIMALS },
  };

  /** Every candidate form, best at predicting a left-out ship first. */
  protected readonly candidates: CandidateRow[] = [...CANDIDATE_SCORES]
    .sort((a, b) => a.leaveOneOut - b.leaveOneOut)
    .map((s) => ({
      ...s.candidate,
      inSample: grouped(s.inSample, COEFFICIENT_DECIMALS.percent),
      leaveOneOut: grouped(s.leaveOneOut, COEFFICIENT_DECIMALS.percent),
      impossible: s.impossible,
    }));

  /** What the hero's callouts say about the XQ2. */
  protected readonly heroFacts: HeroFacts = (() => {
    const modelMm = predictModelMm(XQ2.canonM);
    const nearest = nearestByCanon(SHIPS, XQ2.canonM);
    const fighter = SHIPS.find((s) => s.name === REFERENCE_FIGHTER);
    return {
      shipCount: SHIPS.length,
      canonM: XQ2.canonM,
      modelMm: Math.round(modelMm),
      scale: scaleRatio(XQ2.canonM, modelMm, SCALE_DIGITS),
      nearest: nearest && { name: nearest.name, canonM: nearest.canonM },
      fighter: fighter
        ? { name: fighter.name, scale: scaleRatio(fighter.canonM, fighter.modelMm, SCALE_DIGITS) }
        : null,
    };
  })();

  /** The calculator's input, marked on the findings chart. */
  protected readonly canonM = signal<number | null>(XQ2.canonM);
  protected readonly predict = predictModelMm;
  protected readonly calculated = computed((): NamedPoint | null => {
    const canonM = this.canonM();
    return canonM === null
      ? null
      : { name: this.highlightName(canonM), x: canonM, y: predictModelMm(canonM) };
  });

  /** Numbers quoted in the text and equations, computed from the fits. */
  protected readonly n = {
    powerA: fixed(POWER_FIT.a, COEFFICIENT_DECIMALS.a),
    powerB: fixed(POWER_FIT.b, COEFFICIENT_DECIMALS.b),
    powerLogA: fixed(Math.log10(POWER_FIT.a), COEFFICIENT_DECIMALS.b),
    logA: fixed(LOG_FIT.a, COEFFICIENT_DECIMALS.a),
    logB: signedTerm(LOG_FIT.b, COEFFICIENT_DECIMALS.a),
    powerRmse: fixed(POWER_RMSE, COEFFICIENT_DECIMALS.rmse),
    logRmse: fixed(LOG_RMSE, COEFFICIENT_DECIMALS.rmse),
    powerPercent: fixed(POWER_PERCENT_ERROR, COEFFICIENT_DECIMALS.percent),
    logPercent: fixed(LOG_PERCENT_ERROR, COEFFICIENT_DECIMALS.percent),
    ratio: Math.round(LOG_PERCENT_ERROR / POWER_PERCENT_ERROR),
    xq2CanonM: XQ2.canonM,
    xq2ModelMm: Math.round(predictModelMm(XQ2.canonM)),
    /** The measured models just smaller and just larger than the XQ2's. */
    xq2Neighbors: neighborNames(predictModelMm(XQ2.canonM)),
    /** How much a model grows when its canon length doubles: 2^b. */
    doubling: fixed(DOUBLE ** POWER_FIT.b, COEFFICIENT_DECIMALS.a),
    shipCount: SHIPS.length,
    logNegative: negativeBelow(logFitZeroM(LOG_FIT)),
    candidateCount: CANDIDATE_SCORES.length,
    leaveOneOut: Object.fromEntries(
      CANDIDATE_SCORES.map((s) => [
        s.candidate.id,
        grouped(s.leaveOneOut, COEFFICIENT_DECIMALS.percent),
      ]),
    ),
    /** Whether no other form predicts a left-out ship better. */
    powerBest: this.candidates[0].id === 'power',
    curvature: fixed(POWER_CURVATURE, COEFFICIENT_DECIMALS.curvature),
    sizeBands: {
      lengths: listOf(
        POWER_SIZE_BANDS.map(
          (b) => `${b.fromX.toLocaleString('en')}–${b.toX.toLocaleString('en')} m`,
        ),
      ),
      percents: listOf(POWER_SIZE_BANDS.map((b) => `${Math.round(b.ratio * PERCENT)}%`)),
    },
    split: SPLIT_POWER && {
      atM: SPLIT_POWER.breakX,
      below: fixed(SPLIT_POWER.below, COEFFICIENT_DECIMALS.b),
      above: fixed(SPLIT_POWER.above, COEFFICIENT_DECIMALS.b),
      leaveOneOut: fixed(SPLIT_POWER.leaveOneOut, COEFFICIENT_DECIMALS.percent),
    },
  };

  /** What each folded field note says on phones, before it's opened. */
  protected readonly foldSummaries = {
    alternatives:
      `${this.n.candidateCount} curve shapes, scored on how well each predicts a ship it wasn't fitted to.` +
      (this.n.powerBest ? ' The power law wins.' : ''),
  };

  /** Equations that quote the computed coefficients. */
  protected readonly tex = {
    logFit: `y = ${this.n.logA} \\ln(x) ${this.n.logB}`,
    powerCoefficients: [
      '\\begin{aligned}',
      `b &= ${this.n.powerB} \\\\`,
      `\\log_{10}(a) &= ${this.n.powerLogA} \\\\`,
      `a &= 10^{${this.n.powerLogA}} = ${this.n.powerA}`,
      '\\end{aligned}',
    ].join(' '),
    powerFit: `y = ${this.n.powerA} x^{${this.n.powerB}}`,
    leastSquares: String.raw`\min_{m,\,c} \sum_{i=1}^{n} \left(y_i - (m x_i + c)\right)^2`,
    slope: String.raw`m = \frac{\sum_i (x_i - \bar{x})(y_i - \bar{y})}{\sum_i (x_i - \bar{x})^2}`,
    intercept: String.raw`c = \bar{y} - m\,\bar{x}`,
    rmse: String.raw`\text{RMSE} = \sqrt{\frac{1}{n} \sum_i \left(\hat{y}_i - y_i\right)^2}`,
    percentError: String.raw`\text{error} = \frac{100\%}{n} \sum_i \left| \frac{\hat{y}_i - y_i}{y_i} \right|`,
  };

  /** "XQ2 Platform" while the calculator still holds its length, then "Your ship". */
  protected highlightName(canonM: number): string {
    return canonM === XQ2.canonM ? XQ2.name : 'Your ship';
  }
}
