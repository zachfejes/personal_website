import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The top of the Armada page: title between rules, what the project is, and the station drawing. */
@Component({
  selector: 'app-armada-hero',
  templateUrl: './armada-hero.html',
  styleUrl: './armada-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArmadaHero {
  /** How many ships and squadrons the data covers. */
  readonly shipCount = input.required<number>();
}
