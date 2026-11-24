import Link from "next/link";
import { raceSummary, type SummaryBit } from "@/lib/site/race-summary";
import type { KyRace } from "@/lib/site/ky-ballot";
import styles from "./reading.module.css";

export function RaceSummary({ race }: { race: KyRace }) {
  const summary = raceSummary(race);
  if (!summary) return null;
  return (
    <p className={styles.summary}>
      {summary.bits.map((bit, index) => <Bit key={`${bit.text}-${index}`} bit={bit} />)}
      {summary.extra ? ` ${summary.extra}` : null}
    </p>
  );
}

function Bit({ bit }: { bit: SummaryBit }) {
  if (!bit.href) return bit.text;
  if (bit.href.startsWith("http")) return <a href={bit.href}>{bit.text}</a>;
  return <Link href={bit.href}>{bit.text}</Link>;
}
