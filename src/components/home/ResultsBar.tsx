import { KY_RESULTS_LINKS, kentuckyPollsClosed } from "@/lib/site/ky-results";
import { certifiedWinner, generalResult, KY_FEDERAL_RACES, shortElectionDate } from "@/lib/site/certified-results";
import { raceCardTitle } from "@/lib/site/candidate-cards";
import Link from "next/link";

const OFFICIAL = KY_RESULTS_LINKS[1];

/** Slim bar under the film. Names winners only after certification. */
export function ResultsBar({ now = new Date() }: { now?: Date }) {
  if (!kentuckyPollsClosed(now)) {
    return (
      <aside className="results-bar" aria-label="Election Day">
        <p>
          <strong>Election Day: Nov 3, 2026.</strong> Kentucky polls are open 6:00 a.m. to 6:00 p.m. local time.
        </p>
        <a href="https://www.govote.ky.gov">Find your polling place</a>
      </aside>
    );
  }
  const results = KY_FEDERAL_RACES.map(generalResult);
  const pending = results.find((result) => result?.status === "pending");
  const winners = results.flatMap((result) => {
    if (result?.status !== "certified") return [];
    const winner = certifiedWinner(result);
    return winner ? [{ raceId: result.raceId, name: winner.name }] : [];
  });
  return (
    <aside className="results-bar" aria-label="Election results">
      {winners.length > 0 ? (
        <ul className="plain-list">
          {winners.map(({ raceId, name }) => (
            <li key={raceId}><Link href={`/races/${raceId}`}>{raceCardTitle(raceId)}</Link> · {name}</li>
          ))}
        </ul>
      ) : null}
      {pending?.status === "pending" ? <p>Certification due {shortElectionDate(pending.scheduledCertificationDate)}.</p> : null}
      <a href={OFFICIAL.href}>See official results</a>
    </aside>
  );
}
