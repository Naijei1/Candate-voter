import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportButton } from "@/components/tv/client/Report";
import { Crumbs, SectionHead } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { MoneyView, dollars } from "@/components/tv/MoneyView";
import { allPeople, personView } from "@/lib/tv/people";
import { campaignCommittee, committeeOwner, pacFor, pacs } from "@/lib/tv/money";
import { stateConfig } from "@/lib/states";

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
  if (owner) return { alternates: { canonical: `/finance/candidates/${owner.id}` }, title: `Who gives to ${owner.name}` };
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

  return (
    <div className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { href: "/finance", label: "Campaign money" }, { label: pac.name }]} />
      <h1 className="t-h1 pt">{pac.name}</h1>
      <p className="lede">
        A political action committee (PAC). It gave <b className="num">{dollars(pac.total)}</b> to {stateConfig().name} campaigns.
      </p>

      <section className="sec" aria-labelledby="h-g">
        <SectionHead id="h-g" title="Who it gave to" />
        <ul className="glist">
          {pac.gifts.map((gift, index) => {
            const person = allPeople().find((row) => row.id === gift.candidateId || row.funding?.candidateId === gift.candidateId);
            const race = person ? personView(person.id)?.race : null;
            return (
              <li key={`${gift.candidateId}-${index}`}>
                <span className="gn">
                  {person ? <Link href={`/candidates/${person.id}`}>{person.name}</Link> : gift.candidateId}
                  <span className="muted">
                    {race ? `${race.title}. ` : null}
                    {periodWords(gift.start, gift.end)}
                  </span>
                </span>
                <b className="num">{dollars(gift.total)}</b>
              </li>
            );
          })}
        </ul>
        <details className="srcd">
          <summary>Sources</summary>
          <ul className="srcl-list">
            <li>
              <ExtLink className="xl" href={`https://www.fec.gov/data/committee/${pac.committeeId}/`} icon>
                FEC committee page
              </ExtLink>
            </li>
            {pac.gifts.map((gift, index) => (
              <li key={`${gift.sourceUrl}-${index}`}>
                <ExtLink className="xl" href={gift.sourceUrl} icon>
                  FEC filing, {periodWords(gift.start, gift.end)}
                </ExtLink>
              </li>
            ))}
          </ul>
        </details>
      </section>
      <p className="page-f">
        <ReportButton />
      </p>
    </div>
  );
}
