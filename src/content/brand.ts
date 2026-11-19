/**
 * Product chrome only. Mission, biography, ownership, funding, affiliations,
 * editorial standards, corrections policy, and contact method are stored in
 * DynamoDB and fall back to "Awaiting content". Do not invent that copy here.
 */

export const brand = {
  name: "THE VOTE",
  shortName: "THE VOTE",
  description: "Kentucky elections in plain language: find your races, compare candidates, and see the source of each fact.",
  headline: "Your elections. All in one place.",
  lede: "Find a contest. Compare candidates.",
  heroImageAlt: "Placeholder for an approved civic photograph. No image is available yet.",
  founderName: "Luke Wyatt",
  founderRole: "Founder",
} as const;
