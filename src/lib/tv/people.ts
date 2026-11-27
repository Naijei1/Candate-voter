import filings from "../../../data/ky-sos-filing-snapshot.json";
import { fundingFor, type FundingBreakdown } from "@/lib/finance/breakdown";
import { dayLabel } from "@/lib/format";
import { kyBallot, kyPerson, type KyPerson } from "@/lib/site/ky-ballot";
import { profileFor, type CareerEntry, type KyProfile, type ProfileNote } from "@/lib/site/profiles";
import { portraitFor, stanceIssues, stancesFor, type Stance } from "@/lib/site/stances";
import { federalRaceIds, stateConfig, type StateConfig } from "@/lib/states";
import { lastName, partyInfo, roleLine, type PartyInfo } from "./party";

export type Photo = { src: string; small: string | null; credit: string; sourceUrl: string; license: string };

export type Filing = { date: string; label: string; url: string; listUrl: string };

export type PersonView = {
  id: string;
  name: string;
  party: PartyInfo;
  role: string;
  writeIn: boolean;
  holdsOffice: boolean;
  raceId: string;
  photo: Photo | null;
  /** First line about the person for cards. Null when none is stored. */
  oneLine: string | null;
  website: { url: string; label: string } | null;
  filing: Filing | null;
  funding: FundingBreakdown | null;
};

export type RaceView = {
  raceId: string;
  office: "senate" | "house";
  district: string | null;
  title: string;
  /** "U.S. House, District 6" for running lines. */
  runningFor: string;
  short: string;
  subtitle: string | null;
  /** Ballot note in past tense, e.g. "Andy Barr ran for Senate." */
  note: string | null;
  people: PersonView[];
};

export function raceTitle(raceId: string): string {
  if (raceId.includes("-senate-")) return "U.S. Senate";
  const district = raceId.slice(-2);
  return district === "00" ? "U.S. House At-Large" : `U.S. House District ${Number(district)}`;
}

/** "Senate" or "District 6" for chips and short labels. */
export function raceShort(raceId: string): string {
  if (raceId.includes("-senate-")) return "Senate";
  const district = raceId.slice(-2);
  return district === "00" ? "At-large" : `District ${Number(district)}`;
}

function runningFor(raceId: string): string {
  if (raceId.includes("-senate-")) return "U.S. Senate";
  const district = raceId.slice(-2);
  return district === "00" ? "U.S. House, at-large seat" : `U.S. House, District ${Number(district)}`;
}

/** Ballot notes are written before the election; the race header reads after it. */
function pastTense(note: string): string {
  return note.replace(/\bis not a candidate\./, "did not run again.").replace(/\bis running for\b/, "ran for");
}

function subtitle(raceId: string, people: readonly KyPerson[], note: string | null): string | null {
  const holder = people.find((person) => person.holdsOffice);
  if (holder) return `Held by ${holder.name}, who is running again.`;
  if (!note) return "Open seat.";
  const past = pastTense(note);
  if (/lost the primary/.test(past)) return `No incumbent on the ballot. ${past}`;
  return `Open seat. ${past}`;
}

function personOrder(a: KyPerson, b: KyPerson): number {
  const aw = a.role === "write-in" ? 1 : 0;
  const bw = b.role === "write-in" ? 1 : 0;
  if (aw !== bw) return aw - bw;
  return lastName(a.name).localeCompare(lastName(b.name)) || a.name.localeCompare(b.name);
}

function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

function filingFor(raceId: string, name: string): Filing | null {
  const row = filings.find((item) => item.raceId === raceId && nameKey(item.name) === nameKey(name));
  if (!row) return null;
  const [month, day, year] = row.filed.split("/").map(Number);
  if (!month || !day || !year) return null;
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { date, label: dayLabel(date), url: row.sourceUrl, listUrl: row.listUrl };
}

