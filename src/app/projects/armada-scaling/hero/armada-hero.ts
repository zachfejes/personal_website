import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HERO, leaderPath } from './hero-layout';

/** What the hero's callouts say about the XQ2, all worked out from the data. */
export interface HeroFacts {
  /** How many ships and squadrons the data covers. */
  shipCount: number;
  canonM: number;
  /** Predicted model length, rounded. */
  modelMm: number;
  /** Canon ÷ model length, rounded, e.g. 6200 for 1 : 6,200. */
  scale: number;
  /** The measured ship closest to it in canon length. */
  nearest: { name: string; canonM: number } | null;
  /** A familiar small ship and its scale, for contrast. */
  fighter: { name: string; scale: number } | null;
}

interface Callout {
  label: string;
  /** Set in the accent color, before the rest of the text. */
  lead?: string;
  text: string;
  accent?: boolean;
}

const pct = (value: number, of: number) => `${(value / of) * 100}%`;
const grouped = (value: number) => value.toLocaleString('en');

/**
 * The top of the Armada page, drawn like a sheet: title between rules, then the XQ2's top-view
 * wireframe centred on construction rings and crosshairs, with four numbered callouts on leader
 * lines. On phones the callouts become numbered markers on the drawing, listed underneath.
 */
@Component({
  selector: 'app-armada-hero',
  templateUrl: './armada-hero.html',
  styleUrl: './armada-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArmadaHero {
  readonly facts = input.required<HeroFacts>();

  protected readonly hero = HERO;
  protected readonly viewBox = `0 0 ${HERO.stage.width} ${HERO.stage.height}`;

  /** The wireframe placed so its hub sits on the rings' centre, as fractions of the stage. */
  protected readonly art = (() => {
    const { art, hub, stage } = HERO;
    const scale = art.width / art.imageWidth;
    return {
      left: pct(hub.x - art.hubX * scale, stage.width),
      top: pct(hub.y - art.hubY * scale, stage.height),
      width: pct(art.width, stage.width),
    };
  })();

  protected readonly crosshairs = (() => {
    const { hub, crosshair } = HERO;
    return {
      vertical: { x: hub.x, y1: hub.y - crosshair.up, y2: hub.y + crosshair.down },
      horizontal: { y: hub.y, x1: hub.x - crosshair.across, x2: hub.x + crosshair.across },
    };
  })();

  protected readonly orbitMarker = { x: HERO.hub.x + HERO.dashedRing, y: HERO.hub.y };

  protected readonly placements = HERO.callouts.map((c, i) => ({
    ...c,
    number: String(i + 1).padStart(2, '0'),
    leader: leaderPath(c),
    style: {
      left: pct(c.at.x, HERO.stage.width),
      top: pct(c.at.y, HERO.stage.height),
      width: pct(HERO.callout.width, HERO.stage.width),
    },
  }));

  protected readonly callouts = computed((): Callout[] => {
    const f = this.facts();
    const nearest = f.nearest
      ? `: close to the ${f.nearest.name} (${grouped(f.nearest.canonM)} m)`
      : '';
    const fighter = f.fighter
      ? ` A ${f.fighter.name} is closer to 1 : ${grouped(f.fighter.scale)}.`
      : '';
    return [
      { label: 'Canon length', text: `${grouped(f.canonM)} m, end to end${nearest}.` },
      {
        label: 'Model length',
        lead: `≈ ${f.modelMm} mm`,
        text: ' on the table, from the fit worked out below.',
        accent: true,
      },
      { label: 'Scale', text: `About 1 : ${grouped(f.scale)}.${fighter}` },
      {
        label: 'The question',
        text: "No single ratio fits Armada's ships. What rule do they follow?",
      },
    ];
  });
}
