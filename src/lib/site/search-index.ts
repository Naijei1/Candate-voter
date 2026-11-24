import counties from "../../../data/ky-counties.json";
import { ballotCards } from "@/lib/site/ky-ballot";
import { partyBadge } from "@/components/site/PersonFace";

export type SearchHit = {
  kind: "Candidate" | "Race" | "County" | "ZIP";
  title: string;
  detail: string;
  href: string;
};

type CountyRow = {
  name: string;
  districts: string[];
  clerk?: string;
  clerkUrl?: string;
};

const countyRows = counties as CountyRow[];

/** One search string. A repeated `q` uses the first value that has text. */
export function searchQueryValue(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value.find((item) => item.trim().length > 0) : value;
  return raw?.trim() ?? "";
}

/** Candidates, races, counties, and a ZIP handoff. Empty when the query is too short to match. */
export function searchSite(query: string): SearchHit[] {
  const text = query.trim();
  if (/^\d{5}$/.test(text)) {
    return [{
      kind: "ZIP",
      title: `ZIP ${text}`,
      detail: "Find the races for this ZIP",
      href: `/ballot?zip=${text}`,
    }];
  }
  if (text.length < 2) return [];
  const needle = text.toLowerCase();
  const hits: SearchHit[] = [];
  for (const race of ballotCards()) {
    const names = race.people.map((person) => person.name).join(", ");
    if (includes(needle, race.title, race.raceId, names)) {
      hits.push({ kind: "Race", title: race.title, detail: names, href: `/races/${race.raceId}` });
    }
    for (const person of race.people) {
      if (!includes(needle, person.name, person.party, race.title)) continue;
      hits.push({
        kind: "Candidate",
        title: person.name,
        detail: `${partyBadge(person.party).label} · ${race.title}`,
        href: `/candidates/${person.id}`,
      });
    }
  }
  for (const county of countyRows) {
    const district = county.districts.map((code) => `District ${Number(code)}`).join(", ");
    if (!includes(needle, county.name, "county", district, county.clerk ?? "")) continue;
    const href = https(county.clerkUrl);
    if (!href) continue;
    hits.push({
      kind: "County",
      title: `${county.name} County`,
      detail: county.clerk ? `${county.clerk}, county clerk · ${district}` : district,
      href,
    });
  }
  return hits.slice(0, 24);
}

function includes(needle: string, ...parts: string[]): boolean {
  return parts.join(" ").toLowerCase().includes(needle);
}

function https(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
