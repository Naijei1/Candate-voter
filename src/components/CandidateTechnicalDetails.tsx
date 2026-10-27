import type { Filing } from "@/lib/types";

/** FEC ids and filing numbers, kept out of the candidate summary. */
export function CandidateTechnicalDetails({
  fecCandidateId,
  filedName,
  filings,
}: {
  fecCandidateId: string | null;
  filedName: string | null;
  filings: { ok: true; list: Pick<Filing, "filingId" | "fecFilingId" | "imageNumber">[] } | { ok: false };
}) {
  const fecId = fecCandidateId?.trim() || null;
  const rows = filings.ok ? filings.list : [];
  return (
    <details data-testid="technical-details" className="rounded-lg border border-line bg-card px-3 py-2">
      <summary className="cursor-pointer text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        Technical details
      </summary>
      <div className="mt-2 space-y-1 text-sm leading-6 text-muted">
        <p>{fecId ? `FEC candidate id ${fecId}` : "FEC candidate id not reported"}</p>
        {filedName ? <p>Name as filed: {filedName}</p> : null}
        {!filings.ok ? (
          <p>Filing numbers could not be loaded.</p>
        ) : rows.length === 0 ? (
          <p>No filing number is stored.</p>
        ) : (
          rows.map((filing) => (
            <p key={filing.filingId}>
              Statement of candidacy (Form 2). Filing number {filing.filingId}
              {filing.fecFilingId ? `. FEC filing id ${filing.fecFilingId}` : ""}
              {filing.imageNumber ? `. Image number ${filing.imageNumber}` : ""}.
            </p>
          ))
        )}
      </div>
    </details>
  );
}
