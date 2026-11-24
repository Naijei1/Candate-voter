import data from "../../../data/ky-congressional-officeholders.json";
import { certifiedWinner, CONGRESSIONAL_TERM_START, generalResult, KY_FEDERAL_RACES, resultCandidateMatches } from "@/lib/site/certified-results";
import { kyBallot } from "@/lib/site/ky-ballot";

export const KY_CONGRESSIONAL_ROSTER_SOURCE = data[0].sourceUrl;

export function currentKentuckyOfficeholders(now = new Date()) {
  const instant = now.getTime();
  return data.filter((member) =>
    instant >= Date.parse(`${member.termStart}T17:00:00Z`) && instant < Date.parse(`${member.termEnd}T17:00:00Z`),
  );
}

/** The member whose term ends when the next term for this seat begins. */
export function officeholderForSeat(office: "senate" | "house", district: number | null, termEnd = CONGRESSIONAL_TERM_START.slice(0, 10)) {
  return data.find((member) => member.office === office && member.district === district && member.termEnd === termEnd) ?? null;
}

export function currentOfficeFor(candidateId: string, name?: string) {
  return currentKentuckyOfficeholders().find((person) =>
    person.fecIds.includes(candidateId) || Boolean(name && resultCandidateMatches(person, { name })),
  );
}

/**
 * The officeholder page's name when it is the same person with a shorter form
 * ("James Comer" for "James R. Comer"). Otherwise the stored name.
 */
export function shownName(legalName: string, candidateId?: string): string {
  const office = currentOfficeFor(candidateId ?? "", legalName);
  if (!office || office.name === legalName) return legalName;
  const legal = nameTokens(legalName);
  const common = nameTokens(office.name);
  if (common.length > 0 && common.length < legal.length && common.every((token) => legal.includes(token))) return office.name;
  return legalName;
}

function nameTokens(name: string): string[] {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
}

export function congressionalOfficeLabel(member: ReturnType<typeof currentOfficeFor>): string | null {
  if (!member) return null;
  return member.district ? `U.S. Representative, District ${member.district}` : "U.S. Senator";
}

export function kentuckyElectionSuccessors() {
  return KY_FEDERAL_RACES.flatMap((raceId) => {
    const result = generalResult(raceId);
    const winner = result?.status === "certified" ? certifiedWinner(result) : null;
    if (!winner || !result) return [];
    const person = kyBallot(raceId)?.people.find((row) => resultCandidateMatches(winner, row));
    const district = raceId.includes("house") ? Number(raceId.slice(-2)) : null;
    const incumbent = data.find((member) => member.district === district && member.termEnd === CONGRESSIONAL_TERM_START.slice(0, 10));
    const continuing = Boolean(incumbent && (
      (person && incumbent.fecIds.includes(person.id)) || resultCandidateMatches(winner, { name: incumbent.name })
    ));
    return [{ raceId, winner, person, district, continuing, sourceUrl: result.sourceUrl }];
  });
}
