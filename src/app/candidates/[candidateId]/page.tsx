import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackChrome } from "@/components/BackChrome";
import { CandidateTechnicalDetails } from "@/components/CandidateTechnicalDetails";
import { AskPageContext } from "@/components/chat/AskProvider";
import { MultiFilingDetails } from "@/components/MultiFilingDetails";
import { RecordMeta } from "@/components/RecordMeta";
import { StorageNotice } from "@/components/StorageNotice";
import {
  logReadError,
  readCandidate,
  readCandidatesForRace,
  readFilingsForCandidate,
  readRace,
} from "@/lib/data/read";
import { FILING_MEANS, runningForLine } from "@/lib/copy";
import { withCrossContestFilings } from "@/lib/data/cross-filings";
import { personFilingNote } from "@/lib/data/filing-note";
import { createDynamoRepository } from "@/lib/data/repository";
import { isPresidentialElectionYear } from "@/lib/data/calendar";
import { displayedPartyLabels, type PublicCandidate } from "@/lib/data/view";
import { httpsUrl, partyCue, partyLabel, partyToneClass } from "@/lib/format";
import { withPreservedQuery, type MapContext } from "@/lib/landing/state-query";
import type { Candidate, Filing, Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CandidatePageProps = {
  params: Promise<{ candidateId: string }>;
  searchParams: Promise<{ year?: string; state?: string; zip?: string }>;
};

export async function generateMetadata({
  params,
}: CandidatePageProps): Promise<Metadata> {
  const { candidateId } = await params;
  try {
    const candidate = await readCandidate(candidateId);
    if (!candidate) return { title: "Candidate" };
    return { title: candidate.displayName };
  } catch (error) {
    logReadError("getCandidate", error);
    return { title: "Candidate" };
  }
}

export default async function CandidatePage({ params, searchParams }: CandidatePageProps) {
  const { candidateId } = await params;
  const query = await searchParams;
  const loaded = await loadCandidate(candidateId);
  if (loaded.ok === false) {
    return (
      <StorageNotice tone="error">
        This candidate could not be loaded from the table.
      </StorageNotice>
    );
  }
  if (!loaded.candidate) notFound();

  const candidate = loaded.candidate;
  const [race, filings, group] = await Promise.all([
    loadRace(candidate.raceId),
    loadFilings(candidate.candidateId),
    loadGroup(candidate.raceId, candidate.candidateId),
  ]);
  const filedName = nameAsFiled(candidate);

  const cycle = race.ok && race.race ? race.race.cycle : null;
  const context: MapContext = {
    year: cycle ?? query.year ?? null,
    state: race.ok && race.race ? race.race.state : query.state ?? null,
    zip: query.zip ?? null,
  };
  const labels = group
    ? displayedPartyLabels(group)
    : [partyLabel(candidate.partyAffiliation, candidate.partyLabel)];
  const filingNote = group ? personFilingNote(group.filings) : null;

  return (
    <article className="race-page">
      <AskPageContext
        candidateId={candidate.candidateId}
        raceId={candidate.raceId}
        cycle={cycle ?? undefined}
        label={candidate.displayName}
      />
      <BackChrome
        state={context.state ?? null}
        year={context.year}
        zip={context.zip}
        district={Boolean(race.ok && race.race?.office === "house")}
        raceHref={
          race.ok && race.race ? withPreservedQuery(`/races/${race.race.raceId}`, context) : null
        }
        raceLabel={race.ok && race.race ? race.race.title : null}
      />
      <RaceFallback race={race} />
      <header className="race-heading space-y-2">
        <h1 className="page-title">{candidate.displayName}</h1>
        <RunningFor race={race} />
        <p className={`text-base ${labels.length === 1 ? partyToneClass(candidate.partyAffiliation) : "text-ink"}`}>
          {partyCue(labels)}
        </p>
        <FilingGroupNote candidateId={candidate.candidateId} group={group} context={context} />
        {filingNote ? (
          <p data-testid="person-filing-note" className="person-filing-note text-sm leading-6 text-ink">
            {filingNote}
          </p>
        ) : null}
      </header>
      <section aria-labelledby="filings-heading" className="race-candidates space-y-2">
        <h2 id="filings-heading" className="text-lg font-semibold">
          Filings
        </h2>
        <p className="text-sm leading-6 text-muted">{FILING_MEANS}</p>
        {filings.ok === false ? (
          <StorageNotice tone="error">
            Filings could not be loaded from the table.
          </StorageNotice>
        ) : filings.list.length === 0 ? (
          <p className="text-base leading-6 text-ink">
            No statement of candidacy (Form 2) is stored for this candidate.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-card">
            {filings.list.map((filing) => (
              <FilingRow key={filing.filingId} filing={filing} />
            ))}
          </ul>
        )}
      </section>
      <details className="page-details">
        <summary>Details</summary>
        <div className="page-details-body">
          <RecordMeta sourceUrl={candidate.sourceUrl} updatedAt={candidate.updatedAt} />
          <CandidateTechnicalDetails
            fecCandidateId={candidate.fecCandidateId}
            filedName={filedName}
            filings={filings}
          />
        </div>
      </details>
    </article>
  );
}

function RaceFallback({
  race,
}: {
  race: { ok: true; race: Race | null } | { ok: false };
}) {
  if (race.ok && race.race) return null;
  return (
    <div className="mb-4">
      <StorageNotice tone={race.ok ? "empty" : "error"}>
        {race.ok
          ? "This candidate's race is not stored."
          : "The race for this candidate could not be loaded from the table."}
      </StorageNotice>
    </div>
  );
}

function RunningFor({
  race,
}: {
  race: { ok: true; race: Race | null } | { ok: false };
}) {
  if (!race.ok || !race.race) return null;
  const line = runningForLine(race.race);
  const midtermPresident =
    race.race.office === "president" &&
    race.race.cycle != null &&
    !isPresidentialElectionYear(race.race.cycle);
  return (
    <div className="space-y-1">
      <p className="text-base text-ink">Running for: {line}</p>
      {midtermPresident ? (
        <p className="max-w-2xl text-base leading-6 text-ink">
          There is no presidential race on the {race.race.cycle} ballot. This is a
          national statement of candidacy (Form 2) only.
        </p>
      ) : null}
    </div>
  );
}

function FilingRow({ filing }: { filing: Filing }) {
  return (
    <li className="px-4 py-3 text-sm">
      <p className="font-medium text-ink">Statement of candidacy (Form 2)</p>
      <RecordMeta
        sourceUrl={filing.sourceUrl}
        updatedAt={filing.updatedAt}
        showRetrieved
        retrievedAt={filing.retrievedAt}
        filedAt={filing.filedAt}
      />
    </li>
  );
}

function FilingGroupNote({
  candidateId,
  group,
  context,
}: {
  candidateId: string;
  group: PublicCandidate | null;
  context: MapContext;
}) {
  if (!group?.multiFilingNote) return null;
  const onKeeper = group.candidateId === candidateId;
  return (
    <MultiFilingDetails count={group.alternateFilings.length + 1}>
      {onKeeper ? null : (
        <p>
          This FEC id is one filing for this name. The race list keeps a single row on{" "}
          <Link
            href={withPreservedQuery(`/candidates/${group.candidateId}`, context)}
            className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            {group.candidateId}
          </Link>
          .
        </p>
      )}
      <p>{group.multiFilingNote}</p>
      {group.alternateFilings.map((alternate) => {
        const href = httpsUrl(alternate.sourceUrl);
        if (!href || alternate.candidateId === candidateId) return null;
        return (
          <p key={alternate.candidateId}>
            <a
              href={href}
              className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              {alternate.partyLabel} {alternate.fecCandidateId ?? alternate.candidateId}
            </a>
          </p>
        );
      })}
    </MultiFilingDetails>
  );
}

async function loadGroup(
  raceId: string,
  candidateId: string,
): Promise<PublicCandidate | null> {
  try {
    const listed = await readCandidatesForRace(raceId);
    const race = await readRace(raceId);
    const linked = race
      ? await withCrossContestFilings(createDynamoRepository(), listed, race)
      : listed;
    return (
      linked.find(
        (row) =>
          row.candidateId === candidateId ||
          row.alternateFilings.some((alternate) => alternate.candidateId === candidateId) ||
          row.filings.some((filing) => filing.candidateId === candidateId),
      ) ?? null
    );
  } catch (error) {
    logReadError("listCandidatesForRace", error);
    return null;
  }
}

function nameAsFiled(candidate: Candidate): string | null {
  const filed = candidate.nameAsFiled?.trim() ?? "";
  if (!filed || filed === candidate.displayName) return null;
  return filed;
}

async function loadCandidate(
  candidateId: string,
): Promise<{ ok: true; candidate: Candidate | null } | { ok: false }> {
  try {
    const candidate = await readCandidate(candidateId);
    return { ok: true, candidate };
  } catch (error) {
    logReadError("getCandidate", error);
    return { ok: false };
  }
}

async function loadRace(
  raceId: string,
): Promise<{ ok: true; race: Race | null } | { ok: false }> {
  try {
    const race = await readRace(raceId);
    return { ok: true, race };
  } catch (error) {
    logReadError("getRace", error);
    return { ok: false };
  }
}

async function loadFilings(
  candidateId: string,
): Promise<{ ok: true; list: Filing[] } | { ok: false }> {
  try {
    const list = await readFilingsForCandidate(candidateId);
    return { ok: true, list };
  } catch (error) {
    logReadError("listFilingsForCandidate", error);
    return { ok: false };
  }
}
