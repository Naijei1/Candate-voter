import { partyBadge } from "@/components/site/PersonFace";
import { dayLabel } from "@/lib/format";
import { officeholderForSeat } from "@/lib/site/ky-officeholders";
import { CONGRESSIONAL_TERM_START } from "@/lib/site/certified-results";
import type { KyPerson, KyRace } from "@/lib/site/ky-ballot";

export type SummaryBit = { text: string; href?: string };

export type RaceSummaryModel = {
  bits: SummaryBit[];
  /** Sourced ballot note, such as a primary result, kept after the sentence. */
  extra: string | null;
};

type Named = { name: string; party: string; href?: string };

/** One sentence built from the ballot and the current officeholder record. */
export function raceSummary(race: KyRace, now = new Date()): RaceSummaryModel | null {
  if (race.people.length === 0) return null;
  const holders = race.people.filter((person) => person.holdsOffice);
  const others = race.people.filter((person) => !person.holdsOffice);
  const outgoing = holders.length === 0 ? outgoingHolder(race) : null;
  const bits: SummaryBit[] = [];

  if (holders.length > 0) {
    bits.push(...nameList(holders.map(candidateBit)));
    bits.push({ text: holders.length === 1 ? " holds this office and is running." : " hold this office and are running." });
    if (others.length > 0) {
      bits.push({ text: " " });
      bits.push(...nameList(others.map(candidateBit)));
      bits.push({ text: others.length === 1 ? " is also running." : " are also running." });
    }
  } else {
    bits.push(...nameList(race.people.map(candidateBit)));
    const verb = race.people.length === 1 ? "is" : "are";
    if (outgoing) {
      const ended = now.getTime() >= Date.parse(`${outgoing.termEnd}T17:00:00Z`);
      bits.push({ text: ` ${verb} running for the open seat ` });
      bits.push({ text: outgoing.name, href: outgoing.url });
      bits.push({ text: ` (${partyBadge(outgoing.party).label}) ${ended ? "held" : "holds"} until ${dayLabel(outgoing.termEnd)}.` });
    } else {
      bits.push({ text: ` ${verb} running for the open seat.` });
    }
  }

  return { bits, extra: race.note };
}

export function raceSummaryText(race: KyRace, now = new Date()): string | null {
  const summary = raceSummary(race, now);
  if (!summary) return null;
  const sentence = summary.bits.map((bit) => bit.text).join("");
  return summary.extra ? `${sentence} ${summary.extra}` : sentence;
}

function candidateBit(person: KyPerson): Named {
  return { name: person.name, party: person.party, href: `/candidates/${person.id}` };
}

function nameList(people: readonly Named[]): SummaryBit[] {
  const bits: SummaryBit[] = [];
  people.forEach((person, index) => {
    const separator = index === 0 ? "" : people.length === 2 ? " and " : index === people.length - 1 ? ", and " : ", ";
    if (separator) bits.push({ text: separator });
    bits.push({ text: person.name, href: person.href });
    bits.push({ text: ` (${partyBadge(person.party).label})` });
  });
  return bits;
}

function outgoingHolder(race: KyRace) {
  const ids = new Set(race.people.flatMap((person) => [person.id, person.fecCandidateId, ...person.alsoFecIds].filter((id): id is string => Boolean(id))));
  const senate = race.raceId.includes("senate");
  const member = officeholderForSeat(senate ? "senate" : "house", senate ? null : Number(race.raceId.slice(-2)), CONGRESSIONAL_TERM_START.slice(0, 10));
  if (!member || member.fecIds.some((id) => ids.has(id))) return null;
  return member;
}
