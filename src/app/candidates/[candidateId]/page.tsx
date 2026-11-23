import { isKentuckyFinanceRow } from "@/lib/site/ky-finance";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckHistory } from "@/components/site/CheckHistory";
import { CandidateCorrection } from "@/components/site/CandidateCorrection";
import { Crumbs } from "@/components/site/Crumbs";
import { CandidateElectionStatus } from "@/components/site/CandidateElectionStatus";
import { ElectionDayBanner } from "@/components/site/ElectionDayBanner";
import { DirectList, orgLabel, OutsideList } from "@/components/site/FinanceLists";
import { FollowControl } from "@/components/site/FollowControl";
import { RosterMoney } from "@/components/site/RosterMoney";
import { CareerTimeline, EducationList, PriorResults, SocialList, VoteList } from "@/components/site/ProfileRecords";
import { dayLabel, formatInstant, httpsUrl, partyCue, partyLabel } from "@/lib/format";
import { shortMoney } from "@/lib/finance/model";
import { loadFinance } from "@/lib/finance/load";
import { selectDirect, selectOutside } from "@/lib/finance/present";
import { loadChecks } from "@/lib/content/store";
import { loadProfile } from "@/lib/site/contest";
import { BallotBar } from "@/components/site/BallotBar";
import { CiteShare } from "@/components/site/CiteShare";
import { IssueNotes } from "@/components/site/IssueNotes";
import { OnThisPage } from "@/components/site/OnThisPage";
import { PageLinks } from "@/components/site/PageLinks";
import reading from "@/components/site/reading.module.css";
import { PersonMark } from "@/components/site/PersonMark";
import { KY_BALLOT_SOURCES, kyBallot, kyPerson } from "@/lib/site/ky-ballot";
import { newsForNames } from "@/lib/site/ky-news";
import { careerTimeline, jobLine, linkLabel, profileFor } from "@/lib/site/profiles";
import { seatStatus } from "@/lib/site/seat";
import { candidateElectionStatus, CONGRESSIONAL_TERM_START, KY_FEDERAL_RACES, KY_RESULTS_SOURCE, primaryCandidateById } from "@/lib/site/certified-results";
import { raceCardTitle } from "@/lib/site/candidate-cards";
import { filingPeriods } from "@/lib/site/fec-reports";
import { financeHeadline, sinceLastFiling } from "@/lib/site/money-status";
import { photoAttribution, portraitFor, stanceIssues, stancesFor } from "@/lib/site/stances";
import { showcaseCandidate, showcaseRace, type ShowcaseCandidate } from "@/lib/site/showcase";
import type { Filing, Race } from "@/lib/types";

export const revalidate = 3600;
export const runtime = "nodejs";

type PageProps = { params: Promise<{ candidateId: string }> };

