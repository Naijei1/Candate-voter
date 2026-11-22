import { dayLabel } from "@/lib/format";
import { certifiedWinner, generalResult, KY_RESULTS_SOURCE, primaryResults, shortElectionDate, type CertifiedResult } from "@/lib/site/certified-results";
import { KY_RESULTS_LINKS } from "@/lib/site/ky-results";
import styles from "./election-results.module.css";

export function RaceResults({ raceId }: { raceId: string }) {
  const general = generalResult(raceId);
  const primary = primaryResults(raceId);
  const winner = general?.status === "certified" ? certifiedWinner(general) : null;
  return (
    <>
      {general?.status === "pending" ? (
        <p className="results-note">Certification due {shortElectionDate(general.scheduledCertificationDate)}. <a href={KY_RESULTS_LINKS[1].href}>See official results</a></p>
      ) : null}
      {general?.status === "certified" ? (
        <section aria-labelledby="general-results-heading">
          <h2 id="general-results-heading">General election results</h2>
          <p>{winner ? <><strong>{winner.name}</strong> · Elected · </> : null}Certified {dayLabel(general.certificationDate)} · <a href={general.sourceUrl}>{KY_RESULTS_SOURCE}</a></p>
          <ResultTable result={general} caption="November 3 general election" />
          <p><a href={KY_RESULTS_LINKS[1].href}>See official results</a></p>
        </section>
      ) : null}
      {primary.length > 0 ? (
        <section aria-labelledby="primary-results-heading">
          <h2 id="primary-results-heading">May 19 primary results</h2>
          {primary.map((result) => (
            <div key={result.party}>
              <ResultTable result={result} caption={result.party} />
              <p className="hint">Certified{result.certificationDate ? ` ${dayLabel(result.certificationDate)}` : ""} · <a href={result.sourceUrl}>{KY_RESULTS_SOURCE}</a></p>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

function ResultTable({ result, caption }: { result: CertifiedResult; caption: string }) {
  const sorted = [...result.candidates].sort((a, b) => Number(b.winner) - Number(a.winner) || b.votes - a.votes);
  return (
    <table className={styles.totals}>
      <caption>{caption}</caption>
      <thead>
        <tr><th scope="col">Candidate</th><th scope="col">Certified votes</th></tr>
      </thead>
      <tbody>
        {sorted.map((person) => (
          <tr key={person.name}>
            <th scope="row">{person.name}{person.winner && result.election === "primary" ? <span className="hint"> · Nominee</span> : null}</th>
            <td>{person.votes.toLocaleString("en-US")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
