import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckHistory } from "@/components/site/CheckHistory";
import { Crumbs } from "@/components/site/Crumbs";
import { DirectList, orgLabel, OutsideList } from "@/components/site/FinanceLists";
import { FollowControl } from "@/components/site/FollowControl";
import { formatInstant, httpsUrl, partyCue, partyLabel } from "@/lib/format";
import { financeForCandidate, loadFinance } from "@/lib/finance/load";
import { selectDirect, selectOutside } from "@/lib/finance/present";
import { loadChecks } from "@/lib/content/store";
import { loadProfile } from "@/lib/site/contest";
import { showcaseCandidate, showcaseRace, type ShowcaseCandidate } from "@/lib/site/showcase";
import type { Filing, Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = { params: Promise<{ candidateId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = (await params).candidateId;
  const snap = showcaseCandidate(id);
  if (snap) return { title: snap.displayName };
  const loaded = await loadProfile(id);
  return { title: loaded.ok ? loaded.candidate.displayName : "Candidate" };
}

export default async function CandidatePage({ params }: PageProps) {
  const id = (await params).candidateId;
  const snap = showcaseCandidate(id);
  const loaded = await loadProfile(id);
  if (!loaded.ok && loaded.missing && !snap) notFound();
  if (!loaded.ok && !loaded.missing && !snap) {
    return (
      <article className="wrap">
        <h1>Candidate</h1>
        <p className="notice notice-error">Could not load this profile.</p>
        <Link href="/states/ky">Kentucky</Link>
      </article>
    );
  }

  const race = loaded.ok ? loaded.race : null;
  const name = snap?.displayName ?? (loaded.ok ? loaded.candidate.displayName : "Candidate");
  const party = snap?.partyLabel ?? (loaded.ok ? partyCue([partyLabel(loaded.candidate.partyAffiliation, loaded.candidate.partyLabel)]) : "");
  const stateHref = race?.state ? `/states/${race.state.toLowerCase()}` : snap ? "/states/ky" : "/states";
  const raceHref = race ? `/races/${race.raceId}` : snap ? `/races/${showcaseRace()?.raceId}` : null;
  const raceLabel = race ? shortRace(race) : snap ? "Senate" : "Race";
  const retrieved = showcaseRace()?.retrievedAt ?? null;
  const finance = financeForCandidate(await loadFinance(race?.cycle ?? 2026), id);
  const checks = await loadChecks("candidate", id);
  const direct = selectDirect(finance.direct, null);
  const outside = selectOutside(finance.outside, null);

  return (
    <article className="wrap">
      <Crumbs
        items={[
          { href: stateHref, label: "My races" },
          ...(raceHref ? [{ href: raceHref, label: raceLabel }] : []),
          { label: name },
        ]}
      />
      <h1>{name}</h1>
      <p className="lede">{party}</p>
      {race ? <p>{race.title}</p> : snap ? <p>U.S. Senate, Kentucky · 2026</p> : null}
      <div className="actions">
        {raceHref ? (
          <Link className="btn btn-navy" href={`${raceHref}/compare`}>
            Compare candidates
          </Link>
        ) : null}
        <FollowControl what="candidate" targetId={loaded.ok ? loaded.candidate.candidateId : id} />
      </div>

      <h2>Verified</h2>
      <ul className="plain-list">
        {snap?.incumbentLabel && retrieved ? (
          <Fact
            label="Running status"
            value={plainSeat(snap.incumbentLabel)}
            href={snap.profileUrl}
            source="Official candidate record"
            date={retrieved}
          />
        ) : (
          <li>
            Running status is not in this record.
          </li>
        )}
        {snap?.statusLabel && retrieved ? (
          <Fact
            label="Filing status"
            value={plainStatus(snap.statusLabel)}
            href={showcaseRace()?.dictionary ?? snap.profileUrl}
            source="Official candidate list"
            date={retrieved}
          />
        ) : null}
        {snap?.committeeName && snap.committeeUrl && retrieved ? (
          <Fact
            label="Campaign fund"
            value={orgLabel(snap.committeeName) ?? snap.committeeName}
            href={snap.committeeUrl}
            source="Official campaign record"
            date={retrieved}
          />
        ) : null}
        <FilingFacts filings={loaded.ok ? loaded.filings : []} snap={snap} />
      </ul>

      <h2>Candidate says</h2>
      {snap?.committeeWebsite && snap.committeeUrl && retrieved ? (
        <ul className="plain-list">
          <Fact
            label="Campaign site"
            value={snap.committeeWebsite}
            href={snap.committeeWebsite}
            source="Listed on the official campaign record"
            date={retrieved}
          />
        </ul>
      ) : (
        <p>
          No campaign website is on the filing.
        </p>
      )}

      <h2>Campaign finance</h2>
      {finance.notice ? <p className="notice">{finance.notice}</p> : null}
      <p>
        <Link href="/finance#direct-and-outside">Money a campaign reports is separate from money other groups spend.</Link>
      </p>
      {direct.length > 0 ? <DirectList rows={direct} /> : null}
      {outside.length > 0 ? (
        <>
          <h3>Spending by other groups</h3>
          <OutsideList rows={outside} />
        </>
      ) : null}

      <CheckHistory checks={checks} />

      <p className="hint">Biography, issue positions, and endorsements are not loaded yet.</p>
    </article>
  );
}

function Fact({
  label,
  value,
  href,
  source,
  date,
}: {
  label: string;
  value: string;
  href: string;
  source: string;
  date: string;
}) {
  const shown = formatInstant(date) ?? date.slice(0, 10);
  return (
    <li>
      <p>
        {label}: {href ? <a href={href}>{value}</a> : value}
      </p>
      <p className="hint">
        {source} · {shown}
      </p>
    </li>
  );
}

function FilingFacts({
  filings,
  snap,
}: {
  filings: Filing[];
  snap: ShowcaseCandidate | null;
}) {
  if (filings.length > 0) {
    return (
      <>
        {filings.map((filing) => {
          const href = httpsUrl(filing.sourceUrl);
          const when = formatInstant(filing.fecLoadTimestamp) ?? formatInstant(filing.updatedAt) ?? "date not stored";
          return (
            <li key={filing.filingId}>
              Statement of candidacy
              {href ? (
                <>
                  : <a href={href} title="FEC filing, Form 2">Official filing</a>
                </>
              ) : null}
              <span className="hint"> Checked {when}</span>
            </li>
          );
        })}
      </>
    );
  }
  if (snap?.filingPdf && snap.filingDate) {
    return (
      <li>
        Statement of candidacy: <a href={snap.filingPdf} title="FEC filing, Form 2">Official filing</a>
        <span className="hint"> Filed {calendarDate(snap.filingDate)}</span>
      </li>
    );
  }
  return (
    <li>
      No filing link yet.
    </li>
  );
}

function calendarDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value.slice(0, 10);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function plainSeat(label: string): string {
  if (/open seat/i.test(label)) return "No one currently holds this seat";
  if (/incumbent/i.test(label)) return "Currently holds this office";
  if (/challenger/i.test(label)) return "Running against the current officeholder";
  return label;
}

function plainStatus(label: string): string {
  if (/not yet/i.test(label)) return "Paperwork started, not finished";
  if (/future/i.test(label)) return "Filed for a later election";
  if (/prior/i.test(label)) return "Filed in an earlier election";
  if (/statutory/i.test(label)) return "Filed the required paperwork";
  return label;
}

function shortRace(race: Race): string {
  if (race.office === "senate") return "Senate";
  if (race.office === "house") {
    return race.district && race.district !== "00" ? `District ${Number(race.district)}` : "House";
  }
  return "President";
}
