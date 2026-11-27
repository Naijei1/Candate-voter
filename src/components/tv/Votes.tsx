import { dayLabel } from "@/lib/format";
import type { ProfileVote } from "@/lib/site/profiles";
import { ExtLink } from "./ExtLink";

export function voteWord(vote: string): string {
  if (/^(yea|aye|yes)$/i.test(vote)) return "Yes";
  if (/^(nay|no)$/i.test(vote)) return "No";
  if (/not voting/i.test(vote)) return "Did not vote";
  return vote;
}

function shortTitle(title: string): string {
  if (title.length <= 90) return title;
  const cut = title.slice(0, 90);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function VoteTable({ votes }: { votes: readonly ProfileVote[] }) {
  return (
    <div className="tscroll">
      <table className="tbl">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Bill</th>
            <th scope="col">Vote</th>
          </tr>
        </thead>
        <tbody>
          {votes.map((vote) => (
            <tr key={`${vote.roll}-${vote.date}`}>
              <td className="num nowrap">{dayLabel(vote.date)}</td>
              <td>
                <ExtLink href={vote.sourceUrl}>{vote.bill}</ExtLink>
                <span className="vt" title={vote.title.length > 90 ? vote.title : undefined}>
                  {shortTitle(vote.title)}
                </span>
              </td>
              <td className="nowrap">
                <b>{voteWord(vote.vote)}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Recent House roll calls: four, then the rest behind "Show all". */
export function VoteRecord({ votes, first = 4, more = true }: { votes: readonly ProfileVote[]; first?: number; more?: boolean }) {
  const sorted = [...votes].sort((a, b) => b.date.localeCompare(a.date) || b.roll - a.roll);
  const head = sorted.slice(0, first);
  const rest = sorted.slice(first);
  return (
    <>
      <VoteTable votes={head} />
      {more && rest.length > 0 ? (
        <details className="more-v">
          <summary>Show all {sorted.length} votes</summary>
          <VoteTable votes={rest} />
        </details>
      ) : null}
    </>
  );
}
