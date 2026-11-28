import winners from "../../../data/ky-2026-general-winners.json";
import headlines from "../../../data/ky-result-headlines.json";

/**
 * The one switch for election outcomes. `display` in
 * data/ky-2026-general-winners.json turns winners on or off.
 * When true, pages show a "Won" label and result headlines. Never numbers.
 */
export const RESULTS_VISIBLE: boolean = winners.display === true;

export type ResultsOptions = { visible?: boolean };

function visible(options?: ResultsOptions): boolean {
  return options?.visible ?? RESULTS_VISIBLE;
}

function tokens(name: string): string[] {
  return name.toLowerCase().replace(/"[^"]*"/g, " ").replace(/[^a-z ]/g, " ").split(/\s+/).filter((word) => word.length > 1);
}

/** True when `name` won `raceId` and results are visible. */
export function isWinner(raceId: string, name: string, options?: ResultsOptions): boolean {
  if (!visible(options)) return false;
  const row = winners.winners.find((winner) => winner.raceId === raceId);
  if (!row) return false;
  const want = tokens(row.name);
  const have = tokens(name);
  return want.length > 0 && want.every((word) => have.includes(word));
}

export function winnerName(raceId: string, options?: ResultsOptions): string | null {
  if (!visible(options)) return null;
  return winners.winners.find((winner) => winner.raceId === raceId)?.name ?? null;
}

export const RESULTS_SOURCE = { url: winners.sourceUrl, label: winners.sourceLabel } as const;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
}

const LISTED = new Set(headlines.items.map((item) => normalize(item.title)));

/** Wording that reports who won. Catches new feed items the list has not seen. */
const REVEALING = /\b(rep\.?-elect|senator-elect|congressman-elect|congresswoman-elect|wins?|won|winner|victor(?:y|ies|ious)|defeats?|defeated|unseats?|flips?|flipped|concedes?|conceded|re-?elected|elected|cruise to|blue wave|red wave|blue splash|landslide)\b/i;

/** True when a headline would reveal results that are not yet visible. */
export function hidesHeadline(title: string, options?: ResultsOptions): boolean {
  if (visible(options)) return false;
  return LISTED.has(normalize(title)) || REVEALING.test(title);
}

export function visibleNews<T extends { title: string }>(items: readonly T[], options?: ResultsOptions): T[] {
  return items.filter((item) => !hidesHeadline(item.title, options));
}
