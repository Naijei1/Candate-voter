import type { Metadata } from "next";
import Link from "next/link";
import { CONGRESSIONAL_TERM_START, KY_RESULTS_SOURCE } from "@/lib/site/certified-results";
import { currentKentuckyOfficeholders, kentuckyElectionSuccessors, KY_CONGRESSIONAL_ROSTER_SOURCE } from "@/lib/site/ky-officeholders";

export const metadata: Metadata = { alternates: { canonical: "/officeholders" }, title: "Who holds office now" };
export const revalidate = 3600;

export default function OfficeholdersPage() {
  const now = new Date();
  const members = currentKentuckyOfficeholders(now);
  const successors = kentuckyElectionSuccessors();
  const termStarted = now.getTime() >= Date.parse(CONGRESSIONAL_TERM_START);
  const incoming = successors.filter((row) => !row.continuing);
  return (
    <article className="wrap">
      <h1>Who holds office now</h1>
      <p className="lede">Kentucky’s U.S. senators and representatives.</p>
      {(["senate", "house"] as const).map((office) => (
        <section key={office}>
          <h2>{office === "senate" ? "U.S. Senate" : "U.S. House"}</h2>
          <ul className="plain-list">
            {members.filter((member) => member.office === office).map((member) => (
              <li key={member.bioguide}>
                <a href={member.url}>{member.name}</a> · {member.party}{member.district ? ` · District ${member.district}` : ""}
              </li>
            ))}
            {termStarted ? successors.filter((row) => (row.district ? "house" : "senate") === office).map((row) => (
              <li key={row.raceId}>
                <Link href={row.person ? `/candidates/${row.person.id}` : `/races/${row.raceId}`}>{row.winner.name}</Link>
                {row.winner.party || row.person ? ` · ${row.winner.party ?? row.person?.party}` : null}
                {row.district ? ` · District ${row.district}` : null} · <a href={row.sourceUrl}>{KY_RESULTS_SOURCE}</a>
              </li>
            )) : null}
          </ul>
        </section>
      ))}
      <p className="hint"><a href={KY_CONGRESSIONAL_ROSTER_SOURCE}>Congress Legislators roster</a></p>
      {!termStarted && incoming.length > 0 ? (
        <section>
          <h2>Incoming members</h2>
          <ul className="plain-list">
            {incoming.map((row) => (
              <li key={row.raceId}>
                <Link href={row.person ? `/candidates/${row.person.id}` : `/races/${row.raceId}`}>{row.winner.name}</Link>
                {row.district ? ` · Rep.-elect, District ${row.district}` : " · Senator-elect"} · <a href={row.sourceUrl}>{KY_RESULTS_SOURCE}</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p><Link className="btn btn-navy" href="/candidates">Candidates</Link></p>
    </article>
  );
}
