import { compareBasis } from "@/lib/compare/evidence";
import styles from "./reading.module.css";

export function WhatToKnow({ raceId }: { raceId: string }) {
  const basis = compareBasis(raceId);
  if (!basis || basis.know.length === 0) return null;
  const sources = new Map(basis.evidence.map((row) => [row.id, row]));
  return (
    <section className={styles.know} aria-labelledby="what-to-know">
      <h2 id="what-to-know">What to know</h2>
      <ul>
        {basis.know.slice(0, 5).map((claim) => (
          <li key={claim.text}>
            {claim.text}
            {claim.cites.map((id) => {
              const source = sources.get(id);
              if (!source) return null;
              return <a key={id} className="cite" href={source.sourceUrl}>{source.sourceName} ↗</a>;
            })}
          </li>
        ))}
      </ul>
    </section>
  );
}
