import { ballotCards, kyBallot } from "./ky-ballot";

const raceIds = ballotCards().map((race) => race.raceId);

export const kentuckyCandidates = raceIds.flatMap((raceId) =>
  (kyBallot(raceId)?.people ?? []).map((person) => ({ ...person, raceId })),
);

type CandidateMention = (typeof kentuckyCandidates)[number];

function normalized(text: string): string {
  return text.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function nameParts(name: string): string[] {
  return normalized(name).replace(/ (?:jr|sr|ii|iii|iv)$/, "").split(" ");
}

export function mentionedCandidates(text: string, allowSurname = false): CandidateMention[] {
  const haystack = ` ${normalized(text)} `;
  const has = (value: string) => haystack.includes(` ${value} `);
  const full = kentuckyCandidates.filter((person) => {
    const parts = nameParts(person.name);
    const last = parts.at(-1);
    return has(parts.join(" ")) || (last && parts.slice(0, -1).some((part) => part.length > 1 && has(`${part} ${last}`)));
  });
  if (!allowSurname) return full;
  return kentuckyCandidates.filter((person) => {
    if (full.includes(person)) return true;
    const surname = nameParts(person.name).at(-1);
    return surname && surname.length >= 3 && has(surname) &&
      kentuckyCandidates.filter((other) => nameParts(other.name).at(-1) === surname).length === 1;
  });
}

export function mentionedRaces(text: string, districtShorthand = false): string[] {
  const ids = new Set(raceIds.filter((id) => text.toLowerCase().includes(id.toLowerCase())));
  const kentuckySenate = /\b(?:(?:kentucky(?:['’]s)?|ky)\s+(?:u\.?s\.?\s+senate|senate\s+(?:race|seat|election|primary|candidates?))|senate\s+(?:race|seat|election|primary|candidates?)\s+(?:in|for)\s+kentucky)\b/i;
  if (kentuckySenate.test(text) || (districtShorthand && /\bsenate\b/i.test(text))) {
    ids.add("2026-senate-KY");
  }
  const pattern = districtShorthand
    ? /\b(?:district\s+0?([1-6])|([1-6])(?:st|nd|rd|th)\s+(?:congressional\s+)?district)\b/gi
    : /\b(?:congressional\s+district\s+0?([1-6])|([1-6])(?:st|nd|rd|th)\s+congressional\s+district)\b/gi;
  if (!districtShorthand && !/\b(?:kentucky|ky)\b/i.test(text)) return [...ids];
  for (const match of text.matchAll(pattern)) ids.add(`2026-house-KY-0${match[1] ?? match[2]}`);
  return [...ids];
}
