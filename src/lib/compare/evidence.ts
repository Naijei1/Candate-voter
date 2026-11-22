import { KY_BALLOT_SOURCES, kyBallot } from "@/lib/site/ky-ballot";
import { profileFor } from "@/lib/site/profiles";
import { stanceIssues, stancesFor } from "@/lib/site/stances";

/** One cited record a comparison may use. The id is what each claim cites. */
export type Evidence = {
  id: string;
  personId: string;
  personName: string;
  kind: "statement" | "vote";
  issue: string | null;
  text: string;
  sourceName: string;
  sourceUrl: string;
  sourceDate: string | null;
};

export type Claim = { text: string; cites: string[] };

export type ComparePerson = { id: string; name: string; party: string; holdsOffice: boolean; writeIn: boolean };

export type CompareBasis = {
  raceId: string;
  title: string;
  people: ComparePerson[];
  evidence: Evidence[];
  /** Facts from the stored ballot, each with its own citation. */
  know: Claim[];
};

export const COMPARE_RACE_IDS = [
  "2026-senate-KY",
  "2026-house-KY-01",
  "2026-house-KY-02",
  "2026-house-KY-03",
  "2026-house-KY-04",
  "2026-house-KY-05",
  "2026-house-KY-06",
] as const;

export function compareTitle(raceId: string): string {
  if (raceId.includes("senate")) return "U.S. Senate";
  return `U.S. House District ${Number(raceId.slice(-2))}`;
}

function partyWord(party: string): string {
  if (/^(Republican|Democratic|Libertarian) Party$/i.test(party)) return party.replace(/\s+Party$/i, "");
  return party;
}

/**
 * Everything a comparison of one race may say, from records this site stores:
 * sourced candidate statements (`data/ky-stances.json`), House votes
 * (`data/ky-profiles.json`), and the November ballot list.
 */
export function compareBasis(raceId: string): CompareBasis | null {
  const race = kyBallot(raceId);
  if (!race) return null;
  const issues = new Map(stanceIssues().map((issue) => [issue.id, issue.label]));
  const evidence: Evidence[] = [];
  const people: ComparePerson[] = race.people.map((person) => ({
    id: person.id,
    name: person.name,
    party: person.party,
    holdsOffice: person.holdsOffice,
    writeIn: person.role === "write-in",
  }));
  for (const person of race.people) {
    for (const stance of stancesFor(person.id)) {
      evidence.push({
        id: `E${evidence.length + 1}`,
        personId: person.id,
        personName: person.name,
        kind: "statement",
        issue: issues.get(stance.issueId) ?? null,
        text: stance.text,
        sourceName: stance.sourceName,
        sourceUrl: stance.sourceUrl,
        sourceDate: stance.sourceDate,
      });
    }
    for (const vote of profileFor(person.id).votes) {
      evidence.push({
        id: `E${evidence.length + 1}`,
        personId: person.id,
        personName: person.name,
        kind: "vote",
        issue: null,
        text: `Voted ${vote.vote} on ${vote.bill} (${vote.title}).`,
        sourceName: vote.sourceName,
        sourceUrl: vote.sourceUrl,
        sourceDate: vote.date,
      });
    }
  }

  const ballot = KY_BALLOT_SOURCES[0];
  const clerk = KY_BALLOT_SOURCES[1];
  const ballotId = `B1`;
  const clerkId = `B2`;
  evidence.push(
    { id: ballotId, personId: "", personName: "", kind: "statement", issue: null, text: ballot.note, sourceName: ballot.name, sourceUrl: ballot.url, sourceDate: "2026-11-03" },
    { id: clerkId, personId: "", personName: "", kind: "statement", issue: null, text: clerk.note, sourceName: clerk.name, sourceUrl: clerk.url, sourceDate: "2026-10-08" },
  );
  const names = people.map((person) => `${person.name} (${person.writeIn ? "write-in" : partyWord(person.party)})`);
  const holder = people.find((person) => person.holdsOffice);
  const know: Claim[] = [
    { text: `${people.length} candidates were on the November 3, 2026 ballot: ${names.join(", ")}.`, cites: [ballotId] },
    holder
      ? { text: `${holder.name} held this seat and was running again.`, cites: [clerkId] }
      : { text: "Open seat: no current officeholder was running.", cites: [clerkId] },
  ];
  if (race.note) know.push({ text: race.note, cites: [ballotId] });
  return { raceId, title: compareTitle(raceId), people, evidence, know: know.filter((claim) => claim.cites.length > 0) };
}

/** What the home page sends to the browser for one race: the title and ballot facts only. Candidate records load on demand. */
export type CompareOption = {
  raceId: string;
  title: string;
  know: Claim[];
  /** The ballot-source rows the "what to know" claims cite. */
  ballot: Evidence[];
};

export function compareOption(basis: CompareBasis): CompareOption {
  return {
    raceId: basis.raceId,
    title: basis.title,
    know: basis.know,
    ballot: basis.evidence.filter((row) => !row.personId),
  };
}

/** Candidate statement and vote rows for one race. Sent with each compare answer. */
export function candidateEvidence(basis: CompareBasis): Evidence[] {
  return basis.evidence.filter((row) => row.personId);
}

export { REFUSALS } from "./refusals";

export function candidatesWithEvidence(basis: CompareBasis): number {
  return new Set(basis.evidence.filter((row) => row.personId).map((row) => row.personId)).size;
}
