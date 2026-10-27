import { formatInstant, httpsUrl, instantDateTime } from "@/lib/format";

type RecordMetaProps = {
  sourceUrl: string | null;
  updatedAt: string | null;
  /** When true, the retrieval time is part of this figure (filings). */
  showRetrieved?: boolean;
  retrievedAt?: string | null;
  /** Shown only when a source stored a submission time. */
  filedAt?: string | null;
  /** List cards omit this when the page already shows one refresh time. */
  showUpdated?: boolean;
};

export function RecordMeta({
  sourceUrl,
  updatedAt,
  showRetrieved = false,
  retrievedAt = null,
  filedAt = null,
  showUpdated = true,
}: RecordMetaProps) {
  const source = httpsUrl(sourceUrl);
  const filed = formatInstant(filedAt);
  if (!source && !showUpdated && !showRetrieved && !filed) return null;

  return (
    <p className="text-sm leading-6 text-muted">
      {source ? (
        <a
          href={source}
          className="text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Source
        </a>
      ) : (
        <span>Source not stored</span>
      )}
      {showUpdated ? (
        <>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <Timestamp label="Updated" value={updatedAt} />
        </>
      ) : null}
      {showRetrieved ? (
        <>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <Timestamp label="Retrieved" value={retrievedAt} />
        </>
      ) : null}
      {filed ? (
        <>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <Timestamp label="Filed" value={filedAt} />
        </>
      ) : null}
    </p>
  );
}

function Timestamp({ label, value }: { label: string; value: string | null }) {
  const text = formatInstant(value);
  const dateTime = instantDateTime(value);
  return (
    <span>
      {label}{" "}
      {text ? <time dateTime={dateTime ?? undefined}>{text}</time> : "time not stored"}
    </span>
  );
}
