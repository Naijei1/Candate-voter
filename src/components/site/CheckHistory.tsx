import { formatInstant } from "@/lib/format";
import type { RecordCheck } from "@/lib/content/checks";

export function CheckHistory({ checks }: { checks: readonly RecordCheck[] }) {
  const latest = checks[0] ?? null;
  return (
    <section aria-labelledby="last-checked">
      <h2 id="last-checked">Last checked</h2>
      {latest ? (
        <>
          <p>{formatInstant(latest.checkedAt) ?? latest.checkedAt}</p>
          {latest.note ? <p>{latest.note}</p> : null}
        </>
      ) : (
        <p>Not recorded.</p>
      )}
      {checks.length > 1 ? (
        <>
          <h3>Update history</h3>
          <ul className="plain-list">
            {checks.map((check) => (
              <li key={check.checkedAt}>
                {formatInstant(check.checkedAt) ?? check.checkedAt}
                {check.note ? ` — ${check.note}` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