export function generateStaticParams() {
  const ids = new Set<string>();
  for (const raceId of KY_FEDERAL_RACES) {
    for (const person of kyBallot(raceId)?.people ?? []) {
      ids.add(person.id);
      if (person.fecCandidateId) ids.add(person.fecCandidateId);
    }
  }
  return [...ids].map((candidateId) => ({ candidateId }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = (await params).candidateId;
  const alternates = { canonical: `/candidates/${encodeURIComponent(id)}` };
  const ballot = kyPerson(id);
  const primary = primaryCandidateById(id);
  if (primary && !ballot) return { alternates, title: primary.candidate.name };
  const snap = showcaseCandidate(ballot?.person.fecCandidateId ?? id);
  if (ballot) return { alternates, title: ballot.person.name };
  if (snap) return { alternates, title: snap.displayName };
  const loaded = await loadProfile(id);
  return { alternates, title: loaded.ok ? loaded.candidate.displayName : "Candidate" };
}

export default async function CandidatePage({ params }: PageProps) {
  const id = (await params).candidateId;
  const ballot = kyPerson(id);
  const primary = primaryCandidateById(id);
  if (primary && !ballot && !primary.candidate.candidateId) return <PrimaryProfile primary={primary} />;
  const snap = showcaseCandidate(ballot?.person.fecCandidateId ?? id);
  const loaded = await loadProfile(ballot?.person.fecCandidateId ?? id);
  if (!loaded.ok && primary && !ballot) return <PrimaryProfile primary={primary} />;
  if (!loaded.ok && loaded.missing && !snap && !ballot) notFound();
  if (!loaded.ok && !loaded.missing && !snap && !ballot) {
    return (
      <article className="wrap">
        <h1>Candidate</h1>
        <p className="notice notice-error">This profile is unavailable.</p>
        <Link href="/">Kentucky</Link>
      </article>
    );
  }

  const race = loaded.ok ? loaded.race : null;
  const name = ballot?.person.name ?? snap?.displayName ?? (loaded.ok ? loaded.candidate.displayName : "Candidate");
  const party = ballot?.person.party ?? snap?.partyLabel ?? (loaded.ok ? partyCue([partyLabel(loaded.candidate.partyAffiliation, loaded.candidate.partyLabel)]) : "");
  const stateHref = "/";
  const raceHref = ballot ? `/races/${ballot.race.raceId}` : race ? `/races/${race.raceId}` : snap ? `/races/${showcaseRace()?.raceId}` : null;
  const raceLabel = ballot ? shortBallot(ballot.race.raceId) : race ? shortRace(race) : snap ? "Senate" : "Race";
  const retrieved = showcaseRace()?.retrievedAt ?? null;
  const financeKey = ballot?.person.fecCandidateId ?? id;
  const [bundle, checks, news] = await Promise.all([
    loadFinance(race?.cycle ?? 2026),
    loadChecks("candidate", id),
    ballot ? newsForNames([name]) : [],
  ]);
  const storedIds = new Set([financeKey, ...(ballot?.person.alsoFecIds ?? [])]);
  const stored = bundle.direct.filter((row) => storedIds.has(row.candidateId) && isKentuckyFinanceRow(row));
  const headline = financeHeadline(stored, ballot?.person.finance ?? null);
  const direct = selectDirect(stored, null);
  const outside = selectOutside(bundle.outside.filter((row) => storedIds.has(row.candidateId) && isKentuckyFinanceRow(row)), null);
  const filingDelta = sinceLastFiling(filingPeriods(stored, financeKey));
  const profile = ballot ? profileFor(ballot.person.id) : profileFor(id);
  const timeline = careerTimeline(profile);
  const photo = portraitFor(ballot?.person.id ?? id);
  const notes = stancesFor(ballot?.person.id ?? id);

  const job = jobLine(ballot?.person.id ?? id);
  const attribution = photoAttribution(photo);
  const filings = loaded.ok ? loaded.filings : [];
  const hasVerified = filings.length > 0 || Boolean(snap?.filingPdf && snap.filingDate) ||
    Boolean(retrieved && (snap?.incumbentLabel || snap?.statusLabel || (snap?.committeeName && snap.committeeUrl)));
  const status = seatStatus({ holds: Boolean(ballot?.person.holdsOffice), writeIn: ballot?.person.role === "write-in" });
  const filedRaceId = race?.raceId ?? (snap ? showcaseRace()?.raceId : undefined);
  const electionStatus = ballot ? candidateElectionStatus(ballot.race.raceId, ballot.person) :
    primary ? candidateElectionStatus(primary.raceId, {
      id: primary.candidate.candidateId,
      name: primary.candidate.name,
      party: primary.result.party,
    }) : filedRaceId ? candidateElectionStatus(filedRaceId, { id, name, party }) : undefined;
  const officeElect = electionStatus?.elected && !ballot?.person.holdsOffice && Date.now() < Date.parse(CONGRESSIONAL_TERM_START)
    ? (ballot?.race.raceId ?? primary?.raceId)?.includes("senate") ? "Senator-elect" : "Rep.-elect"
    : null;

  const sections = [
    timeline.length > 0 ? { href: "#career", label: "Career" } : null,
    profile.education.length > 0 ? { href: "#education", label: "Education" } : null,
    profile.results.length > 0 ? { href: "#results", label: "Results" } : null,
    profile.social.length > 0 ? { href: "#social", label: "Social" } : null,
    notes.length > 0 ? { href: "#issues", label: "Issues" } : null,
    profile.endorsements.length > 0 ? { href: "#endorsements", label: "Endorsements" } : null,
    profile.votes.length > 0 ? { href: "#votes", label: "Votes" } : null,
    news.length > 0 ? { href: "#news", label: "News" } : null,
  ].filter((item): item is { href: string; label: string } => item != null);
  const updated = [profile.bio?.sourceDate, ballot ? "2026-11-03" : null].filter((value): value is string => Boolean(value)).sort().at(-1);

  return (
    <article className="wrap profile-page">
      <Crumbs
        items={[
          { href: stateHref, label: "My races" },
          ...(raceHref ? [{ href: raceHref, label: raceLabel }] : []),
          { label: name },
        ]}
      />
      <header className="profile-head">
        <figure>
          <PersonMark name={name} photo={photo?.src ?? null} party={party} size="lg" priority />
          {photo && attribution ? <figcaption>Photo: <a href={photo.sourceUrl}>{attribution}</a></figcaption> : null}
        </figure>
        <div>
          <h1>{name}</h1>
          <p className="profile-meta">{[...new Set([party, status, officeElect, race ? race.title : ballot ? ballotTitle(ballot.race.raceId) : snap ? "U.S. Senate, Kentucky · 2026" : null].filter(Boolean))].join(" · ")}</p>
          <CandidateElectionStatus status={electionStatus} />
          <dl className={reading.facts}>
            {job ? <div><dt>Current job</dt><dd>{job}{profile.bio ? <> <a href={profile.bio.sourceUrl}>Source ↗</a></> : null}</dd></div> : null}
            {headline.kind === "missing" && ballot ? <div><dt>Raised</dt><dd>No report on file</dd></div> : null}
            {headline.kind === "zero" ? <div><dt>Raised</dt><dd>Reported $0{headline.sourceUrl ? <> · <a href={headline.sourceUrl}>FEC ↗</a></> : null}</dd></div> : null}
            {headline.kind === "reported" ? <div><dt>Raised</dt><dd>{shortMoney(headline.receipts)}{headline.sourceUrl ? <> · <a href={headline.sourceUrl}>FEC ↗</a></> : null}{filingDelta ? <> · {filingDelta.amount > 0 ? `+${shortMoney(filingDelta.amount)}` : "Reported $0"} since the {dayLabel(filingDelta.since)} report</> : null}</dd></div> : null}
            {headline.kind === "reported" && headline.cash != null ? <div><dt>Cash on hand</dt><dd>{shortMoney(headline.cash)}{headline.sourceUrl ? <> · <a href={headline.sourceUrl}>FEC ↗</a></> : null}</dd></div> : null}
            {headline.kind === "filed" && headline.sourceUrl ? <div><dt>Raised</dt><dd>Report on file · <a href={headline.sourceUrl}>FEC ↗</a></dd></div> : null}
            {profile.website ? <div><dt>Site</dt><dd><a href={profile.website.url}>{linkLabel(profile.website)}</a></dd></div> : null}
          </dl>
          {raceHref ? (
            <div className="actions">
              <Link className="btn btn-navy" href={`${raceHref}/compare`}>Compare</Link>
            </div>
          ) : null}
          <div className="actions">
            <FollowControl what="candidate" targetId={ballot?.person.fecCandidateId ?? (loaded.ok ? loaded.candidate.candidateId : id)} returnPath={`/candidates/${id}`} />
            <Link className="btn btn-ghost" href="/ballot">Your ballot</Link>
          </div>
          <PageLinks raceId={ballot?.race.raceId ?? race?.raceId} candidateId={id} />
          <CiteShare title={name} path={`/candidates/${id}`} updated={updated ? dayLabel(updated) : null} />
        </div>
      </header>
      <div className={reading.withToc}>
      <OnThisPage links={sections} />
      <div className={reading.tocBody}>
      {timeline.length > 0 ? (
        <section id="career">
          <h2>Career timeline</h2>
          <CareerTimeline entries={timeline} />
        </section>
      ) : null}
      {profile.education.length > 0 ? (
        <section id="education">
          <h2>Education</h2>
          <EducationList entries={profile.education} />
        </section>
      ) : null}
      {profile.results.length > 0 ? (
        <section id="results">
          <h2>Prior election results</h2>
          <PriorResults entries={profile.results} />
        </section>
      ) : null}
      {profile.social.length > 0 ? (
        <section id="social">
          <h2>Social accounts</h2>
          <SocialList accounts={profile.social} name={name} />
        </section>
      ) : null}
      {notes.length > 0 ? (
        <section id="issues">
          <h2>Issues</h2>
          <IssueNotes notes={notes} issues={stanceIssues()} compareHref={raceHref ? `${raceHref}/compare` : undefined} />
        </section>
      ) : null}
      {profile.endorsements.length > 0 ? <>
        <h2 id="endorsements">Endorsements</h2>
        <ul className="plain-list">
          {profile.endorsements.map((item) => (
            <li key={item.sourceUrl}>
              {item.text} <a href={item.sourceUrl}>{item.sourceName}</a>
              <span className="hint"> · {dayLabel(item.sourceDate)}</span>
            </li>
          ))}
        </ul>
      </> : null}
      {profile.votes.length > 0 ? <>
        <h2 id="votes">Votes</h2>
        <VoteList entries={profile.votes} />
      </> : null}
      {news.length > 0 ? (
        <section id="news">
          <h2>News</h2>
          <ul className="plain-list">
            {news.map((story) => (
              <li key={story.url}>
                <p><a href={story.url}>{story.title}</a></p>
                <p className="hint">{story.source}{story.date ? ` · ${dayLabel(story.date)}` : ""}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <details>
        <summary>More details</summary>

      {hasVerified ? <>
      <h2>Official filings</h2>
      <ul className="plain-list">
        {snap?.incumbentLabel && retrieved ? (
          <Fact
            label="Running status"
            value={plainSeat(snap.incumbentLabel)}
            href={snap.profileUrl}
            source="Official candidate record"
            date={retrieved}
          />
        ) : null}
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
        <FilingFacts filings={filings} snap={snap} />
      </ul>
      </> : null}

      {snap?.committeeWebsite && snap.committeeUrl && retrieved ? (
        <>
      <h2>Candidate says</h2>
        <ul className="plain-list">
          <Fact
            label="Campaign site"
            value={snap.committeeWebsite}
            href={snap.committeeWebsite}
            source="Listed on the official campaign record"
            date={retrieved}
          />
        </ul>
        </>
      ) : null}

      {direct.length > 0 || outside.length > 0 || ballot?.person.finance || headline.kind === "filed" ? <h2>Campaign finance</h2> : null}
      {direct.length > 0 ? null : ballot?.person.finance ? <RosterMoney finance={ballot.person.finance} /> : null}
      {direct.length > 0 ? <DirectList rows={direct} /> : null}
      {outside.length > 0 ? (
        <>
          <h3>Spending by other groups</h3>
          <OutsideList rows={outside} />
        </>
      ) : null}

      <CheckHistory checks={checks} />

      {ballot ? (
        <p className="hint">
          Source: <a href={KY_BALLOT_SOURCES[0].url}>Kentucky Secretary of State ↗</a>
        </p>
      ) : null}
      </details>
      <CandidateCorrection candidateId={ballot?.person.id ?? id} raceId={ballot?.race.raceId ?? race?.raceId} page={`/candidates/${id}`} />
      </div>
      </div>
      {ballot ? <ElectionDayBanner compact /> : null}
      {raceHref ? (
        <BallotBar step={3} backHref={raceHref} nextHref={`${raceHref}/compare`} nextLabel="Compare candidates" nextShort="Compare" />
      ) : null}
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
  const shown = formatInstant(date) ?? dayLabel(date);
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
          const when = formatInstant(filing.fecLoadTimestamp) ?? formatInstant(filing.updatedAt);
          return (
            <li key={filing.filingId}>
              Statement of candidacy
              {href ? (
                <>
                  : <a href={href} title="FEC filing, Form 2">Official filing</a>
                </>
              ) : null}
              {when ? <span className="hint"> · {when}</span> : null}
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
        <span className="hint"> Filed {dayLabel(snap.filingDate)}</span>
      </li>
    );
  }
  return null;
}

function plainSeat(label: string): string {
  if (/open seat/i.test(label)) return "Open seat (the officeholder is not running)";
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

function ballotTitle(raceId: string): string {
  if (raceId.includes("senate")) return "U.S. Senate, Kentucky · 2026";
  const district = Number(raceId.split("-").at(-1));
  return `U.S. House, Kentucky District ${district} · 2026`;
}

function PrimaryProfile({ primary }: { primary: NonNullable<ReturnType<typeof primaryCandidateById>> }) {
  const { candidate, result, raceId } = primary;
  return (
    <article className="wrap">
      <Crumbs items={[{ href: "/candidates", label: "Candidates" }, { label: candidate.name }]} />
      <header className="profile-head">
        <PersonMark name={candidate.name} photo={null} party={result.party} size="lg" />
        <div>
          <h1>{candidate.name}</h1>
          <p className="profile-meta">{result.party} · {raceCardTitle(raceId)}</p>
          <CandidateElectionStatus status={{ primary: candidate.winner ? "won" : "lost" }} />
          <p>{candidate.votes.toLocaleString("en-US")} certified primary votes · <a href={result.sourceUrl}>{KY_RESULTS_SOURCE}</a></p>
          <Link className="action-link" href={`/races/${raceId}`}>Race details</Link>
        </div>
      </header>
    </article>
  );
}

function shortBallot(raceId: string): string {
  if (raceId.includes("senate")) return "Senate";
  const district = raceId.split("-").at(-1);
  return district ? `District ${Number(district)}` : "House";
}

function shortRace(race: Race): string {
  if (race.office === "senate") return "Senate";
  if (race.office === "house") {
    return race.district && race.district !== "00" ? `District ${Number(race.district)}` : "House";
  }
  return "President";
}
