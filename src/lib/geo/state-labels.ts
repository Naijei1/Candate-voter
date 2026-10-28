import { DC_CALLOUT } from "@/lib/geo/dc-label";

/**
 * Northeast abbreviations sit in one Atlantic column. Each leader ends on
 * its own row, to the left of every label, so a line cannot pass through
 * another abbreviation.
 * `x1`/`y1` is a point on the state. The label is `labelX`/`labelY`.
 */
export type StateCallout = {
  postal: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
};

const LABEL_X = 1004;
const LINE_X = 996;

/** Vertical step keeps a phone abbreviation off the label above it. */
const CALLOUT_STEP = 68;
const CALLOUT_TOP = 88;

export const STATE_CALLOUTS: readonly StateCallout[] = [
  { postal: "VT", x1: 868, y1: 142, x2: LINE_X, y2: CALLOUT_TOP, labelX: LABEL_X, labelY: CALLOUT_TOP },
  { postal: "NH", x1: 893, y1: 145, x2: LINE_X, y2: CALLOUT_TOP + CALLOUT_STEP, labelX: LABEL_X, labelY: CALLOUT_TOP + CALLOUT_STEP },
  { postal: "MA", x1: 900, y1: 172, x2: LINE_X, y2: CALLOUT_TOP + CALLOUT_STEP * 2, labelX: LABEL_X, labelY: CALLOUT_TOP + CALLOUT_STEP * 2 },
  { postal: "RI", x1: 898, y1: 187, x2: LINE_X, y2: CALLOUT_TOP + CALLOUT_STEP * 3, labelX: LABEL_X, labelY: CALLOUT_TOP + CALLOUT_STEP * 3 },
  { postal: "CT", x1: 882, y1: 196, x2: LINE_X, y2: CALLOUT_TOP + CALLOUT_STEP * 4, labelX: LABEL_X, labelY: CALLOUT_TOP + CALLOUT_STEP * 4 },
  { postal: "NJ", x1: 862, y1: 224, x2: LINE_X, y2: CALLOUT_TOP + CALLOUT_STEP * 5, labelX: LABEL_X, labelY: CALLOUT_TOP + CALLOUT_STEP * 5 },
  { postal: "DE", x1: 849, y1: 252, x2: LINE_X, y2: CALLOUT_TOP + CALLOUT_STEP * 6, labelX: LABEL_X, labelY: CALLOUT_TOP + CALLOUT_STEP * 6 },
  {
    postal: "DC",
    x1: DC_CALLOUT.x1,
    y1: DC_CALLOUT.y1,
    x2: DC_CALLOUT.x2,
    y2: DC_CALLOUT.y2,
    labelX: DC_CALLOUT.labelX,
    labelY: DC_CALLOUT.labelY,
  },
];

export const CALLOUT_POSTALS = new Set(STATE_CALLOUTS.map((row) => row.postal));

/** Extra viewBox width so the Atlantic callouts are not clipped. */
export const LABEL_GUTTER = 180;

/**
 * Abbreviation shifts, in viewBox units, for labels that sit on a neighbor
 * at phone size. The state shape stays put.
 */
const LABEL_NUDGE: Readonly<Record<string, { dx: number; dy: number }>> = {
  KY: { dx: -13, dy: 2 },
  TN: { dx: -7, dy: 17 },
  VA: { dx: 10, dy: 1 },
  NC: { dx: 16, dy: 13 },
  SC: { dx: -6, dy: 6 },
  MD: { dx: 9, dy: -11 },
  PA: { dx: -16, dy: 5 },
  FL: { dx: 8, dy: 14 },
  /* Southeast stack and Ohio/West Virginia were sitting on each other at phone size. */
  MS: { dx: -15, dy: 1 },
  AL: { dx: 22, dy: 4 },
  GA: { dx: 38, dy: 20 },
  OH: { dx: 2, dy: -40 },
  WV: { dx: -17, dy: 15 },
};

export function labelPoint(postal: string, x: number, y: number): { x: number; y: number } {
  const nudge = LABEL_NUDGE[postal];
  if (!nudge) return { x, y };
  return { x: x + nudge.dx, y: y + nudge.dy };
}
