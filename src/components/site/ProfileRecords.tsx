import { dayLabel } from "@/lib/format";
import { electionLabel, profileVoteSelection, type CareerEntry, type PriorResult, type ProfileNote, type ProfileSource, type ProfileVote } from "@/lib/site/profiles";
import styles from "./ProfileRecords.module.css";

const wholeNumber = new Intl.NumberFormat("en-US");
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 });

export function RecordSource({ source }: { source: ProfileSource }) {
  return <p className="hint"><a href={source.sourceUrl}>{source.sourceName}</a> · {dayLabel(source.sourceDate)}</p>;
}

export function CareerTimeline({ entries }: { entries: readonly CareerEntry[] }) {
  if (!entries.length) return null;
  return (
    <ol className={`plain-list ${styles.timeline}`} role="list">
      {entries.map((entry) => (
        <li key={`${entry.startYear}-${entry.text}`}>
          <p><span className="hint">{entry.startYear}{entry.endYear != null && entry.endYear !== entry.startYear ? `–${entry.endYear}` : ""}</span> · {entry.text}</p>
          <RecordSource source={entry} />
        </li>
      ))}
    </ol>
  );
}

export function EducationList({ entries }: { entries: readonly ProfileNote[] }) {
  if (!entries.length) return null;
  return (
    <ul className="plain-list">
      {entries.map((entry) => (
        <li key={entry.text}><p>{entry.text}</p><RecordSource source={entry} /></li>
      ))}
    </ul>
  );
}

export function PriorResults({ entries }: { entries: readonly PriorResult[] }) {
  if (!entries.length) return null;
  return (
    <ul className="plain-list">
      {entries.map((entry) => (
        <li key={`${entry.year}-${entry.office}-${entry.election}-${entry.party ?? ""}`}>
          <p>{entry.year} · {electionLabel(entry)}</p>
          <p className={styles.numbers}>{entry.outcome} · {wholeNumber.format(entry.votes)} votes · {percent.format(entry.votes / entry.totalVotes)}</p>
          <RecordSource source={entry} />
        </li>
      ))}
    </ul>
  );
}

export function VoteList({ entries }: { entries: readonly ProfileVote[] }) {
  if (!entries.length) return null;
  return (
    <>
      <p className="hint">
        {profileVoteSelection.rule} · checked <time dateTime={profileVoteSelection.checkedOn}>{dayLabel(profileVoteSelection.checkedOn)}</time>
      </p>
      <ul className="plain-list">
        {entries.map((vote) => (
          <li key={vote.sourceUrl}>
            <p>{vote.vote} · {vote.bill} · {vote.title}</p>
            <p className="hint">
              {dayLabel(vote.date)} · <a href={vote.sourceUrl}>{vote.sourceName} roll call {vote.roll}</a>
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
