import type { Metadata } from "next";
import Link from "next/link";
import { KY_BALLOT_SOURCES, kyBallot } from "@/lib/site/ky-ballot";

export const metadata: Metadata = { alternates: { canonical: "/officeholders" }, title: "Who holds office now" };

export default function OfficeholdersPage() {
  const house = ["01", "02", "03", "04", "05", "06"].map((district) => kyBallot(`2026-house-KY-${district}`));
  return (
    <article className="wrap">
      <h1>Who holds office now</h1>
      <p className="lede">Kentucky U.S. House members on the November ballot.</p>
      <ul className="plain-list">
        {house.flatMap((race) =>
          (race?.people ?? [])
            .filter((person) => person.holdsOffice)
            .map((person) => (
              <li key={person.id}>
                <Link href={`/candidates/${person.id}`}>{person.name}</Link>
                {" · "}
                {person.party}
                {" · "}
                District {Number(race?.raceId.slice(-2))}
              </li>
            )),
        )}
        <li>
          <Link href="/candidates/S6KY00286">Andy Barr</Link> (R) — U.S. Representative, running for Senate. <a href="https://clerk.house.gov/Votes/2026312">Source ↗</a>
        </li>
      </ul>
      <p>Thomas Massie lost the District 4 primary.</p>
      <p className="hint">
        Source: <a href={KY_BALLOT_SOURCES[1].url}>Clerk of the House ↗</a>
      </p>
      <p>
        <Link className="btn btn-navy" href="/candidates">
          November nominees
        </Link>
      </p>
    </article>
  );
}
