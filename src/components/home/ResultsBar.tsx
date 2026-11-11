import { KY_RESULTS_LINKS, kentuckyPollsClosed } from "@/lib/site/ky-results";

const OFFICIAL = KY_RESULTS_LINKS[1];

/** Slim bar under the film. Does not name a winner or copy a count. */
export function ResultsBar({ now = new Date() }: { now?: Date }) {
  if (!kentuckyPollsClosed(now)) {
    return (
      <aside className="results-bar" aria-label="Election Day">
        <p>
          <strong>Election Day: Nov 3, 2026.</strong> Kentucky polls are open 6:00 a.m. to 6:00 p.m. local time.
        </p>
        <a href="https://www.govote.ky.gov">Find your polling place</a>
      </aside>
    );
  }
  return (
    <aside className="results-bar" aria-label="Election results">
      <p>
        <strong>Election is over.</strong> Election Day was Nov 3, 2026. Counts are unofficial until certified.
      </p>
      <a href={OFFICIAL.href}>See official results</a>
    </aside>
  );
}
