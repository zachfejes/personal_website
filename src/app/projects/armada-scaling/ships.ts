/** A ship with its length in canon and its model's measured length in Star Wars: Armada. */
export interface Ship {
  name: string;
  /** Canon length, m. */
  canonM: number;
  /** Armada model length, mm. */
  modelMm: number;
}

/** A ship I'd like to model: canon length only; its model size comes from the fit. */
export interface PlannedShip {
  name: string;
  canonM: number;
}

/**
 * Armada's ships and squadrons, measured by Rune Taq on the Fantasy Flight Games forum (2018).
 * The data behind every fit on the page.
 */
export const SHIPS: readonly Ship[] = [
  { name: 'GR75', canonM: 90, modelMm: 41.64 },
  { name: 'Gozanti', canonM: 63.8, modelMm: 36.71 },
  { name: 'CR90', canonM: 150, modelMm: 57.62 },
  { name: 'Raider', canonM: 150, modelMm: 57.81 },
  { name: 'Arquitens', canonM: 250, modelMm: 73.03 },
  { name: 'Pelta', canonM: 282, modelMm: 79.38 },
  { name: 'Nebulon-B', canonM: 300, modelMm: 91.15 },
  { name: 'Gladiator', canonM: 500, modelMm: 90.88 },
  { name: 'MC30c', canonM: 580, modelMm: 110.64 },
  { name: 'Assault Frigate Mk II', canonM: 700, modelMm: 120 },
  { name: 'Victory Star Destroyer', canonM: 900, modelMm: 137.39 },
  { name: 'Interdictor', canonM: 1100, modelMm: 160 },
  { name: 'MC80 Liberty', canonM: 1200, modelMm: 176 },
  { name: 'MC80', canonM: 1200, modelMm: 185 },
  { name: 'Imperial Star Destroyer', canonM: 1600, modelMm: 207 },
  { name: 'X-wing', canonM: 12.5, modelMm: 14 },
  { name: 'TIE Fighter', canonM: 6.3, modelMm: 7 },
  { name: 'TIE Interceptor', canonM: 6.6, modelMm: 12 },
];

/** The XQ2 Platform that started it all (canon length from Wookieepedia). */
export const XQ2: PlannedShip = { name: 'XQ2 Platform', canonM: 884 };

/** Ships I'd like to design, sized by the power fit. */
export const PLANNED_SHIPS: readonly PlannedShip[] = [
  XQ2,
  { name: 'Consular Cruiser', canonM: 115 },
  { name: 'Naboo Royal Cruiser', canonM: 76 },
  { name: 'Providence', canonM: 1088 },
  { name: 'MC40a', canonM: 550 },
];
