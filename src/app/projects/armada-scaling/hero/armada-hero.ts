import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HERO, leaderPath } from './hero-layout';

interface Callout {
  label: string;
  text: string;
  accent?: boolean;
}

/** Why the project exists, in four steps; the last is the question the page answers. */
const CALLOUTS: readonly Callout[] = [
  {
    label: 'The game',
    text: 'Star Wars: Armada fields beautiful models, from fighters to capital ships.',
  },
  { label: 'The goal', text: 'Build custom ships that feel the right size on the table.' },
  { label: 'The station', text: "First up: the XQ2 Platform, from the '90s X-Wing games." },
  {
    label: 'The question',
    text: "No single ratio fits Armada's ships. What rule do they follow?",
    accent: true,
  },
];

const pct = (value: number, of: number) => `${(value / of) * 100}%`;

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
  /** How many ships and squadrons the data covers. */
  readonly shipCount = input.required<number>();

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

  protected readonly callouts = CALLOUTS;
}
