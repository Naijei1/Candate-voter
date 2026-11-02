export const MEASURE_KINDS = [
  { id: "proposition", label: "Proposition" },
  { id: "referendum", label: "Referendum" },
  { id: "retention", label: "Retention question" },
] as const;

export type MeasureKind = (typeof MEASURE_KINDS)[number]["id"];
