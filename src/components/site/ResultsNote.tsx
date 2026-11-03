import { KY_RESULTS_LINKS, kentuckyResultsPhase } from "@/lib/site/ky-results";

export function ResultsNote({ now = new Date() }: { now?: Date }) {
  const phase = kentuckyResultsPhase(now);
  if (phase === "before") {
    return <p className="results-note">Results after 6 p.m.</p>;
  }
  return (
    <section className="results-note" aria-label="Results">
      <h2>Results</h2>
      <p>
        {phase === "partial"
          ? "Polls in Central time counties stay open until 6:00 p.m. Central. This site does not copy the numbers."
          : "Unofficial counts are on the State Board of Elections page. This site does not copy the numbers."}
      </p>
      <p className="actions">
        {KY_RESULTS_LINKS.map((link) => (
          <a key={link.href} className="btn btn-navy" href={link.href}>
            {link.label}
          </a>
        ))}
      </p>
    </section>
  );
}
