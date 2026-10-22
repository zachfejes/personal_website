import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TunerPanel } from '../../dev/tuner/tuner-panel';
import { Schema, Settings } from '../../dev/tuner/tuning';
import { RevealDirective } from '../../shared/reveal.directive';
import {
  LOG_FIT,
  LOG_PERCENT_ERROR,
  LOG_RMSE,
  PLANNED_POINTS,
  POWER_FIT,
  POWER_PERCENT_ERROR,
  POWER_RMSE,
  predictModelMm,
} from './analysis';
import { ScaleCalculator } from './calculator';
import { DESIGN, DESIGN_SCHEMA, Design } from './design';
import { FitLine, NamedPoint, ScaleChart } from './scale-chart/scale-chart';
import { MEASUREMENT_SOURCES, SHIPS, XQ2 } from './ships';
import { Tex } from './tex';
import { signedTerm } from './tex-format';

/** Coefficients as published: a and b to 2–3 significant decimals. */
const COEFFICIENT_DECIMALS = { a: 2, b: 3, rmse: 1, percent: 1 } as const;
const fixed = (value: number, decimals: number) => value.toFixed(decimals);

/**
 * Armada Scaling: working out the non-linear model scale in Star Wars: Armada. First written in
 * 2018; the fits, numbers and charts here are computed from the data, not copied.
 */
@Component({
  selector: 'app-armada-scaling-page',
  imports: [RevealDirective, ScaleCalculator, ScaleChart, Tex, TunerPanel],
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
      { id: 'power', label: 'Power fit', color: chart.powerColor, predict: POWER_FIT.predict },
      { id: 'log', label: 'Logarithmic fit', color: chart.logColor, predict: LOG_FIT.predict },
    ];
  });

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
    shipCount: SHIPS.length,
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
  };

  /** "XQ2 Platform" while the calculator still holds its length, then "Your ship". */
  protected highlightName(canonM: number): string {
    return canonM === XQ2.canonM ? XQ2.name : 'Your ship';
  }
}
