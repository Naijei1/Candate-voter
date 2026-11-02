import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckHistory } from "@/components/site/CheckHistory";
import { Crumbs } from "@/components/site/Crumbs";
import { DirectList, OutsideList } from "@/components/site/FinanceLists";
import { FollowControl } from "@/components/site/FollowControl";
import { StatusMark } from "@/components/site/StatusMark";
import { stateName } from "@/lib/data/states";
import { formatInstant, httpsUrl, partyCue, partyLabel } from "@/lib/format";
import { financeForCandidate, loadFinance } from "@/lib/finance/load";
import { selectDirect, selectOutside } from "@/lib/finance/present";
import { loadChecks } from "@/lib/content/store";
import { loadProfile } from "@/lib/site/contest";
import { showcaseCandidate, showcaseRace, type ShowcaseCandidate } from "@/lib/site/showcase";
import type { Filing, Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AWAITING = ["Biography", "Issues", "Public service", "Endorsements", "Speeches"] as const;

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
  const place = race?.state ? stateName(race.state) : snap ? "Kentucky" : "States";
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
          { href: "/", label: "Home" },
          { href: stateHref, label: place },
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
            Compare
          </Link>
        ) : null}
        <FollowControl what="candidate" targetId={loaded.ok ? loaded.candidate.candidateId : id} />
      </div>

      <h2>Verified</h2>
      <ul className="plain-list">
        {snap?.incumbentLabel && retrieved ? (
          <Fact
            label="Incumbency"
            value={snap.incumbentLabel}
            href={snap.profileUrl}
            source="FEC candidate record"
            date={retrieved}
          />
        ) : (
          <li>
            Incumbency <StatusMark kind="awaiting" />
          </li>
        )}
        {snap?.statusLabel && retrieved ? (
          <Fact
            label="FEC status"
            value={snap.statusLabel}
            href={showcaseRace()?.dictionary ?? snap.profileUrl}
            source="FEC candidate master dictionary"
            date={retrieved}
          />
        ) : null}
        {snap?.committeeName && snap.committeeUrl && retrieved ? (
          <Fact
            label="Committee"
            value={snap.committeeName}
            href={snap.committeeUrl}
            source="FEC committee record"
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
            source="Reported on the FEC committee record"
            date={retrieved}
          />
        </ul>
      ) : (
        <p>
          <StatusMark kind="awaiting" /> No campaign statement is on file.
        </p>
      )}

      <h2>Campaign finance</h2>
      {finance.notice ? <p className="notice">{finance.notice}</p> : null}
      <p>
        <Link href="/finance#direct-and-outside">Direct money and outside spending are not added together.</Link>
      </p>
      {direct.length === 0 && outside.length === 0 ? <p>No FEC totals stored for this candidate.</p> : null}
      {direct.length > 0 ? <DirectList rows={direct} /> : null}
      {outside.length > 0 ? (
        <>
          <h3>Outside spending</h3>
          <OutsideList rows={outside} />
        </>
      ) : null}

      <CheckHistory checks={checks} />

      <h2>Not on file</h2>
      <p>
        {AWAITING.map((item) => (
          <span key={item}>
            <StatusMark kind="awaiting" /> {item}{" "}
          </span>
        ))}
      </p>
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
      {label}: {href ? <a href={href}>{value}</a> : value}
      <span className="hint"> {source} · {shown}</span>
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
              Form 2
              {href ? (
                <>
                  : <a href={href}>FEC filing</a>
                </>
              ) : null}
              <span className="hint"> FEC load · {when}</span>
            </li>
          );
        })}
      </>
    );
  }
  if (snap?.filingPdf && snap.filingDate) {
    return (
      <li>
        Form 2: <a href={snap.filingPdf}>FEC filing</a>
        <span className="hint"> FEC receipt · {snap.filingDate.slice(0, 10)}</span>
      </li>
    );
  }
  return (
    <li>
      Form 2 <StatusMark kind="awaiting" />
    </li>
  );
}

function shortRace(race: Race): string {
  if (race.office === "senate") return "Senate";
  if (race.office === "house") {
    return race.district && race.district !== "00" ? `District ${Number(race.district)}` : "House";
  }
  return "President";
}
