"use client";

import { useState } from "react";
import { dayLabel } from "@/lib/format";
import type { Issue, Stance } from "@/lib/site/stances";
import styles from "./reading.module.css";

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
  const [open, setOpen] = useState(rows[0]?.issue.id ?? "");
  const index = Math.max(0, rows.findIndex((row) => row.issue.id === open));
  const current = rows[index];
  const next = rows[index + 1] ?? rows[0];
  if (!current) return null;
  return (
    <div className={styles.issues}>
      <ul className={styles.issueList}>
        {rows.map((row) => (
          <li key={row.issue.id}>
            <button
              type="button"
              aria-current={row.issue.id === current.issue.id ? "true" : undefined}
              onClick={() => setOpen(row.issue.id)}
            >
              {row.issue.label}
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.detail}>
        <p className="hint">Candidate says</p>
        <p>{current.stance.text}</p>
        <p className="hint">
          <time dateTime={current.stance.sourceDate}>{dayLabel(current.stance.sourceDate)}</time>
          {" · "}
          <a href={current.stance.sourceUrl}>{current.stance.sourceName} ↗</a>
        </p>
        <p>
          {compareHref ? <a href={compareHref}>Compare this issue</a> : null}
          {next && next.issue.id !== current.issue.id ? (
            <>
              {compareHref ? " · " : null}
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(next.issue.id)}>
                Next: {next.issue.label}
              </button>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
