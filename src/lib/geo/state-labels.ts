import { DC_CALLOUT } from "@/lib/geo/dc-label";

/**
 * Northeast abbreviations are a few pixels wide on a phone, so they sit on
 * leaders in the Atlantic instead of stacking on the state borders.
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

const COLUMN_A = 984;
const COLUMN_B = 1064;

export const STATE_CALLOUTS: readonly StateCallout[] = [
  { postal: "VT", x1: 868, y1: 142, x2: COLUMN_A - 8, y2: 118, labelX: COLUMN_A, labelY: 118 },
  { postal: "NH", x1: 893, y1: 145, x2: COLUMN_B - 8, y2: 118, labelX: COLUMN_B, labelY: 118 },
  { postal: "MA", x1: 900, y1: 172, x2: COLUMN_A - 8, y2: 172, labelX: COLUMN_A, labelY: 172 },
  { postal: "RI", x1: 898, y1: 187, x2: COLUMN_B - 8, y2: 172, labelX: COLUMN_B, labelY: 172 },
  { postal: "CT", x1: 882, y1: 196, x2: COLUMN_A - 8, y2: 226, labelX: COLUMN_A, labelY: 226 },
  { postal: "NJ", x1: 862, y1: 224, x2: COLUMN_B - 8, y2: 226, labelX: COLUMN_B, labelY: 226 },
  { postal: "DE", x1: 849, y1: 252, x2: COLUMN_A - 8, y2: 280, labelX: COLUMN_A, labelY: 280 },
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
