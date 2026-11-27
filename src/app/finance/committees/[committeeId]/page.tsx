import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportButton } from "@/components/tv/client/Report";
import { Crumbs, PartyTag, SectionHead } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { MoneyView, dollars } from "@/components/tv/MoneyView";
import { shortMoney } from "@/lib/finance/model";
import { allPeople, personView } from "@/lib/tv/people";
import { campaignCommittee, committeeOwner, outsideTotals, pacFor, pacs } from "@/lib/tv/money";
import { outsideSpending } from "@/lib/tv/race-extra";
import { allRaces } from "@/lib/tv/people";

export const revalidate = 3600;
export const runtime = "nodejs";

type PageProps = { params: Promise<{ committeeId: string }> };

function ownerOf(committeeId: string) {
  const fecId = committeeOwner(committeeId);
  if (!fecId) return null;
  const person = allPeople().find((row) => row.id === fecId || row.funding?.candidateId === fecId);
  const view = person ? personView(person.id) : null;
  return view?.funding ? { ...view, funding: view.funding } : null;
}

export function generateStaticParams() {
  const campaign = allPeople().flatMap((person) => {
    const committee = person.funding ? campaignCommittee(person) : null;
    return committee ? [committee.committeeId] : [];
  });
  return [...new Set([...campaign, ...pacs().map((pac) => pac.committeeId)])].map((committeeId) => ({ committeeId }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const committeeId = (await params).committeeId.trim().toUpperCase();
  const owner = ownerOf(committeeId);
  if (owner) return { alternates: { canonical: `/finance/candidates/${owner.id}` }, title: `Where ${owner.name}’s money comes from` };
  const pac = pacFor(committeeId);
  return pac ? { alternates: { canonical: `/finance/committees/${committeeId}` }, title: pac.name } : { title: "Committee not found" };
}

function periodWords(start: string, end: string): string {
  const fmt = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    return { label: `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${d}`, y };
  };
  const a = fmt(start);
  const b = fmt(end);
  return a.y === b.y ? `${a.label} to ${b.label}, ${b.y}` : `${a.label}, ${a.y} to ${b.label}, ${b.y}`;
}

export default async function CommitteePage({ params }: PageProps) {
  const committeeId = (await params).committeeId.trim().toUpperCase();
  const owner = ownerOf(committeeId);
  if (owner) return <MoneyView person={owner} />;
  const pac = pacFor(committeeId);
  if (!pac) notFound();

  const recipients = new Set(pac.gifts.map((gift) => gift.candidateId));
  const campaigns = recipients.size;
  const totals = outsideTotals();
  const outside = allRaces().flatMap((race) => outsideSpending(race).map((row) => ({ ...row, race })));

  return (
    <div className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { href: "/finance", label: "Campaign Finance" }, { label: pac.name }]} />
      <h1 className="t-h1 pt">{pac.name}</h1>
      <p className="lede">A committee that gave to Kentucky campaigns.</p>
      <div className="headfig">
        <div>
          <span className="hf-n num">{dollars(pac.total)}</span>
          <span className="hf-l">
            given to {campaigns} Kentucky {campaigns === 1 ? "campaign" : "campaigns"}
          </span>
        </div>
        <details className="toggle">
          <summary>What is this?</summary>
          <div className="tt">
            <p>
              {pac.name} gave {dollars(pac.total)} to {campaigns} Kentucky 2026 {campaigns === 1 ? "campaign" : "campaigns"} in our records.
              {totals.campaigns > 0
                ? ` Across Kentucky, outside groups reported ${shortMoney(totals.support)} spent to support and ${shortMoney(totals.oppose)} to oppose candidates in ${totals.campaigns} campaigns.`
                : null}
            </p>
          </div>
        </details>
      </div>
      <p className="pac-ln">
        <ExtLink className="xl" href={`https://www.fec.gov/data/committee/${pac.committeeId}/`} icon>
          FEC committee page
        </ExtLink>
      </p>

      <section className="sec" aria-labelledby="h-g">
        <SectionHead id="h-g" title="Gifts to Kentucky campaigns" />
        <div className="tscroll" role="region" aria-labelledby="h-g" tabIndex={0}>
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Recipient</th>
                <th scope="col">Report period</th>
                <th scope="col" className="r">
                  Amount
                </th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {pac.gifts.map((gift, index) => {
                const person = allPeople().find((row) => row.id === gift.candidateId || row.funding?.candidateId === gift.candidateId);
                const race = person ? personView(person.id)?.race : null;
                return (
                  <tr key={`${gift.candidateId}-${index}`}>
                    <td>
                      {person ? (
                        <>
                          <PartyTag party={person.party} size="sm" /> <Link href={`/candidates/${person.id}`}>{person.name}</Link>
                          {race ? <span className="muted"> {race.title}</span> : null}
                        </>
                      ) : (
                        gift.candidateId
                      )}
                    </td>
                    <td className="num">{periodWords(gift.start, gift.end)}</td>
                    <td className="r num">{dollars(gift.total)}</td>
                    <td>
                      <ExtLink href={gift.sourceUrl} icon label={`FEC filing for ${person?.name ?? gift.candidateId}`}>
                        Filing
                      </ExtLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="src">Source: FEC filings as linked.</p>
      </section>

      {outside.length > 0 ? (
        <section className="sec" aria-labelledby="h-ie">
          <SectionHead id="h-ie" title="Outside spending in Kentucky" />
          <div className="tscroll" role="region" aria-labelledby="h-ie" tabIndex={0}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Candidate</th>
                  <th scope="col" className="r">
                    Outside groups for
                  </th>
                  <th scope="col" className="r">
                    Outside groups against
                  </th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {outside.map((row) => (
                  <tr key={row.person.id}>
                    <td>
                      <PartyTag party={row.person.party} size="sm" /> <Link href={`/candidates/${row.person.id}`}>{row.person.name}</Link>
                      <span className="muted"> {row.race.title}</span>
                    </td>
                    <td className="r num">{dollars(row.support)}</td>
                    <td className="r num">{dollars(row.oppose)}</td>
                    <td>
                      <ExtLink href={row.sourceUrl} icon label={`FEC independent expenditures for ${row.person.name}`}>
                        Filings
                      </ExtLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="src">Source: FEC independent expenditures, by candidate, as linked.</p>
        </section>
      ) : null}
      <p className="page-f">
        <ReportButton />
      </p>
    </div>
  );
}
