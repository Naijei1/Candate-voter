import feed from "../../../data/ky-fec-feed-finance.json";
import type { PersonView } from "./people";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Jun 13 – Sep 30, 2025", "Apr 1–29, 2026", "Nov 1, 2025 – Jan 5, 2026". */
export function periodLong(start: string, end: string): string {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  if (sy === ey && sm === em) return `${MONTHS[sm - 1]} ${sd}–${ed}, ${ey}`;
  if (sy === ey) return `${MONTHS[sm - 1]} ${sd} – ${MONTHS[em - 1]} ${ed}, ${ey}`;
  return `${MONTHS[sm - 1]} ${sd}, ${sy} – ${MONTHS[em - 1]} ${ed}, ${ey}`;
}

const SMALL = new Set(["and", "for", "of", "the", "to", "in", "on", "a", "an"]);
const KEEP = /^(PAC|PACs|LLC|USA|US|II|III|IV|KY|DC)$/i;

/** FEC committee names arrive in capitals. */
export function committeeTitle(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (KEEP.test(word.replace(/[.,]/g, ""))) return word.toUpperCase();
      if (index > 0 && SMALL.has(word)) return word;
      return word.replace(/^([("']?)([a-z])/, (_, lead: string, letter: string) => lead + letter.toUpperCase());
    })
    .join(" ")
    .replace(/,\s*Inc\.?$/i, ", Inc.");
}

export function fecId(person: PersonView): string {
  return person.funding?.candidateId ?? person.id;
}

export function campaignCommittee(person: PersonView): { committeeId: string; name: string; sourceUrl: string } | null {
  const row = feed.committees.find((item) => item.candidateId === fecId(person));
  return row ? { committeeId: row.committeeId, name: committeeTitle(row.name), sourceUrl: row.sourceUrl } : null;
}

export type ReportRow = { start: string; end: string; receipts: number; fileNumber: string; sourceUrl: string; receiptDate: string | null };

/** One row per reporting period, keeping the latest filing when a report was amended. */
export function reportsFor(person: PersonView): ReportRow[] {
  const periods = new Map<string, ReportRow>();
  for (const report of feed.reports) {
    if (report.candidateId !== fecId(person) || report.receipts == null) continue;
    const key = `${report.start}:${report.end}`;
    const previous = periods.get(key);
    if (previous && (previous.receiptDate ?? "") > (report.receiptDate ?? "")) continue;
    periods.set(key, {
      start: report.start,
      end: report.end,
      receipts: report.receipts,
      fileNumber: report.fileNumber,
      sourceUrl: report.sourceUrl,
      receiptDate: report.receiptDate ?? null,
    });
  }
  return [...periods.values()].sort((a, b) => a.end.localeCompare(b.end));
}

export type GiftRow = { name: string; short: string; committeeId: string | null; total: number };

/** Committee contributions itemized in the latest report we hold. */
export function latestGifts(person: PersonView): { start: string; end: string; sourceUrl: string; fileNumber: string | null; rows: GiftRow[] } | null {
  const report = feed.contributions
    .filter((row) => row.candidateId === fecId(person))
    .sort((a, b) => b.end.localeCompare(a.end))[0];
  if (!report || report.committees.length === 0) return null;
  const fileNumber = /\/(\d+)\.fec$/.exec(report.dataUrl ?? "")?.[1] ?? null;
  return {
    start: report.start,
    end: report.end,
    sourceUrl: report.sourceUrl,
    fileNumber,
    rows: [...report.committees]
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
      .map((row) => ({ name: row.name, short: row.name.split(" (")[0].trim(), committeeId: row.committeeId, total: row.total })),
  };
}
