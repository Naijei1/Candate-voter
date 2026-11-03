import type { Metadata } from "next";
import Link from "next/link";
import { averagePolls, type Poll } from "@/lib/polls/model";

export const metadata: Metadata = { title: "Polls and analysis" };

const LOADED: Poll[] = [];

export default function PollsPage() {
  const average = averagePolls(LOADED);
  return (
    <article className="wrap">
      <h1>Polls</h1>
      <p className="lede">No qualifying polls. A real poll would name who ran it, when, and how many people were asked.</p>
      {average ? (
        <ul className="plain-list">
          {average.map((row) => (
            <li key={row.label}>
              {row.label}: {row.percent}%
            </li>
          ))}
        </ul>
      ) : (
        <p>No average until those polls exist.</p>
      )}
      <h2>Speeches and debates</h2>
      <p>A speech archive is planned. None are loaded, so nothing is summarized here.</p>
      <p>
        <Link className="btn btn-navy" href="/states/ky">
          See Kentucky races
        </Link>
      </p>
    </article>
  );
}
