/** Browser-safe: no data imports. */
/** Plain refusal text, used when a section has nothing it can cite. */
export const REFUSALS = {
  notEnough:
    "We don't have cited statements or votes from at least two candidates in this race, so we can't say where they differ or agree.",
  differ: "Our records don't show a clear difference we can cite.",
  agree: "Our records don't show a point of agreement we can cite.",
  unavailable: "The AI summary isn't available right now. Below is what each candidate said, with sources, so you can compare for yourself.",
} as const;
