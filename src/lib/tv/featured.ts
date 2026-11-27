import feed from "../../../data/ky-fec-feed-finance.json";
import { KY_ELECTION_CALENDAR } from "@/lib/site/certified-results";
import { KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";
import { dayLabel } from "@/lib/format";
import { kyPerson } from "@/lib/site/ky-ballot";
import { raceTitle } from "./people";

export type Featured = { label: string; text: string; href: string; source: { label: string; url: string } };

function isoToday(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** The next dated step on the official calendar, or the last one once all have passed. */
export function nextKeyDate(now = new Date()) {
  const today = isoToday(now);
  const rows = [...KY_ELECTION_CALENDAR].sort((a, b) => a.date.localeCompare(b.date));
  return rows.find((row) => row.date >= today) ?? rows.at(-1) ?? null;
}

/** Latest FEC report received for any candidate on the ballot. */
export function latestFiling() {
  const rows = feed.reports
    .filter((report) => report.receiptDate && report.sourceUrl && kyPerson(report.candidateId))
    .sort((a, b) => b.receiptDate.localeCompare(a.receiptDate) || b.fileNumber.localeCompare(a.fileNumber));
  const report = rows[0];
  if (!report) return null;
  const hit = kyPerson(report.candidateId);
  return hit ? { report, person: hit.person, raceId: hit.race.raceId } : null;
}

export function featured(now = new Date()): Featured[] {
  const items: Featured[] = [];
  const date = nextKeyDate(now);
  if (date) {
    items.push({
      label: "Key dates",
      text: `${dayLabel(date.date)}: ${date.label}`,
      href: "/states/ky#dates",
      source: { label: date.sourceName, url: date.sourceUrl },
    });
  }
  const clerk = KY_BALLOT_SOURCES.find((source) => source.name === "Clerk of the House");
  const published = clerk ? /Published (\w{3} \d{1,2}, \d{4})/.exec(clerk.note)?.[1] : null;
  if (clerk && published) {
    items.push({
      label: "Recently updated",
      text: `${raceTitle("2026-senate-KY")}, ${published}`,
      href: "/races/2026-senate-KY",
      source: { label: clerk.name, url: clerk.url },
    });
  }
  const filing = latestFiling();
  if (filing) {
    items.push({
      label: "Recent filings",
      text: `${filing.person.name}, ${dayLabel(filing.report.receiptDate.slice(0, 10))}`,
      href: `/races/${filing.raceId}?tab=finance`,
      source: { label: "New FEC report", url: filing.report.sourceUrl },
    });
  }
  return items;
}
