import Link from "next/link";
import { SourcePeek } from "@/components/site/SourcePeek";
import { dayLabel } from "@/lib/format";
import type { Issue, Stance } from "@/lib/site/stances";
import styles from "./reading.module.css";

/** Every stance is in the page. The disclosures open without JavaScript. */
export function IssueNotes({
  notes,
  issues,
  compareHref,
}: {
  notes: readonly Stance[];
  issues: readonly Issue[];
  compareHref?: string;
}) {
  const rows = issues.flatMap((issue) => {
    const stance = notes.find((note) => note.issueId === issue.id);
    return stance ? [{ issue, stance }] : [];
  });
  if (rows.length === 0) return null;
  return (
    <div className={styles.issues}>
      {rows.map((row, index) => {
        const next = rows[index + 1];
        return (
          <details key={row.issue.id} id={`issue-${row.issue.id}`} open={index === 0} className={styles.issue}>
            <summary>{row.issue.label}</summary>
            <div className={styles.detail}>
              <p className="hint">Candidate says</p>
              <p>{row.stance.text}</p>
              <p className="hint">
                <time dateTime={row.stance.sourceDate}>{dayLabel(row.stance.sourceDate)}</time>
                {" · "}
                <SourcePeek name={row.stance.sourceName} url={row.stance.sourceUrl} date={row.stance.sourceDate} excerpt={row.stance.text} />
              </p>
              {compareHref || next ? (
                <p>
                  {compareHref ? <Link href={`${compareHref}#issue-${row.issue.id}`}>Compare this issue</Link> : null}
                  {next ? (
                    <>
                      {compareHref ? " · " : null}
                      <a href={`#issue-${next.issue.id}`}>Next: {next.issue.label}</a>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}
