import { kyBallot } from "../site/ky-ballot";
import { mentionedHouseDistrict, stateConfig } from "../states";
import type { ChatAnswer } from "./types";

const LONG_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

function electionDayLabel(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return LONG_DATE.format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}

/** Names on the November ballot for the enabled state. Does not declare a winner. */
export function kentuckyRunningAnswer(message: string, { districtOnly = false } = {}): ChatAnswer | null {
  if (!/\brunning\b|\bon the ballot\b|\bnominees?\b/i.test(message)) return null;
  const state = stateConfig();
  const district = mentionedHouseDistrict(message, state);
  const senate = !districtOnly && /\bsenate\b/i.test(message) && !district;
  const raceId = district
    ? `${state.cycle}-house-${state.code}-${district.padStart(2, "0")}`
    : senate
      ? `${state.cycle}-senate-${state.code}`
      : null;
  if (!raceId) return null;
  const race = kyBallot(raceId);
  if (!race) return null;
  const title = district ? `U.S. House District ${Number(district)}` : "U.S. Senate";
  const lines = race.people.map((person) => `- **${person.name}** (${person.party})`);
  return {
    answer_markdown: [
      `**${title}, ${state.name}.** People on the ${electionDayLabel(state.generalElection)} list:`,
      lines.join("\n"),
      `[See official results](${state.results.official.href}).`,
    ].join("\n\n"),
    sources: [{ title: `${state.filings.name} filing list`, url: state.filings.href, as_of: state.generalElection }],
    refused: false,
    mode: "factual",
  };
}
