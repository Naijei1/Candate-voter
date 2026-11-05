import { KY_RESULTS_LINKS } from "@/lib/site/ky-results";
import { kentuckyPollsClosed } from "@/lib/site/ky-results";
import { ResultsNote } from "@/components/site/ResultsNote";

const OFFICIAL = KY_RESULTS_LINKS[1];

export function electionIsOver(now = new Date()): boolean {
  return kentuckyPollsClosed(now);
}

/** Full box on the home guide. Compact line on race, compare, and candidate pages. */
export function ElectionStatus({ compact = false, now = new Date() }: { compact?: boolean; now?: Date }) {
  if (!electionIsOver(now)) {
    if (compact) return <ResultsNote now={now} />;
    return (
      <aside className="election-banner" aria-label="Election Day">
        <p>
          <strong>Election Day: Nov 3, 2026.</strong> Kentucky polls are open 6:00 a.m. to 6:00 p.m. local time. If you are in line at 6:00 p.m., you can still vote.
        </p>
        <p>
          <a className="btn btn-navy" href="https://www.govote.ky.gov">Find your polling place</a>
        </p>
        <ResultsNote now={now} />
      </aside>
    );
  }
  if (compact) {
    return (
      <p className="results-note">
        Election is over. <a href={OFFICIAL.href}>See official results</a>
      </p>
    );
  }
  return (
    <aside className="election-banner" aria-label="Election results">
      <p>
        <strong>Election is over: see official results.</strong> Election Day was Nov 3, 2026. Counts are unofficial until certified.
      </p>
      <p>
        <a className="btn btn-navy" href={OFFICIAL.href}>See official results</a>
      </p>
    </aside>
  );
}
