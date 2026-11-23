import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EMBER } from './colormap';
import {
  CONTROL_GROUPS,
  ParamControl,
  SLIDER_STEPS,
  fromSlider,
  getParam,
  setParam,
  toSlider,
} from './controls';
import { FIELD_QUANTITIES, FIELD_VIEWS, FieldMap, FieldQuantity, FieldView } from './field-map';
import { impedance, kelvinToCelsius, num, percent, si } from './format';
import { ChartRegion, ChartSeries, LineChart } from './line-chart';
import { NeedleStrip } from './needle-strip';
import { Complex, abs, instant } from './physics/complex';
import { DEFAULT_PARAMS, MATERIAL_PRESETS, NeedleParams } from './physics/model';
import { MEDIUM_LABELS } from './physics/media';
import { slicePattern } from './physics/pattern';
import { C0, SweepPoint, solve, sweep } from './physics/solver';
import { PolarPattern } from './polar-pattern';
import { sweepPasses } from './sweep-plan';

const AMBER = '#e3a857';
const TEAL = '#6cc3c9';
const ROSE = '#e0705a';
const PAPER = '#ece5d6';
const WATER = '#5aa0d2';
const OIL = '#e3a857';
/** Seconds per RF cycle in the animation. */
const CYCLE_SECONDS = 3;
/** The first sweep pass has this many log-spaced steps; each later pass halves them. */
const SWEEP_FIRST_INTERVALS = 12;
/** Passes in total: 13, then 25, 49 and finally 97 frequencies. */
const SWEEP_PASSES = 4;

const mm = (v: number) => num(v * 1e3);

@Component({
  selector: 'app-needle-antenna-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FieldMap, LineChart, NeedleStrip, PolarPattern],
  templateUrl: './needle-antenna.page.html',
  styleUrl: './needle-antenna.page.scss',
})
export class NeedleAntennaPage {
  protected readonly groups = CONTROL_GROUPS;
  protected readonly presets = MATERIAL_PRESETS;
  protected readonly views = FIELD_VIEWS;
  protected readonly quantities = FIELD_QUANTITIES;
  protected readonly sliderSteps = SLIDER_STEPS;
  protected readonly ember = EMBER;
  protected readonly si = si;
  protected readonly num = num;
  protected readonly mm = mm;

