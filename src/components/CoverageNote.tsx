import { formatInstant } from "@/lib/format";

/** Form 2 coverage from freshness and house rows. Not a complete ballot. */
export function CoverageNote({
  lines,
  scopeNote,
  refreshedAt,
}: {
  lines: string[];
  scopeNote: string;
  refreshedAt: string | null;
}) {
  const refreshed = formatInstant(refreshedAt);
  return (
    <div className="text-sm leading-6 text-muted">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p>{scopeNote}</p>
      {refreshed ? <p>Refreshed {refreshed}</p> : null}
    </div>
  );
}
