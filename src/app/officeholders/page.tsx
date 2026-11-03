import type { Metadata } from "next";
import Link from "next/link";
import { KY_BALLOT_CHECKED, KY_BALLOT_SOURCES, calendarDay, kyBallot } from "@/lib/site/ky-ballot";

export const metadata: Metadata = { title: "Who holds office now" };

export default function OfficeholdersPage() {
  const house = ["01", "02", "03", "04", "05", "06"].map((district) => kyBallot(`2026-house-KY-${district}`));
  return (
    <article className="wrap">
      <h1>Who holds office now</h1>
      <p className="lede">Kentucky U.S. House members who are also on the November ballot, plus one House member running for Senate.</p>
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
          <Link href="/candidates/S6KY00286">Andy Barr</Link>, Republican, was listed as a Kentucky House member on{" "}
          <a href="https://clerk.house.gov/Votes/2026312">roll call 312, Sept. 16, 2026</a>. He is not on the House ballot.
        </li>
      </ul>
      <p>District 4 has no current member on the November ballot. Thomas Massie lost the primary.</p>
      <p>Current U.S. senators are not covered yet. State and local officeholders are not covered yet.</p>
      <p className="hint">
        Checked {calendarDay(KY_BALLOT_CHECKED)}. <a href={KY_BALLOT_SOURCES[1].url}>Clerk nominee list</a>
      </p>
      <p>
        <Link className="btn btn-navy" href="/candidates">
          November nominees
        </Link>
      </p>
    </article>
  );
}
