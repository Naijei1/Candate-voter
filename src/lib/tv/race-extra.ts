import feed from "../../../data/ky-fec-feed-finance.json";
import { KY_RESULTS_SOURCE, generalResult } from "@/lib/site/certified-results";
import { KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";
import { profileFor } from "@/lib/site/profiles";
import { stateConfig } from "@/lib/states";
import type { PersonView, RaceView } from "./people";

export type TimelineItem = { date: string; text: string; sourceName: string; sourceUrl: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 1–14" or "Jul 1–Sep 30" for a reporting period. */
export function periodLabel(start: string, end: string): string {
  const [, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  return sm === em ? `${MONTHS[sm - 1]} ${sd}–${ed}` : `${MONTHS[sm - 1]} ${sd}–${MONTHS[em - 1]} ${ed}`;
}

function possessive(name: string): string {
  return name.endsWith("s") ? `${name}’` : `${name}’s`;
}

/** Dated events already on sourced records: latest FEC report, the seat change, filings, endorsements, certification. */
export function raceTimeline(race: RaceView): TimelineItem[] {
  const items: TimelineItem[] = [];
  const state = stateConfig();
  for (const person of race.people) {
    const fecId = person.funding?.candidateId ?? person.id;
    const latest = feed.reports
      .filter((report) => report.candidateId === fecId && report.receiptDate && report.sourceUrl)
      .sort((a, b) => (b.receiptDate ?? "").localeCompare(a.receiptDate ?? ""))[0];
    if (latest) {
      items.push({
        date: latest.receiptDate!.slice(0, 10),
        text: `${possessive(person.name)} campaign filed its ${periodLabel(latest.start, latest.end)} finance report.`,
        sourceName: "New FEC report",
        sourceUrl: latest.sourceUrl,
      });
    }
    if (person.filing) {
      items.push({ date: person.filing.date, text: `${person.name} filed to run.`, sourceName: state.filings.name, sourceUrl: person.filing.url });
    }
    for (const endorsement of profileFor(person.id).endorsements) {
      if (!endorsement.sourceDate || !endorsement.sourceUrl) continue;
      items.push({ date: endorsement.sourceDate.slice(0, 10), text: `${person.name}: ${endorsement.text}`, sourceName: endorsement.sourceName, sourceUrl: endorsement.sourceUrl });
    }
  }
  const note = race.note;
  if (note && !/primary/.test(note) && !race.people.some((person) => person.holdsOffice)) {
    items.push({ date: "2026-10-08", text: note, sourceName: "Clerk of the House", sourceUrl: KY_BALLOT_SOURCES[1].url });
  }
  const general = generalResult(race.raceId);
  if (general?.status === "certified") {
    items.push({ date: general.certificationDate, text: "General election certified.", sourceName: KY_RESULTS_SOURCE, sourceUrl: general.sourceUrl });
  }
  return items.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date)).sort((a, b) => b.date.localeCompare(a.date) || a.text.localeCompare(b.text));
}

export type OutsideRow = { person: PersonView; support: number; oppose: number; sourceUrl: string };

/** Independent expenditures FEC lists for or against each candidate. */
export function outsideSpending(race: RaceView): OutsideRow[] {
  return race.people.flatMap((person) => {
    const fecId = person.funding?.candidateId ?? person.id;
    const row = feed.outside.find((item) => item.candidateId === fecId);
    return row && (row.support > 0 || row.oppose > 0) ? [{ person, support: row.support, oppose: row.oppose, sourceUrl: row.sourceUrl }] : [];
  });
}

export function outsideFor(person: PersonView): OutsideRow | null {
  const fecId = person.funding?.candidateId ?? person.id;
  const row = feed.outside.find((item) => item.candidateId === fecId);
  return row && (row.support > 0 || row.oppose > 0) ? { person, support: row.support, oppose: row.oppose, sourceUrl: row.sourceUrl } : null;
}

const LEGISLATURE = /\b(Kentucky (?:State )?Senate|Kentucky House|General Assembly|state legislature|state senate|state house)\b/i;

/** Plain note for candidates without House roll calls on file. */
export function recordNote(person: PersonView): string {
  const service = profileFor(person.id).career.find((entry) => LEGISLATURE.test(entry.text));
  if (service) {
    const years = service.endYear ? ` (${service.startYear}–${service.endYear})` : "";
    return `Served in the ${stateConfig().name} legislature${years}. State votes are not in our records yet.`;
  }
  return "No legislative voting record in our records.";
}
