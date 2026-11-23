import Link from "next/link";
import styles from "./reading.module.css";

export function PageLinks({ raceId, candidateId }: { raceId?: string; candidateId?: string }) {
  const params = new URLSearchParams();
  if (raceId) params.set("raceId", raceId);
  if (candidateId) params.set("candidateId", candidateId);
  const ask = params.size > 0 ? `/ask?${params.toString()}` : "/ask";
  return (
    <nav className={styles.tools} aria-label="On this record">
      <Link href={ask}>{candidateId ? "Ask about this candidate" : "Ask about this race"}</Link>
      <Link href="/sources">Sources</Link>
      <a href="#report-an-error">Report an error</a>
    </nav>
  );
}
