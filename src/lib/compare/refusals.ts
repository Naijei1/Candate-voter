/** Browser-safe: no data imports. */
/** Plain refusal text, used when a section has nothing it can cite. */
export const REFUSALS = {
  notEnough:
    "Too few sourced positions to compare.",
  topic: "The records don’t support a comparison on this issue.",
  differ: "No clear difference found.",
  agree: "No agreement found.",
} as const;
