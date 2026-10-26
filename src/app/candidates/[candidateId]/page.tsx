import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskPageContext } from "@/components/chat/AskProvider";
import { RecordMeta } from "@/components/RecordMeta";
import { StorageNotice } from "@/components/StorageNotice";
import {
  logReadError,
  readCandidate,
  readCandidatesForRace,
  readFilingsForCandidate,
  readRace,
} from "@/lib/data/read";
import type { PublicCandidate } from "@/lib/data/view";
import { fecCandidateLabel, httpsUrl, partyLabel } from "@/lib/format";
import type { Candidate, Filing, Race } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CandidatePageProps = {
  params: Promise<{ candidateId: string }>;
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

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { candidateId } = await params;
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

  return (
    <article className="space-y-8">
      <AskPageContext
        candidateId={candidate.candidateId}
        raceId={candidate.raceId}
        cycle={cycle ?? undefined}
      />
      <div className="space-y-2 text-sm">
        <RaceCrumb race={race} />
      </div>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {candidate.displayName}
        </h1>
        <p className="text-base text-muted">
          {partyLabel(candidate.partyAffiliation, candidate.partyLabel)}
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          {fecCandidateLabel(candidate.fecCandidateId)}
        </p>
        {filedName ? (
          <p className="text-sm text-muted">Name as filed: {filedName}</p>
        ) : null}
        <FilingGroupNote candidateId={candidate.candidateId} group={group} />
        <RecordMeta sourceUrl={candidate.sourceUrl} updatedAt={candidate.updatedAt} />
      </header>
      <section aria-labelledby="filings-heading" className="space-y-2">
        <h2 id="filings-heading" className="text-lg font-semibold">
          Filings
        </h2>
        {filings.ok === false ? (
          <StorageNotice tone="error">
            Filings could not be loaded from the table.
          </StorageNotice>
        ) : filings.list.length === 0 ? (
          <p className="text-sm leading-6 text-muted">
            No Form 2 filings are stored for this candidate.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-card">
            {filings.list.map((filing) => (
              <FilingRow key={filing.filingId} filing={filing} />
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

function RaceCrumb({
  race,
}: {
  race: { ok: true; race: Race | null } | { ok: false };
}) {
  if (race.ok && race.race) {
    return (
      <Link
        href={`/races/${race.race.raceId}`}
        className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {race.race.title}
        <span className="text-muted"> · {race.race.jurisdiction}</span>
      </Link>
    );
  }

  return (
    <>
      <p>
        <Link
          href="/"
          className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Federal races
        </Link>
      </p>
      <StorageNotice tone={race.ok ? "empty" : "error"}>
        {race.ok
          ? "This candidate's race is not stored."
          : "The race for this candidate could not be loaded from the table."}
      </StorageNotice>
    </>
  );
}

function FilingRow({ filing }: { filing: Filing }) {
  return (
    <li className="px-4 py-3 text-sm">
      <p className="font-medium text-ink">Form {filing.formType}</p>
      <p className="text-muted">Filing {filing.filingId}</p>
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
}: {
  candidateId: string;
  group: PublicCandidate | null;
}) {
  if (!group?.multiFilingNote) return null;
  const onKeeper = group.candidateId === candidateId;
  return (
    <div className="space-y-1 text-sm leading-6 text-muted">
      {onKeeper ? null : (
        <p>
          This FEC id is one filing for this name. The race list keeps a single row on{" "}
          <Link
            href={`/candidates/${group.candidateId}`}
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
    </div>
  );
}

async function loadGroup(
  raceId: string,
  candidateId: string,
): Promise<PublicCandidate | null> {
  try {
    const listed = await readCandidatesForRace(raceId);
    return (
      listed.find(
        (row) =>
          row.candidateId === candidateId ||
          row.alternateFilings.some((alternate) => alternate.candidateId === candidateId),
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
