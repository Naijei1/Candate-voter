import type { ReactNode } from "react";
import { dayLabel } from "@/lib/format";
import { electionLabel, profileVoteSelection, type CareerEntry, type PriorResult, type ProfileNote, type ProfileSource, type ProfileVote, type SocialAccount } from "@/lib/site/profiles";
import styles from "./ProfileRecords.module.css";

const wholeNumber = new Intl.NumberFormat("en-US");
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 });

/** Rows shown before the rest move behind “Show all”. */
const VISIBLE_ROWS = 6;

export function RecordSource({ source }: { source: ProfileSource }) {
  return <p className={styles.source}><a href={source.sourceUrl}>{source.sourceName}</a> · <time dateTime={source.sourceDate}>{dayLabel(source.sourceDate)}</time></p>;
}

/** Hairline rows. Long lists keep every row in the page, the rest behind a native disclosure. */
function RecordRows({ rows, ordered = false }: { rows: readonly ReactNode[]; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";
  /** Hiding one or two rows behind a control costs more than it saves. */
  const cut = rows.length > VISIBLE_ROWS + 2 ? VISIBLE_ROWS : rows.length;
  const head = rows.slice(0, cut);
  const rest = rows.slice(cut);
  return (
    <div className={styles.frame}>
      <List className={styles.records} role="list">{head}</List>
      {rest.length > 0 ? (
        <details className="more">
          <summary>Show all ({rows.length})</summary>
          <List className={`${styles.records} ${styles.rest}`} role="list" start={ordered ? VISIBLE_ROWS + 1 : undefined}>{rest}</List>
        </details>
      ) : null}
    </div>
  );
}

function Row({ lead, children }: { lead?: ReactNode; children: ReactNode }) {
  return (
    <li className={lead == null ? styles.single : undefined}>
      {lead != null ? <span className={styles.lead}>{lead}</span> : null}
      <div className={styles.body}>{children}</div>
    </li>
  );
}

export function CareerTimeline({ entries }: { entries: readonly CareerEntry[] }) {
  if (!entries.length) return null;
  return (
    <RecordRows
      ordered
      rows={entries.map((entry) => (
        <Row key={`${entry.startYear}-${entry.text}`} lead={`${entry.startYear}${entry.endYear != null && entry.endYear !== entry.startYear ? `–${entry.endYear}` : ""}`}>
          <p>{entry.text}</p>
          <RecordSource source={entry} />
        </Row>
      ))}
    />
  );
}

export function EducationList({ entries }: { entries: readonly ProfileNote[] }) {
  if (!entries.length) return null;
  return (
    <RecordRows
      rows={entries.map((entry) => (
        <Row key={entry.text}><p>{entry.text}</p><RecordSource source={entry} /></Row>
      ))}
    />
  );
}

export function PriorResults({ entries }: { entries: readonly PriorResult[] }) {
  if (!entries.length) return null;
  return (
    <RecordRows
      rows={entries.map((entry) => (
        <Row key={`${entry.year}-${entry.office}-${entry.election}-${entry.party ?? ""}`} lead={entry.year}>
          <p>{electionLabel(entry)}</p>
          <p className={styles.numbers}>{entry.outcome} · {wholeNumber.format(entry.votes)} votes · {percent.format(entry.votes / entry.totalVotes)}</p>
          <RecordSource source={entry} />
        </Row>
      ))}
    />
  );
}

export function SocialList({ accounts, name }: { accounts: readonly SocialAccount[]; name: string }) {
  if (!accounts.length) return null;
  return (
    <RecordRows
      rows={accounts.map((account) => {
        const label = `${account.platform} · ${account.kind === "office" ? "Official" : "Campaign"}`;
        return (
          <Row key={account.url}>
            <p><a href={account.url} aria-label={`${label} · ${name}`}>{label}</a></p>
            <RecordSource source={account} />
          </Row>
        );
      })}
    />
  );
}

export function VoteList({ entries }: { entries: readonly ProfileVote[] }) {
  if (!entries.length) return null;
  return (
    <>
      <p className="hint">
        {profileVoteSelection.rule} · checked <time dateTime={profileVoteSelection.checkedOn}>{dayLabel(profileVoteSelection.checkedOn)}</time>
      </p>
      <RecordRows
        rows={entries.map((vote) => (
          <Row key={vote.sourceUrl} lead={vote.vote}>
            <p>{vote.bill} · {vote.title}</p>
            <p className={styles.source}>
              <time dateTime={vote.date}>{dayLabel(vote.date)}</time> · <a href={vote.sourceUrl}>{vote.sourceName} roll call {vote.roll}</a>
            </p>
          </Row>
        ))}
      />
    </>
  );
}
