import type { Metadata } from "next";
import { averagePolls, type Poll } from "@/lib/polls/model";

export const metadata: Metadata = { title: "Polls and analysis" };

const LOADED: Poll[] = [];

export default function PollsPage() {
  const average = averagePolls(LOADED);
  return (
    <article className="wrap">
      <h1>Polls</h1>
      <p className="lede">No qualifying polls.</p>
      <div className="table-scroll">
      <table>
        <caption>Poll fields. No rows until a source is connected.</caption>
        <thead>
          <tr>
            <th>Pollster</th>
            <th>Field dates</th>
            <th>Sample</th>
            <th>Margin</th>
            <th>Population</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {LOADED.length === 0 ? (
            <tr>
              <td colSpan={6}>No qualifying polls.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      </div>
      <h2>Average</h2>
      {average ? (
        <ul className="plain-list">
          {average.map((row) => (
            <li key={row.label}>
              {row.label}: {row.percent}%
            </li>
          ))}
        </ul>
      ) : (
        <p>No average. No qualifying polls.</p>
      )}
      <h2>Speech analysis</h2>
      <p>
        <span className="status-mark" title="No speeches are loaded.">
          planned
        </span>{" "}
        Speech analysis is planned. No speeches are loaded.
      </p>
    </article>
  );
}
