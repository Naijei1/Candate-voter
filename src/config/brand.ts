/**
 * Home hero words. Change these when the team picks a slogan.
 * The subline is the current site wording, not a new slogan.
 */
export const homeHero = {
  headline: "Vote.",
  subline: "Your elections. All in one place.",
} as const;

/**
 * Politician clips stay empty until the team names who to include.
 * Each entry needs a file, a credit, a source URL, and who approved it.
 */
export const heroClips: readonly {
  src: string;
  credit: string;
  sourceUrl: string;
  approvedBy: string;
}[] = [];