  protected readonly params = signal<NeedleParams>(DEFAULT_PARAMS);
  protected readonly presetId = signal<string>(MATERIAL_PRESETS[0].id);
  protected readonly view = signal<FieldView>('antenna');
  protected readonly quantity = signal<FieldQuantity>('e');
  protected readonly showLines = signal(true);
  protected readonly playing = signal(false);
  /** ωt, radians. */
  protected readonly wt = signal(0);
  protected readonly sweepPoints = signal<SweepPoint[]>([]);
  /** How many sweep frequencies are done, of how many in the final pass. */
  protected readonly sweepProgress = signal({ points: 0, total: 0 });
  /**
   * What the sweep depends on: the parameters without the phase (which only moves the time
   * origin) or the frequency (which the sweep varies), plus the range to sweep, which only
   * follows the frequency when it strays outside the default span. Compared by value, so
   * dragging the phase or picking a frequency on the chart doesn't restart it.
   */
  private readonly sweepParams = computed(
    () => {
      const p = this.params();
      // The half-wave frequency of the whole antenna.
      const fq = C0 / (2 * p.geometry.length);
      return {
        params: { ...p, drive: { ...p.drive, phaseDeg: 0, frequency: 0 } },
        fMin: Math.min(0.1 * fq, p.drive.frequency / 1.5),
        fMax: Math.max(5 * fq, p.drive.frequency * 1.5),
      };
    },
    { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );

  protected readonly sol = computed(() => solve(this.params()));

  protected readonly phaseDeg = computed(() => Math.round(((this.wt() * 180) / Math.PI) % 360));

  /** The headline numbers. */
  protected readonly readouts = computed(() => {
    const s = this.sol();
    const g = s.params.geometry;
    const shaft = s.shaft;
    const [needle, other] = s.arms;
    const tipV = abs(needle.voltage[needle.voltage.length - 1]);
    const otherV = abs(other.voltage[other.voltage.length - 1]);
    const tMaxK = Math.max(needle.thermal.maxTemperature, other.thermal.maxTemperature);
    const layered = s.layers.interfaces.length > 0;
    const peak = s.peakSurfaceField.reduce((a, b) => (b.value > a.value ? b : a));
    const airIndex = s.layers.media.indexOf('air');
    const liquid = s.power.byMedium
      .filter((m) => m.medium === 'oil' || m.medium === 'water')
      .reduce((sum, m) => sum + m.radiated + m.dielectric, 0);
    return {
      wavelength: si(s.wavelength, 'm'),
      electricalLength: num(g.length / s.wavelength),
      halfWave: si(C0 / (2 * g.length), 'Hz'),
      armLengths: `${mm(needle.profile.length)} / ${mm(other.profile.length)} mm`,
      feedOffset: `${mm(needle.profile.length - g.length / 2)} mm`,
      zin: impedance(s.inputImpedance),
      zinMag: si(abs(s.inputImpedance), 'Ω'),
      zSource: impedance(s.sourceImpedance),
      baseCurrent: si(abs(s.gapCurrent), 'A'),
      gapVoltage: si(abs(s.gapVoltage), 'V'),
      tipVoltage: si(tipV, 'V'),
      otherEndVoltage: si(otherV, 'V'),
      zNeedle: impedance(needle.impedance),
      zOther: impedance(other.impedance),
      sourceCurrent: si(abs(s.sourceCurrent), 'A'),
      pSource: si(s.power.source, 'W'),
      pRad: si(s.power.radiated, 'W'),
      pOhmic: si(s.power.ohmic, 'W'),
      pOhmicNeedle: si(needle.ohmic, 'W'),
      pOhmicOther: si(other.ohmic, 'W'),
      tNeedle: `${num(kelvinToCelsius(needle.thermal.maxTemperature))} °C`,
      tOther: `${num(kelvinToCelsius(other.thermal.maxTemperature))} °C`,
      pFeed: si(s.power.feed, 'W'),
      efficiency: percent(s.efficiency),
      rRad: si(s.radiationResistance, 'Ω'),
      rLoss: si(s.lossResistance, 'Ω'),
      skinDepth: si(s.skinDepth, 'm'),
      skinRatio: num(s.params.geometry.radius / s.skinDepth),
      rPerM: si(shaft.resistance, 'Ω/m'),
      xIntPerM: si(s.omega * shaft.internalInductance, 'Ω/m'),
      lPerM: si(shaft.inductance, 'H/m'),
      cPerM: si(shaft.capacitance, 'F/m'),
      z0: si(shaft.z0, 'Ω'),
      endCap: si(needle.capCapacitance, 'F'),
      otherCap: si(other.capCapacitance, 'F'),
      coneAngle: `${num((2 * s.profile.halfAngle * 180) / Math.PI)}°`,
      peakField: si(peak.value, 'V/m'),
      peakFieldAt: `${mm(peak.z)} mm`,
      peakFields: s.layers.media.map((m, l) => ({
        medium: MEDIUM_LABELS[m],
        value: s.peakSurfaceField[l].value > 0 ? si(s.peakSurfaceField[l].value, 'V/m') : '—',
      })),
      directivity: layered ? '—' : `${num(10 * Math.log10(s.farField.directivity))} dBi`,
      layered,
      media: s.layers.media.map((m, l) => ({
        medium: MEDIUM_LABELS[m],
        eps: impedance(s.layers.eps[l]).replace(' Ω', ''),
        radiated: si(s.power.byMedium[l].radiated, 'W'),
        dielectric: si(s.power.byMedium[l].dielectric, 'W'),
        lossy: s.layers.eps[l].im < 0,
      })),
      pDielectric: si(s.power.dielectric, 'W'),
      pLiquid: si(liquid, 'W'),
      pRadAir: si(layered ? s.power.byMedium[0].radiated : s.power.radiated, 'W'),
      // Corona onset at a sharp point in air at 1 atm starts around a few MV/m.
      airBreakdown: airIndex >= 0 && s.peakSurfaceField[airIndex].value > 3e6,
      airPeak: airIndex >= 0 ? si(s.peakSurfaceField[airIndex].value, 'V/m') : '',
      tMax: `${num(kelvinToCelsius(tMaxK))} °C`,
      tRise: si(tMaxK - s.params.environment.ambientTemperature, 'K'),
      melts: tMaxK >= s.params.material.meltingPoint,
      meltingPoint: `${num(kelvinToCelsius(s.params.material.meltingPoint))} °C`,
      // Rough vacuum breakdown / field emission threshold at a sharp metal tip.
      emission: s.params.environment.kind === 'vacuum' && peak.value > 3e9,
      converged: s.convergence.change < 1e-3,
    };
  });

  /**
   * Values along the whole antenna, tip of the other arm (negative heights) to the needle's apex.
   * The potential jumps across the gap at z = 0 by the gap voltage.
   */
  private readonly along = computed(() => {
    const [needle, other] = this.sol().arms;
    const join = <T>(lower: readonly T[], upper: readonly T[]) => [
      ...[...lower].reverse(),
      ...upper,
    ];
    const samples = join(other.samples, needle.samples);
    return {
      z: join(other.z, needle.z).map((z) => z * 1e3),
      voltage: join(other.voltage, needle.voltage),
      current: join(other.current, needle.current),
      sampleZ: samples.map((q) => q.z * 1e3),
      samples,
      temperatureZ: join(
        other.thermal.nodes.map((n) => -n * 1e3),
        needle.thermal.nodes.map((n) => n * 1e3),
      ),
      temperature: join(other.thermal.temperature, needle.thermal.temperature),
    };
  });
  /**
   * Which medium each stretch of the antenna sits in, as shaded bands for the charts: positions
   * along the antenna (mm), the rounded end negative and the point positive.
   */
  protected readonly regions = computed<ChartRegion[]>(() => {
    const s = this.sol();
    if (!s.layers.interfaces.length) return [];
    const spans: { from: number; to: number; layer: number }[] = [];
    for (const arm of s.arms) {
      arm.intervalLayers.forEach((layer, i) => {
        const a = arm.direction * arm.nodes[i] * 1e3;
        const b = arm.direction * arm.nodes[i + 1] * 1e3;
        spans.push({ from: Math.min(a, b), to: Math.max(a, b), layer });
      });
      // The cap.
      const a = arm.direction * arm.nodes[arm.nodes.length - 1] * 1e3;
      const b = arm.direction * arm.profile.length * 1e3;
      spans.push({ from: Math.min(a, b), to: Math.max(a, b), layer: arm.capLayer });
    }
    spans.sort((x, y) => x.from - y.from);
    const merged: typeof spans = [];
    for (const sp of spans) {
      const last = merged.at(-1);
      if (last?.layer === sp.layer && sp.from - last.to < 1e-6) last.to = sp.to;
      else merged.push({ ...sp });
    }
    return merged
      .filter((m) => s.layers.media[m.layer] !== 'air')
      .map((m) => ({
        from: m.from,
        to: m.to,
        label: MEDIUM_LABELS[s.layers.media[m.layer]],
        color: s.layers.media[m.layer] === 'water' ? WATER : OIL,
      }));
  });

  /** The far-field pattern in the plane of the antenna and the surface normal. */
  protected readonly pattern = computed(() => slicePattern(this.sol()));
  protected readonly patternAxis = computed(() => this.sol().placement.axis);

  /** Both arms, the other arm below the gap (negative heights). */
  protected readonly antennaDomain = computed(() => {
    const [needle, other] = this.sol().arms;
    return [-other.profile.length * 1e3, needle.profile.length * 1e3] as const;
  });

  /** A wave along the antenna: the instantaneous value, with its ± envelope as a band. */
  private wave(
    z: readonly number[],
    phasors: readonly Complex[],
    label: string,
    color: string,
  ): ChartSeries[] {
    const wt = this.wt();
    const amp = phasors.map(abs);
    return [
      {
        label: `${label}(z, t)`,
        x: z,
        y: phasors.map((v) => instant(v, wt)),
        color,
        band: { lower: amp.map((a) => -a), upper: amp },
      },
      { label: `|${label}(z)|`, x: z, y: amp, color, dash: '3 3' },
    ];
  }

  protected readonly currentSeries = computed(() =>
    this.wave(this.along().z, this.along().current, 'I', AMBER),
  );
  protected readonly voltageSeries = computed(() =>
    this.wave(this.along().z, this.along().voltage, 'V', TEAL),
  );
  protected readonly chargeSeries = computed(() =>
    this.wave(
      this.along().sampleZ,
      this.along().samples.map((q) => q.lineCharge),
      'λ',
      PAPER,
    ),
  );

  protected readonly heatSeries = computed<ChartSeries[]>(() => [
    {
      label: 'Joule heat',
      x: this.along().sampleZ,
      y: this.along().samples.map((q) => q.heat),
      color: ROSE,
    },
  ]);

  protected readonly heatValues = computed(() => this.along().samples.map((q) => q.heat));
  protected readonly sampleZ = computed(() => this.along().samples.map((q) => q.z));

  protected readonly temperatureSeries = computed<ChartSeries[]>(() => [
    {
      label: 'Temperature',
      x: this.along().temperatureZ,
      y: this.along().temperature.map(kelvinToCelsius),
      color: AMBER,
    },
  ]);

  protected readonly impedanceSeries = computed<ChartSeries[]>(() => {
    const pts = this.sweepPoints();
    const f = pts.map((p) => p.frequency);
    return [
      { label: 'R_in', x: f, y: pts.map((p) => p.inputImpedance.re), color: AMBER },
      { label: 'X_in', x: f, y: pts.map((p) => p.inputImpedance.im), color: TEAL },
    ];
  });

  protected readonly powerSeries = computed<ChartSeries[]>(() => {
    const pts = this.sweepPoints();
    const f = pts.map((p) => p.frequency);
    return [
      { label: 'Radiated', x: f, y: pts.map((p) => p.radiated), color: AMBER },
      { label: 'Joule heat (metal)', x: f, y: pts.map((p) => p.ohmic), color: ROSE },
      ...(this.params().environment.kind === 'layered'
        ? [
            {
              label: 'Near-field heating (liquid)',
              x: f,
              y: pts.map((p) => p.dielectric),
              color: WATER,
            },
          ]
        : []),
    ];
  });

  /** Clamp the impedance chart so the huge reactance near DC doesn't flatten the resonances. */
  protected readonly impedanceDomain = computed(() => {
    const pts = this.sweepPoints();
    const r = Math.max(...pts.map((p) => p.inputImpedance.re), 100);
    const lim = Math.min(r * 1.2, 5000);
    return [-lim, lim] as const;
  });

  protected readonly formatHz = (v: number) => si(v, 'Hz', 2);
  protected readonly formatOhm = (v: number) => si(v, 'Ω', 2);
  protected readonly formatW = (v: number) => si(v, 'W', 2);
  protected readonly formatA = (v: number) => si(v, 'A', 2);
  protected readonly formatV = (v: number) => si(v, 'V', 2);
  protected readonly formatC = (v: number) => si(v, 'C/m', 2);
  protected readonly formatWm = (v: number) => si(v, 'W/m', 2);
  protected readonly formatDegC = (v: number) => `${num(v)} °C`;
  protected readonly formatMm = (v: number) => `${num(v)} mm`;

  constructor() {
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) this.playing.set(true);
      let frame = 0;
      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (this.playing())
          this.wt.set((this.wt() + (2 * Math.PI * dt) / CYCLE_SECONDS) % (2 * Math.PI));
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      destroyRef.onDestroy(() => cancelAnimationFrame(frame));
    });

    // Frequency sweep, refined in passes: a coarse sweep appears almost at once, then each
    // pass fills in the midpoints and the charts update. Computed in short slices so the page
    // stays responsive; a parameter change restarts it, keeping the old curves until the new
    // first pass is ready.
    effect((onCleanup) => {
      const { params: p, fMin, fMax } = this.sweepParams();
      if (!browser) return;
      const passes = sweepPasses(fMin, fMax, SWEEP_FIRST_INTERVALS, SWEEP_PASSES);
      const total = passes.reduce((n, pass) => n + pass.length, 0);
      const done: SweepPoint[] = [];
      let pass = 0;
      let index = 0;
      let timer = 0;
      const step = () => {
        const until = performance.now() + 10;
        while (pass < passes.length && performance.now() < until) {
          const f = passes[pass][index];
          done.push(...sweep(p, f, f, 1));
          index++;
          if (index === passes[pass].length) {
            // A pass is complete: publish everything so far, in frequency order.
            this.sweepPoints.set([...done].sort((x, y) => x.frequency - y.frequency));
            this.sweepProgress.set({ points: done.length, total });
            pass++;
            index = 0;
          }
        }
        if (pass < passes.length) timer = window.setTimeout(step, 0);
      };
      this.sweepProgress.set({ points: 0, total });
      timer = window.setTimeout(step, 60);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected value(c: ParamControl): number {
    return getParam(this.params(), c.path);
  }

  protected display(c: ParamControl): string {
    return num(this.value(c) / c.factor, 4);
  }

  protected sliderPosition(c: ParamControl): number {
    return toSlider(c, this.params(), this.value(c));
  }

  protected onSlider(c: ParamControl, event: Event): void {
    const position = Number((event.target as HTMLInputElement).value);
    this.update(c, fromSlider(c, this.params(), position));
  }

  protected onNumber(c: ParamControl, event: Event): void {
    const input = event.target as HTMLInputElement;
    const v = Number(input.value.replace('−', '-'));
    if (!Number.isFinite(v)) {
      input.value = this.display(c);
      return;
    }
    const p = this.params();
    const clamped = Math.min(c.max(p), Math.max(c.min(p), v * c.factor));
    this.update(c, clamped);
    input.value = this.display(c);
  }

  private update(c: ParamControl, value: number): void {
    this.params.update((p) => setParam(p, c.path, value));
    if (c.path.startsWith('material.')) this.presetId.set('custom');
  }

  protected onPreset(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const preset = MATERIAL_PRESETS.find((m) => m.id === id);
    this.presetId.set(id);
    if (preset) this.params.update((p) => ({ ...p, material: preset.material }));
  }

  protected onPickFrequency(f: number): void {
    this.params.update((p) => setParam(p, 'drive.frequency', +f.toPrecision(3)));
  }

  protected onScrub(event: Event): void {
    this.playing.set(false);
    this.wt.set((Number((event.target as HTMLInputElement).value) * Math.PI) / 180);
  }

  protected onMirrorPointed(event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.params.update((p) => ({ ...p, geometry: { ...p.geometry, mirrorPointed: on } }));
  }

  protected onHeatSink(event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.params.update((p) => ({ ...p, environment: { ...p.environment, feedHeatSunk: on } }));
  }

  protected onEnvironmentKind(event: Event): void {
    const kind = (event.target as HTMLSelectElement).value as NeedleParams['environment']['kind'];
    this.params.update((p) => ({ ...p, environment: { ...p.environment, kind } }));
    if (kind !== 'layered') {
      if (this.view() === 'entry') this.view.set('antenna');
      if (this.quantity() === 'heat') this.quantity.set('e');
    }
  }

  protected readonly layered = computed(() => this.params().environment.kind === 'layered');
  protected readonly visibleViews = computed(() =>
    FIELD_VIEWS.filter((v) => !v.layeredOnly || this.layered()),
  );
  protected readonly visibleQuantities = computed(() =>
    FIELD_QUANTITIES.filter((q) => !q.layeredOnly || this.layered()),
  );
  protected shown(c: ParamControl): boolean {
    return !c.layeredOnly || this.layered();
  }

  protected reset(): void {
    this.params.set(DEFAULT_PARAMS);
    this.presetId.set(MATERIAL_PRESETS[0].id);
  }

  protected tuneToResonance(): void {
    // Find the first zero crossing of X_in (− to +) in the sweep and refine it by bisection.
    const pts = this.sweepPoints();
    for (let i = 1; i < pts.length; i++) {
      if (pts[i - 1].inputImpedance.im < 0 && pts[i].inputImpedance.im >= 0) {
        let lo = pts[i - 1].frequency;
        let hi = pts[i].frequency;
        for (let k = 0; k < 30; k++) {
          const mid = Math.sqrt(lo * hi);
          const x = sweep(this.params(), mid, mid, 1)[0].inputImpedance.im;
          if (x < 0) lo = mid;
          else hi = mid;
        }
        this.onPickFrequency(Math.sqrt(lo * hi));
        return;
      }
    }
  }
}
