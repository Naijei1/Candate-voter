/** Form 2 coverage lines. The page banner carries `refreshedAt`. */
export function CoverageNote({
  lines,
  scopeNote,
}: {
  lines: string[];
  scopeNote: string;
}) {
  return (
    <div className="text-sm leading-6 text-muted">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p>{scopeNote}</p>
    </div>
  );
}
