/** A point on the hero's drawing, in its own units (see HERO.stage). */
export interface StagePoint {
  x: number;
  y: number;
}

/** A callout box on the drawing and the spot on the station it points at. */
export interface CalloutPlacement {
  /** Top-left corner of the box. */
  at: StagePoint;
  /** Where its leader line ends (and, on phones, where its numbered marker sits). */
  target: StagePoint;
}

/**
 * The hero drawing, laid out once in fixed units and scaled to fit: the station's hub sits on the
 * centre of the construction rings, and the callouts stand off to either side.
 */
export const HERO = {
  stage: { width: 1200, height: 760 },
  hub: { x: 600, y: 330 },
  /** The top-view wireframe: its width on the stage, and where its hub is in the image's pixels. */
  art: { width: 520, imageWidth: 593, imageHeight: 540, hubX: 298, hubY: 229 },
  /** Construction rings around the hub; the dashed one carries the amber marker. */
  rings: [180, 250, 330, 420],
  dashedRing: 330,
  /** How far the crosshairs reach from the hub. */
  crosshair: { up: 440, down: 440, across: 480 },
  callout: { width: 250, anchorDrop: 30, shelf: 90 },
  callouts: [
    { at: { x: 0, y: 100 }, target: { x: 440, y: 190 } },
    { at: { x: 950, y: 70 }, target: { x: 780, y: 170 } },
    // Scale points at the amber marker on the dashed ring.
    { at: { x: 950, y: 430 }, target: { x: 930, y: 330 } },
    // The question points at the lower fin.
    { at: { x: 0, y: 430 }, target: { x: 515, y: 540 } },
  ] satisfies CalloutPlacement[],
} as const;

/**
 * The leader line from a callout to its target: out from the side of the box facing the drawing,
 * level for a short shelf, then straight to the target. Boxes left of the hub lead from their right
 * edge, boxes right of it from their left edge.
 */
export function leaderPath(
  callout: CalloutPlacement,
  hub: StagePoint = HERO.hub,
  { width, anchorDrop, shelf }: { width: number; anchorDrop: number; shelf: number } = HERO.callout,
): string {
  const fromLeft = callout.at.x < hub.x;
  const startX = fromLeft ? callout.at.x + width : callout.at.x;
  const y = callout.at.y + anchorDrop;
  const shelfX = fromLeft
    ? Math.min(startX + shelf, callout.target.x)
    : Math.max(startX - shelf, callout.target.x);
  return `M${startX} ${y} H${shelfX} L${callout.target.x} ${callout.target.y}`;
}
