import snapshot from "../../../data/ky-fec-feed-finance.json";
import { shortMoney } from "@/lib/finance/model";
import { KY_RESULTS_SOURCE, generalResult, primaryResults } from "@/lib/site/certified-results";
import { kyBallot } from "@/lib/site/ky-ballot";
import { profileFor } from "@/lib/site/profiles";

export type RaceChange = {
  id: string;
  date: string;
  text: string;
  sourceName: string;
  sourceUrl: string;
};

/** Dated changes that already exist on sourced records. Nothing here is inferred. */
export function raceChanges(raceId: string): RaceChange[] {
  const events: RaceChange[] = [];
  const people = kyBallot(raceId)?.people ?? [];
  const ids = new Set(people.flatMap((person) => [person.id, person.fecCandidateId, ...person.alsoFecIds].filter((id): id is string => Boolean(id))));

  for (const report of snapshot.reports) {
    if (!ids.has(report.candidateId) || !report.receiptDate || !report.sourceUrl) continue;
    const person = people.find((row) => row.id === report.candidateId || row.fecCandidateId === report.candidateId || row.alsoFecIds.includes(report.candidateId));
    if (!person) continue;
    const raised = report.receipts === 0 ? "Reported $0" : `Raised ${shortMoney(report.receipts)}`;
    events.push({
      id: `report-${report.fileNumber}`,
      date: report.receiptDate.slice(0, 10),
      text: `${person.name} filed a report. ${raised}.`,
      sourceName: "FEC",
      sourceUrl: report.sourceUrl,
    });
  }

  for (const person of people) {
    for (const endorsement of profileFor(person.id).endorsements) {
      if (!endorsement.sourceDate || !endorsement.sourceUrl) continue;
      events.push({
        id: `endorsement-${person.id}-${endorsement.sourceUrl}`,
        date: endorsement.sourceDate.slice(0, 10),
        text: `${person.name}: ${endorsement.text}`,
        sourceName: endorsement.sourceName,
        sourceUrl: endorsement.sourceUrl,
      });
    }
  }

  for (const result of primaryResults(raceId)) {
    if (!result.certificationDate) continue;
    events.push({
      id: `primary-${result.party}`,
      date: result.certificationDate,
      text: `${result.party} primary certified.`,
      sourceName: KY_RESULTS_SOURCE,
      sourceUrl: result.sourceUrl,
    });
  }

  const general = generalResult(raceId);
  if (general?.status === "certified") {
    events.push({
      id: "general-certified",
      date: general.certificationDate,
      text: "General election certified.",
      sourceName: KY_RESULTS_SOURCE,
      sourceUrl: general.sourceUrl,
    });
  }

  return events
    .filter((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.date))
    .sort((a, b) => b.date.localeCompare(a.date) || a.text.localeCompare(b.text));
}
