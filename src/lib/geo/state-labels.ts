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

export const STATE_CALLOUTS: readonly StateCallout[] = [
  { postal: "VT", x1: 868, y1: 142, x2: LINE_X, y2: 100, labelX: LABEL_X, labelY: 100 },
  { postal: "NH", x1: 893, y1: 145, x2: LINE_X, y2: 158, labelX: LABEL_X, labelY: 158 },
  { postal: "MA", x1: 900, y1: 172, x2: LINE_X, y2: 216, labelX: LABEL_X, labelY: 216 },
  { postal: "RI", x1: 898, y1: 187, x2: LINE_X, y2: 274, labelX: LABEL_X, labelY: 274 },
  { postal: "CT", x1: 882, y1: 196, x2: LINE_X, y2: 332, labelX: LABEL_X, labelY: 332 },
  { postal: "NJ", x1: 862, y1: 224, x2: LINE_X, y2: 390, labelX: LABEL_X, labelY: 390 },
  { postal: "DE", x1: 849, y1: 252, x2: LINE_X, y2: 448, labelX: LABEL_X, labelY: 448 },
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
