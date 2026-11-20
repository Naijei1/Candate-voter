/**
 * Product chrome only. Mission, biography, ownership, funding, affiliations,
 * editorial standards, corrections policy, and contact method are stored in
 * DynamoDB. Empty fields are hidden on public pages.
 */

export const brand = {
  name: "THE VOTE",
  shortName: "THE VOTE",
  description: "Find and compare candidates in Kentucky’s federal elections.",
  headline: "Kentucky’s federal elections.",
  lede: "Find a contest. Compare candidates.",
  heroImageAlt: "",
  founderName: "Luke Wyatt",
  founderRole: "Founder",
} as const;
