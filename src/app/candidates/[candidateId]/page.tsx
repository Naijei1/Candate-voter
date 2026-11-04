import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckHistory } from "@/components/site/CheckHistory";
import { Crumbs } from "@/components/site/Crumbs";
import { ElectionDayBanner } from "@/components/site/ElectionDayBanner";
import { DirectList, orgLabel, OutsideList } from "@/components/site/FinanceLists";
import { FollowControl } from "@/components/site/FollowControl";
import { RosterMoney } from "@/components/site/RosterMoney";
import { formatInstant, httpsUrl, partyCue, partyLabel } from "@/lib/format";
import { formatMoney } from "@/lib/finance/model";
import { financeForCandidate, loadFinance } from "@/lib/finance/load";
import { selectDirect, selectOutside } from "@/lib/finance/present";
import { loadChecks } from "@/lib/content/store";
import { loadProfile } from "@/lib/site/contest";
import { BallotBar } from "@/components/site/BallotBar";
import { partyMark, PersonMark } from "@/components/site/PersonMark";
import { KY_BALLOT_CHECKED, calendarDay, kyPerson } from "@/lib/site/ky-ballot";
import { jobLine, linkLabel, profileFor } from "@/lib/site/profiles";
import { portraitFor, stanceIssues, stancesFor } from "@/lib/site/stances";
import { showcaseCandidate, showcaseRace, type ShowcaseCandidate } from "@/lib/site/showcase";
import type { Filing, Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = { params: Promise<{ candidateId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = (await params).candidateId;
  const ballot = kyPerson(id);
  const snap = showcaseCandidate(ballot?.person.fecCandidateId ?? id);
  if (ballot) return { title: ballot.person.name };
  if (snap) return { title: snap.displayName };
  const loaded = await loadProfile(id);
  return { title: loaded.ok ? loaded.candidate.displayName : "Candidate" };
}

export default async function CandidatePage({ params }: PageProps) {
  const id = (await params).candidateId;
  const ballot = kyPerson(id);
  const snap = showcaseCandidate(ballot?.person.fecCandidateId ?? id);
  const loaded = await loadProfile(ballot?.person.fecCandidateId ?? id);
  if (!loaded.ok && loaded.missing && !snap && !ballot) notFound();
  if (!loaded.ok && !loaded.missing && !snap && !ballot) {
    return (
      <article className="wrap">
        <h1>Candidate</h1>
        <p className="notice notice-error">Could not load this profile.</p>
        <Link href="/states/ky">Kentucky</Link>
      </article>
    );
  }

  const race = loaded.ok ? loaded.race : null;
  const name = ballot?.person.name ?? snap?.displayName ?? (loaded.ok ? loaded.candidate.displayName : "Candidate");
  const party = ballot?.person.party ?? snap?.partyLabel ?? (loaded.ok ? partyCue([partyLabel(loaded.candidate.partyAffiliation, loaded.candidate.partyLabel)]) : "");
  const stateHref = race?.state ? `/states/${race.state.toLowerCase()}` : ballot || snap ? "/states/ky" : "/states";
  const raceHref = ballot ? `/races/${ballot.race.raceId}` : race ? `/races/${race.raceId}` : snap ? `/races/${showcaseRace()?.raceId}` : null;
  const raceLabel = ballot ? shortBallot(ballot.race.raceId) : race ? shortRace(race) : snap ? "Senate" : "Race";
  const retrieved = showcaseRace()?.retrievedAt ?? null;
  const financeKey = ballot?.person.fecCandidateId ?? id;
  const finance = financeForCandidate(await loadFinance(race?.cycle ?? 2026), financeKey);
  const checks = await loadChecks("candidate", id);
  const direct = selectDirect(finance.direct, null);
  const outside = selectOutside(finance.outside, null);
  const profile = ballot ? profileFor(ballot.person.id) : profileFor(id);
  const photo = portraitFor(ballot?.person.id ?? id);
  const notes = stancesFor(ballot?.person.id ?? id);

  return (
    <article className="wrap">
      <Crumbs
        items={[
          { href: stateHref, label: "My races" },
          ...(raceHref ? [{ href: raceHref, label: raceLabel }] : []),
          { label: name },
        ]}
      />
      <PersonMark name={name} photo={photo?.src ?? null} party={party} size="lg" />
      {photo ? (
        <p className="hint">
          {photo.credit}
          {photo.sourceUrl ? <> · <a href={photo.sourceUrl}>Photo source</a></> : null}
        </p>
      ) : null}
      <h1>{name}</h1>
      <p className="lede">{partyMark(party).letter} · {party || "Party not listed"} · {ballot?.person.holdsOffice ? "Incumbent" : ballot?.person.role === "write-in" ? "Write-in" : "Challenger"}</p>
      <p>{race ? race.title : ballot ? ballotTitle(ballot.race.raceId) : snap ? "U.S. Senate, Kentucky · 2026" : "Office not listed"}</p>
      {ballot ? <ElectionDayBanner /> : null}
      <div className="actions sticky-mobile">
        {raceHref ? (
          <Link className="btn btn-navy" href={`${raceHref}/compare`}>
            Compare
          </Link>
        ) : null}
        <Link className="btn btn-ghost" href="/">
          Your ballot
        </Link>
      </div>
      <div className="fact-grid">
        <div>
          <p className="hint">Current job</p>
          <p>{jobLine(ballot?.person.id ?? id) ?? "Not stored"}</p>
        </div>
        <div>
          <p className="hint">Lives in</p>
          <p>Not stored</p>
        </div>
        <div>
          <p className="hint">Raised / Cash on hand</p>
          <p>
            {ballot?.person.finance ? `${formatMoney(ballot.person.finance.receipts)} raised · ${formatMoney(ballot.person.finance.cash)} cash` : "Not stored"}
          </p>
          {ballot?.person.finance && ballot.person.finance.receipts > 0 && ballot.person.finance.cash != null ? (
            <div className="cash-bar" aria-hidden="true">
              <span style={{ width: `${Math.min(100, Math.round((ballot.person.finance.cash / ballot.person.finance.receipts) * 100))}%` }} />
            </div>
          ) : null}
        </div>
        <div>
          <p className="hint">Campaign or official site</p>
          {profile.website ? <p><a href={profile.website.url}>{linkLabel(profile.website)}</a></p> : <p>Not stored</p>}
        </div>
      </div>
      {profile.bio ? (
        <p>
          {profile.bio.text}{" "}
          <a href={profile.bio.sourceUrl}>{profile.bio.sourceName}</a>
          <span className="hint"> · {profile.bio.sourceDate}</span>
        </p>
      ) : (
        <p>No short biography is stored.</p>
      )}
      <h2>Issue notes</h2>
      <table className="stance-table">
        <thead>
          <tr>
            <th>Issue</th>
            <th>What is on file</th>
          </tr>
        </thead>
        <tbody>
          {stanceIssues().map((issue) => {
            const stance = notes.find((row) => row.issueId === issue.id);
            return (
              <tr key={issue.id}>
                <th scope="row">{issue.label}</th>
                <td>
                  {stance ? (
                    <>
                      {stance.text} <a href={stance.sourceUrl}>{stance.sourceName}</a>
                      <span className="hint"> · {stance.sourceDate}</span>
                    </>
                  ) : (
                    "No public stance found."
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h2>Endorsements</h2>
      {profile.endorsements.length === 0 ? (
        <p>No endorsement is stored.</p>
      ) : (
        <ul className="plain-list">
          {profile.endorsements.map((item) => (
            <li key={item.sourceUrl}>
              {item.text} <a href={item.sourceUrl}>{item.sourceName}</a>
              <span className="hint"> · {item.sourceDate}</span>
            </li>
          ))}
        </ul>
      )}
      <h2>Votes</h2>
      {profile.votes.length === 0 ? (
        <p>No legislative record.</p>
      ) : (
        <ul className="plain-list">
          {profile.votes.map((vote) => (
            <li key={`${vote.bill}-${vote.date}`}>
              {vote.date}: {vote.vote} on {vote.bill}. <a href={vote.sourceUrl}>{vote.sourceName}</a>
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary>More details</summary>
        <FollowControl what="candidate" targetId={ballot?.person.fecCandidateId ?? (loaded.ok ? loaded.candidate.candidateId : id)} />

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
        ) : ballot ? null : (
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

      <h2>Campaign finance</h2>
      {direct.length > 0 ? null : ballot?.person.finance ? <RosterMoney finance={ballot.person.finance} /> : null}
      {finance.notice && direct.length === 0 && !ballot?.person.finance ? <p className="notice">{finance.notice}</p> : null}
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

      {ballot ? (
        <p className="hint">
          Ballot name checked {calendarDay(KY_BALLOT_CHECKED)} against the Kentucky Secretary of State general-election filings.
        </p>
      ) : null}
      </details>
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

function ballotTitle(raceId: string): string {
  if (raceId.includes("senate")) return "U.S. Senate, Kentucky · 2026";
  const district = Number(raceId.split("-").at(-1));
  return `U.S. House, Kentucky District ${district} · 2026`;
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
