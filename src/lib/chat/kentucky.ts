import { kyBallot } from "../site/ky-ballot";
import { KY_RESULTS_LINKS } from "../site/ky-results";
import type { ChatAnswer } from "./types";

/** Names on the November Kentucky ballot. Does not declare a winner. */
export function kentuckyRunningAnswer(message: string): ChatAnswer | null {
  if (!/\brunning\b|\bon the ballot\b|\bnominees?\b/i.test(message)) return null;
  const district = /\bdistrict\s+0?([1-6])\b/i.exec(message);
  const senate = /\bsenate\b/i.test(message) && !district;
  const raceId = district ? `2026-house-KY-0${district[1]}` : senate ? "2026-senate-KY" : null;
  if (!raceId) return null;
  const race = kyBallot(raceId);
  if (!race) return null;
  const title = district ? `U.S. House District ${Number(district[1])}` : "U.S. Senate";
  const lines = race.people.map((person) => `- **${person.name}** (${person.party})`);
  const results = KY_RESULTS_LINKS[1];
  return {
    answer_markdown: [
      `**${title}, Kentucky.** People on the November 3, 2026 list:`,
      lines.join("\n"),
      `Results: see the official count. [State Board of Elections](${results.href}). This is not a winner.`,
    ].join("\n\n"),
    sources: [{ title: "Kentucky Secretary of State filing list", url: "https://web.sos.ky.gov/candidatefilings/Default.aspx?id=3", as_of: "2026-11-03" }],
    refused: false,
    mode: "factual",
  };
}
