import { currentUser } from "@/lib/auth/session";
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
import { CareerTimeline, EducationList, PriorResults, RecordSource, VoteList } from "@/components/site/ProfileRecords";
import { dayLabel, formatInstant, httpsUrl, partyCue, partyLabel } from "@/lib/format";
import { formatMoney } from "@/lib/finance/model";
import { financeForCandidate, loadFinance } from "@/lib/finance/load";
import { selectDirect, selectOutside } from "@/lib/finance/present";
import { loadChecks } from "@/lib/content/store";
import { loadProfile } from "@/lib/site/contest";
import { BallotBar } from "@/components/site/BallotBar";
import { PersonMark } from "@/components/site/PersonMark";
import { KY_BALLOT_SOURCES, kyPerson } from "@/lib/site/ky-ballot";
import { newsForNames } from "@/lib/site/ky-news";
import { careerTimeline, jobLine, linkLabel, profileFor } from "@/lib/site/profiles";
import { seatStatus } from "@/lib/site/seat";
import { candidateElectionStatus, CONGRESSIONAL_TERM_START, KY_RESULTS_SOURCE, primaryCandidateById } from "@/lib/site/certified-results";
import { raceCardTitle } from "@/lib/site/candidate-cards";
import { photoAttribution, portraitFor, stanceIssues, stancesFor } from "@/lib/site/stances";
import { showcaseCandidate, showcaseRace, type ShowcaseCandidate } from "@/lib/site/showcase";
import type { Filing, Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = { params: Promise<{ candidateId: string }> };

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
  const finance = financeForCandidate(bundle, financeKey);
  const direct = selectDirect(finance.direct.filter(isKentuckyFinanceRow), null);
  const outside = selectOutside(finance.outside.filter(isKentuckyFinanceRow), null);
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

  return (
    <article className="wrap">
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
          <div className="actions">
            {raceHref ? (
              <Link className="btn btn-navy" href={`${raceHref}/compare`}>
                Compare
              </Link>
            ) : null}
            <FollowControl signedIn={Boolean(await currentUser())} what="candidate" targetId={ballot?.person.fecCandidateId ?? (loaded.ok ? loaded.candidate.candidateId : id)} returnPath={`/candidates/${id}`} />
            <Link className="btn btn-ghost" href="/ballot">
              Your ballot
            </Link>
          </div>
        </div>
      </header>
      <div className="fact-grid">
        {job ? <div><p className="hint">Current job</p><p>{job}{profile.bio ? <> · <a href={profile.bio.sourceUrl}>Source ↗</a></> : null}</p></div> : null}
        {ballot?.person.finance ? (
        <div>
          <p className="hint">Campaign finance</p>
          <p>
            {formatMoney(ballot.person.finance.receipts)} raised{ballot.person.finance.cash != null ? ` · ${formatMoney(ballot.person.finance.cash)} cash on hand` : ""} · <a href={ballot.person.finance.sourceUrl}>FEC</a>
          </p>
        </div>
        ) : null}
        {profile.website ? <div>
          <p className="hint">Site</p>
          <p><a href={profile.website.url}>{linkLabel(profile.website)}</a></p>
        </div> : null}
      </div>
      {timeline.length > 0 ? (
        <section>
          <h2>Career timeline</h2>
          <CareerTimeline entries={timeline} />
        </section>
      ) : null}
      {profile.education.length > 0 ? (
        <section>
          <h2>Education</h2>
          <EducationList entries={profile.education} />
        </section>
      ) : null}
      {profile.results.length > 0 ? (
        <section>
          <h2>Prior election results</h2>
          <PriorResults entries={profile.results} />
        </section>
      ) : null}
      {profile.social.length > 0 ? (
        <section>
          <h2>Social accounts</h2>
          <ul className="plain-list">
            {profile.social.map((account) => {
              const label = `${account.platform} · ${account.kind === "office" ? "Official" : "Campaign"}`;
              return (
                <li key={account.url}>
                  <a href={account.url} aria-label={`${label} · ${name}`}>{label}</a>
                  <RecordSource source={account} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {notes.length > 0 ? <>
      <h2>Issues</h2>
      <table className="stance-table">
        <thead>
          <tr>
            <th>Issue</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody>
          {stanceIssues().map((issue) => {
            const stance = notes.find((row) => row.issueId === issue.id);
            if (!stance) return null;
            return (
              <tr key={issue.id}>
                <th scope="row">{issue.label}</th>
                <td>
                      {stance.text} <a href={stance.sourceUrl}>{stance.sourceName}</a>
                      <span className="hint"> · {dayLabel(stance.sourceDate)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </> : null}
      {profile.endorsements.length > 0 ? <>
        <h2>Endorsements</h2>
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
        <h2>Votes</h2>
        <VoteList entries={profile.votes} />
      </> : null}
      {news.length > 0 ? (
        <section>
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

      {direct.length > 0 || outside.length > 0 || ballot?.person.finance ? <h2>Campaign finance</h2> : null}
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
      <CandidateCorrection candidateId={ballot?.person.id ?? id} raceId={ballot?.race.raceId ?? race?.raceId} />
      {ballot ? <ElectionDayBanner compact /> : null}
      {raceHref ? (
        <BallotBar place="candidate" backHref={raceHref} nextHref={`${raceHref}/compare`} nextLabel="Compare candidates" />
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