function photoFor(id: string): Photo | null {
  const row = portraitFor(id);
  if (!row) return null;
  return {
    src: row.src,
    small: row.src.replace(/\/([^/]+)\.jpg$/, "/sm/$1.webp"),
    credit: row.credit,
    sourceUrl: row.sourceUrl,
    license: row.license,
  };
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const FEDERAL = /^U\.S\. (representative|senator)\b/i;

/** One line for a candidate card: checked office first, then the stored bio, then the filing date. */
function cardLine(raceId: string, person: KyPerson, profile: KyProfile, filing: Filing | null): string | null {
  const career = profile.career.filter((entry) => !isCandidacy(entry)).sort((a, b) => b.startYear - a.startYear);
  const federal = career.find((entry) => FEDERAL.test(entry.text) && (entry.endYear == null || entry.endYear >= new Date().getFullYear()));
  const senate = raceId.includes("-senate-");
  if (federal) {
    const title = federal.text.split(" · ")[0];
    if (person.holdsOffice && /representative/i.test(title) === !senate) return `Has held this ${senate ? "Senate" : "House"} seat since ${federal.startYear}.`;
    return `${title} since ${federal.startYear}, running for ${senate ? "Senate" : "the House"}.`;
  }
  const checked = career.find((entry) => !CAMPAIGN_SOURCE.test(entry.sourceName) || isOfficialSource(entry.sourceName, entry.sourceUrl));
  if (checked) return `${checked.text.replace(/\.$/, "")}, ${yearsLabel(checked)}.`;
  if (profile.bio) return profile.bio.text;
  if (filing) return `Filed to run on ${dayLabel(filing.date)}.`;
  return null;
}

function view(raceId: string, person: KyPerson): PersonView {
  const profile = profileFor(person.id);
  const filing = filingFor(raceId, person.name);
  const party = partyInfo(person.role === "write-in" ? "Write-in" : person.party);
  return {
    id: person.id,
    name: person.name,
    party,
    role: roleLine(person.role === "write-in" ? "Write-in" : person.party),
    writeIn: person.role === "write-in",
    holdsOffice: person.holdsOffice,
    raceId,
    photo: photoFor(person.id),
    oneLine: cardLine(raceId, person, profile, filing),
    website: profile.website ? { url: profile.website.url, label: hostLabel(profile.website.url) } : null,
    filing,
    funding: fundingFor(person.fecCandidateId),
  };
}

export function raceIdsFor(state: StateConfig = stateConfig()): string[] {
  return federalRaceIds(state);
}

export function raceView(raceId: string): RaceView | null {
  const race = kyBallot(raceId);
  if (!race) return null;
  const sorted = [...race.people].sort(personOrder);
  const senate = raceId.includes("-senate-");
  return {
    raceId,
    office: senate ? "senate" : "house",
    district: senate ? null : raceId.slice(-2),
    title: raceTitle(raceId),
    runningFor: runningFor(raceId),
    short: raceShort(raceId),
    subtitle: subtitle(raceId, race.people, race.note),
    note: race.note ? pastTense(race.note) : null,
    people: sorted.map((person) => view(raceId, person)),
  };
}

export function allRaces(state: StateConfig = stateConfig()): RaceView[] {
  return raceIdsFor(state).flatMap((raceId) => {
    const race = raceView(raceId);
    return race ? [race] : [];
  });
}

export function personView(id: string): (PersonView & { race: RaceView }) | null {
  const hit = kyPerson(id);
  if (!hit) return null;
  const race = raceView(hit.race.raceId);
  const person = race?.people.find((row) => row.id === hit.person.id);
  if (!race || !person) return null;
  return { ...person, race };
}

export function allPeople(): PersonView[] {
  return allRaces().flatMap((race) => race.people);
}

/** The opponent a reader most likely wants: the other candidate who raised the most. */
export function mainRival(race: RaceView, id: string): PersonView | null {
  const others = race.people.filter((person) => person.id !== id);
  if (others.length === 0) return null;
  return [...others].sort((a, b) => (b.funding?.receipts ?? -1) - (a.funding?.receipts ?? -1))[0] ?? null;
}

/** The two candidates a race page compares first. */
export function defaultPair(race: RaceView): [PersonView, PersonView] | null {
  const ranked = [...race.people].sort((a, b) => (b.funding?.receipts ?? -1) - (a.funding?.receipts ?? -1));
  if (ranked.length < 2) return null;
  const pair = [ranked[0], ranked[1]];
  pair.sort((a, b) => race.people.indexOf(a) - race.people.indexOf(b));
  return [pair[0], pair[1]];
}

// ---- Records split into checked facts and candidate claims ----

const OFFICIAL_SOURCE =
  /\b(clerk|congress legislators|house biography|official house website|house oversight|legislative research|secretary of state|federal election commission|fec\b|state board of elections|membership resolution)/i;
const CAMPAIGN_SOURCE = /\bcampaign\b/i;

export function isOfficialSource(name: string, url?: string): boolean {
  if (OFFICIAL_SOURCE.test(name)) return true;
  return Boolean(url && /(\.house\.gov|\.senate\.gov|legislature\.ky\.gov|sos\.ky\.gov|elect\.ky\.gov|fec\.gov)(\/|$)/.test(url));
}

export function yearsLabel(entry: Pick<CareerEntry, "startYear" | "endYear">): string {
  return entry.endYear ? `${entry.startYear}–${entry.endYear}` : `since ${entry.startYear}`;
}

export type FactSource = { label: string; url: string };
export type Fact = { term: string; text: string; muted?: string; hint?: string; sources: FactSource[] };

export type ClaimGroup = {
  source: FactSource & { date: string | null };
  items: Array<{ heading: string; tag?: string; text: string; parts?: Array<{ text: string; muted?: string }> }>;
};

function isCandidacy(entry: CareerEntry): boolean {
  return /^(write-in )?candidate for\b/i.test(entry.text);
}

function sourcesOf(note: ProfileNote & { secondarySourceName?: string; secondarySourceUrl?: string }): FactSource[] {
  const list: FactSource[] = [{ label: note.sourceName, url: note.sourceUrl }];
  if (note.secondarySourceName && note.secondarySourceUrl) list.push({ label: note.secondarySourceName, url: note.secondarySourceUrl });
  return list;
}

function issueLabel(issueId: string): string {
  return stanceIssues().find((issue) => issue.id === issueId)?.label ?? issueId;
}

export function isHouseVote(stance: Stance): boolean {
  return /roll call/i.test(stance.sourceName) || /clerk\.house\.gov\/Votes/i.test(stance.sourceUrl);
}

export function voteChoice(text: string): string | null {
  const match = /\bvoted (yes|no|present)\b/i.exec(text);
  return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() : null;
}

export type PersonRecord = {
  profile: KyProfile;
  facts: Fact[];
  claims: ClaimGroup[];
  missingIssues: string[];
  stances: Stance[];
};

/** Profile and stances, split into facts THE VOTE checked and things the candidate says. */
export function personRecord(person: PersonView): PersonRecord {
  const profile = profileFor(person.id);
  const stances = stancesFor(person.id);
  const facts: Fact[] = [];
  const claimItems: Array<{ source: FactSource & { date: string | null }; item: ClaimGroup["items"][number] }> = [];

  const bio = profile.bio;
  if (bio) {
    if (/^says\b/i.test(bio.text)) {
      claimItems.push({ source: { label: bio.sourceName, url: bio.sourceUrl, date: bio.sourceDate }, item: { heading: "About", text: bio.text } });
    } else {
      facts.push({ term: "Biography", text: bio.text, sources: sourcesOf(bio) });
    }
  }

  for (const stance of stances.filter(isHouseVote)) {
    facts.push({
      term: `House vote: ${issueLabel(stance.issueId).toLowerCase()}`,
      text: stance.text,
      hint: voteChoice(stance.text) ? `Vote: ${voteChoice(stance.text)}` : undefined,
      sources: [{ label: stance.sourceName, url: stance.sourceUrl }],
    });
  }

  const career = profile.career.filter((entry) => !isCandidacy(entry));
  const campaignCareer = career.filter((entry) => CAMPAIGN_SOURCE.test(entry.sourceName) && !isOfficialSource(entry.sourceName, entry.sourceUrl));
  const checkedCareer = career.filter((entry) => !campaignCareer.includes(entry));
  const careerFacts = checkedCareer.filter((entry) => !entry.endYear);
  const serviceFacts = checkedCareer.filter((entry) => entry.endYear);
  for (const entry of careerFacts) facts.push({ term: "Career", text: entry.text, muted: `(${yearsLabel(entry)})`, sources: sourcesOf(entry) });
  for (const entry of serviceFacts) facts.push({ term: "Public service", text: entry.text, muted: `(${yearsLabel(entry)})`, sources: sourcesOf(entry) });

  const campaignEducation = profile.education.filter((entry) => CAMPAIGN_SOURCE.test(entry.sourceName) && !isOfficialSource(entry.sourceName, entry.sourceUrl));
  for (const entry of profile.education.filter((row) => !campaignEducation.includes(row))) {
    facts.push({ term: "Education", text: entry.text, sources: sourcesOf(entry) });
  }

  const campaignRows = [...campaignCareer.sort((a, b) => b.startYear - a.startYear), ...campaignEducation];
  if (campaignRows.length > 0) {
    const first = campaignRows[0];
    claimItems.push({
      source: { label: first.sourceName, url: first.sourceUrl, date: first.sourceDate },
      item: {
        heading: campaignEducation.length > 0 || campaignCareer.length > 0 ? "Career and education" : "Career",
        tag: "Campaign says",
        text: "",
        parts: campaignRows.map((row) => ({ text: row.text, muted: "startYear" in row ? `(${yearsLabel(row as CareerEntry)})` : undefined })),
      },
    });
  }

  const issueOrder = stanceIssues().map((issue) => issue.id);
  const said = stances.filter((stance) => !isHouseVote(stance)).sort((a, b) => issueOrder.indexOf(a.issueId) - issueOrder.indexOf(b.issueId));
  for (const stance of said) {
    claimItems.push({
      source: { label: stance.sourceName, url: stance.sourceUrl, date: stance.sourceDate },
      item: { heading: issueLabel(stance.issueId), text: stance.text },
    });
  }

  const claims: ClaimGroup[] = [];
  for (const { source, item } of claimItems) {
    const last = claims.at(-1);
    if (last && last.source.url === source.url) last.items.push(item);
    else claims.push({ source, items: [item] });
  }

  const covered = new Set(stances.map((stance) => stance.issueId));
  const missingIssues = stanceIssues()
    .filter((issue) => !covered.has(issue.id))
    .map((issue) => issue.label);
  return { profile, facts, claims, missingIssues, stances };
}

/** Background line for the race overview: checked service first, then campaign career, then the stored bio. */
export function backgroundParts(person: PersonView): Array<{ says: boolean; text: string; muted?: string }> {
  const profile = profileFor(person.id);
  const federal = (entry: CareerEntry) => (/^U\.S\. (representative|senator)\b/i.test(entry.text) ? 0 : 1);
  const career = profile.career.filter((entry) => !isCandidacy(entry)).sort((a, b) => federal(a) - federal(b) || b.startYear - a.startYear);
  const checked = career.filter((entry) => !CAMPAIGN_SOURCE.test(entry.sourceName) || isOfficialSource(entry.sourceName, entry.sourceUrl));
  if (checked.length > 0) {
    return checked.slice(0, 2).map((entry) => ({ says: false, text: entry.text, muted: `(${yearsLabel(entry)})` }));
  }
  const campaign = career.filter((entry) => !checked.includes(entry));
  if (campaign.length > 0) {
    return [...campaign]
      .sort((a, b) => a.startYear - b.startYear)
      .slice(0, 2)
      .map((entry) => ({ says: true, text: entry.text, muted: `(${yearsLabel(entry)})` }));
  }
  if (profile.bio) return [{ says: false, text: profile.bio.text }];
  return [];
}

export function stanceFor(id: string, issueId: string): Stance | null {
  return stancesFor(id).find((stance) => stance.issueId === issueId) ?? null;
}
