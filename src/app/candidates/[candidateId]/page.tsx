import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs } from "@/components/site/Crumbs";
import { FollowControl } from "@/components/site/FollowControl";
import { StatusMark } from "@/components/site/StatusMark";
import { stateName } from "@/lib/data/states";
import { formatInstant, httpsUrl, partyCue, partyLabel } from "@/lib/format";
import { loadProfile } from "@/lib/site/contest";
import type { Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = { params: Promise<{ candidateId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const loaded = await loadProfile((await params).candidateId);
  return { title: loaded.ok ? loaded.candidate.displayName : "Candidate" };
}

export default async function CandidatePage({ params }: PageProps) {
  const loaded = await loadProfile((await params).candidateId);
  if (!loaded.ok) {
    if (loaded.missing) notFound();
    return (
      <article className="wrap">
        <h1>Candidate</h1>
        <p className="notice notice-error">Could not load this profile.</p>
        <Link href="/states/ky">Kentucky</Link>
      </article>
    );
  }

  const { candidate, race, filings } = loaded;
  const website = httpsUrl(candidate.sourceUrl);
  const place = race?.state ? stateName(race.state) : "States";
  const stateHref = race?.state ? `/states/${race.state.toLowerCase()}` : "/states";

  return (
    <article className="wrap">
      <Crumbs
        items={[
          { href: "/", label: "Home" },
          { href: stateHref, label: place },
          ...(race ? [{ href: `/races/${race.raceId}`, label: shortRace(race) }] : []),
          { label: candidate.displayName },
        ]}
      />
      <h1>{candidate.displayName}</h1>
      <p className="lede">{partyCue([partyLabel(candidate.partyAffiliation, candidate.partyLabel)])}</p>
      <p>{race ? race.title : "Race not loaded."}</p>
      <p className="hint">
        <StatusMark kind="awaiting" hint="No approved photo." /> No photo
        {" · "}
        {website ? <a href={website}>Website</a> : "Website not verified"}
      </p>
      <div className="actions">
        {race ? (
          <Link className="btn btn-navy" href={`/races/${race.raceId}/compare`}>
            Compare
          </Link>
        ) : null}
        <FollowControl what="candidate" />
      </div>

      <h2>Voting record</h2>
      <p>Not in this record.</p>

      <h2 id="filings-heading">Filings</h2>
      {filings.length === 0 ? (
        <p>None stored.</p>
      ) : (
        <ul className="plain-list">
          {filings.map((filing) => {
            const href = httpsUrl(filing.sourceUrl);
            const when = formatInstant(filing.updatedAt);
            return (
              <li key={filing.filingId}>
                Form 2{href ? <> · <a href={href}>Document</a></> : null}
                {when ? ` · ${when}` : null}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function shortRace(race: Race): string {
  if (race.office === "senate") return "Senate";
  if (race.office === "house") {
    return race.district && race.district !== "00" ? `District ${Number(race.district)}` : "House";
  }
  return "President";
}
