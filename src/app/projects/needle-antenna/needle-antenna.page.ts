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
import { ChartSeries, LineChart } from './line-chart';
import { NeedleStrip } from './needle-strip';
import { Complex, abs, instant } from './physics/complex';
import { DEFAULT_PARAMS, MATERIAL_PRESETS, NeedleParams } from './physics/model';
import { C0, SweepPoint, solve, sweep } from './physics/solver';
import { PolarPattern } from './polar-pattern';

const AMBER = '#e3a857';
const TEAL = '#6cc3c9';
const ROSE = '#e0705a';
const PAPER = '#ece5d6';
/** Seconds per RF cycle in the animation. */
const CYCLE_SECONDS = 3;
const SWEEP_POINTS = 90;

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
    return {
      wavelength: si(s.wavelength, 'm'),
      electricalLength: num(g.length / s.wavelength),
      quarterWave: si(C0 / Math.sqrt(s.params.medium.relPermittivity) / (4 * g.length), 'Hz'),
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
      peakField: si(s.peakSurfaceField.value, 'V/m'),
      peakFieldAt: `${mm(s.peakSurfaceField.z)} mm`,
      directivity: `${num(10 * Math.log10(s.farField.directivity))} dBi`,
      tMax: `${num(kelvinToCelsius(tMaxK))} °C`,
      tRise: si(tMaxK - s.params.medium.ambientTemperature, 'K'),
      melts: tMaxK >= s.params.material.meltingPoint,
      meltingPoint: `${num(kelvinToCelsius(s.params.material.meltingPoint))} °C`,
      // Rough vacuum breakdown / field emission threshold at a sharp metal tip.
      emission: s.peakSurfaceField.value > 3e9,
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
  /** Both arms, the other arm below the gap (negative heights). */
  protected readonly antennaDomain = computed(() => {
    const L = this.params().geometry.length * 1e3;
    return [-L, L] as const;
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
      { label: 'Joule heat', x: f, y: pts.map((p) => p.ohmic), color: ROSE },
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

    // Frequency sweep: everything but the frequency (and phase) as set, computed in slices.
    effect((onCleanup) => {
      const p = this.params();
      if (!browser) return;
      const fq = C0 / Math.sqrt(p.medium.relPermittivity) / (4 * p.geometry.length);
      const fMin = Math.min(0.1 * fq, p.drive.frequency / 1.5);
      const fMax = Math.max(5 * fq, p.drive.frequency * 1.5);
      const base = { ...p, drive: { ...p.drive, phaseDeg: 0 } };
      const out: SweepPoint[] = [];
      let n = 0;
      let timer = 0;
      const step = () => {
        const until = performance.now() + 10;
        while (n < SWEEP_POINTS && performance.now() < until) {
          const f = fMin * Math.pow(fMax / fMin, n / (SWEEP_POINTS - 1));
          out.push(...sweep(base, f, f, 1));
          n++;
        }
        if (n < SWEEP_POINTS) timer = window.setTimeout(step, 0);
        else this.sweepPoints.set(out);
      };
      timer = window.setTimeout(step, 120);
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
    this.params.update((p) => ({ ...p, medium: { ...p.medium, feedHeatSunk: on } }));
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
