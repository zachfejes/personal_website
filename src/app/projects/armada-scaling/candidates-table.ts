import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tex } from './tex';

/** One candidate form as the table shows it: errors already formatted as percentages. */
export interface CandidateRow {
  id: string;
  name: string;
  /** TeX for the general form. */
  formula: string;
  parameters: number;
  inSample: string;
  leaveOneOut: string;
  /** Ships given a model length of zero or less. */
  impossible: number;
}

/** The candidate forms side by side, with the power law (the one used) picked out. */
@Component({
  selector: 'app-candidates-table',
  imports: [Tex],
  templateUrl: './candidates-table.html',
  styleUrl: './candidates-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidatesTable {
  readonly rows = input.required<readonly CandidateRow[]>();
}
