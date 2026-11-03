import type { Metadata } from "next";
import Link from "next/link";
import { KY_BALLOT_CHECKED, KY_BALLOT_SOURCES, calendarDay, kyBallot } from "@/lib/site/ky-ballot";
import { profileFor } from "@/lib/site/profiles";

export const metadata: Metadata = { title: "Candidates" };

const RACE_IDS = [
  "2026-senate-KY",
  "2026-house-KY-01",
  "2026-house-KY-02",
  "2026-house-KY-03",
  "2026-house-KY-04",
  "2026-house-KY-05",
  "2026-house-KY-06",
];

export default function CandidatesPage() {
  const races = RACE_IDS.map((id) => kyBallot(id)).filter((race) => race != null);
  return (
    <article className="wrap">
      <h1>Candidates</h1>
      <p className="lede">Kentucky federal nominees for November 3, 2026. This is not a list of every officeholder.</p>
      <h2>Who holds a Kentucky U.S. House seat now</h2>
      <ul className="plain-list">
        {races.flatMap((race) =>
          race.people
            .filter((person) => person.holdsOffice)
            .map((person) => (
              <li key={person.id}>
                <Link href={`/candidates/${person.id}`}>{person.name}</Link>
                {" · "}
                {person.party}
                {" · "}
                {titleFor(race.raceId)}
              </li>
            )),
        )}
        <li>
          <Link href="/candidates/S6KY00286">Andy Barr</Link> is listed as a Kentucky member on the Sept. 16, 2026 House roll call and is a Senate nominee, not a House nominee.{" "}
          <a href="https://clerk.house.gov/Votes/2026312">Roll call 312</a>
        </li>
      </ul>
      <p>Current U.S. senators are not covered in this directory yet. State, county, city, judicial, and school-board officeholders are not covered yet.</p>
      <p className="hint">
        House incumbents on the November list were checked {calendarDay(KY_BALLOT_CHECKED)} against{" "}
        <a href={KY_BALLOT_SOURCES[1].url}>{KY_BALLOT_SOURCES[1].name}</a>.
      </p>
      <h2>November ballot</h2>
      {races.map((race) => (
        <section key={race.raceId}>
          <h3>
            <Link href={`/races/${race.raceId}`}>{titleFor(race.raceId)}</Link>
          </h3>
          <ul className="plain-list">
            {race.people.map((person) => {
              const site = profileFor(person.id).website;
              return (
                <li key={person.id}>
                  <Link href={`/candidates/${person.id}`}>{person.name}</Link>
                  {" · "}
                  {person.party}
                  {person.holdsOffice ? " · Holds this office" : ""}
                  {person.role === "write-in" ? " · Write-in" : ""}
                  {site ? (
                    <>
                      {" · "}
                      <a href={site.url}>{site.kind === "office" ? "Official site" : "Campaign site"}</a>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p>
        <Link href="/officeholders">Officeholder page</Link>
      </p>
    </article>
  );
}

function titleFor(raceId: string): string {
  if (raceId.includes("senate")) return "U.S. Senate";
  return `U.S. House District ${Number(raceId.slice(-2))}`;
}
