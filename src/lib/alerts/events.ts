import { withBasePath } from "../base-path";
import type { PublicCandidate } from "../data/view";
import type { FinanceDirect } from "../finance/model";
import { kyBallot, kyPerson } from "../site/ky-ballot";
import { houseDistrictDigitClass, isFederalRaceIdFor, stateConfig } from "../states";

const state = stateConfig();
const federalCandidateId = new RegExp(`^[SH]\\d${state.code}\\d{5}$`);

export const SOS_SENATE = state.filings.href;
export const SOS_HOUSE = "https://web.sos.ky.gov/candidatefilings/Default.aspx?id=4";

export type AlertEvent = { id: string; subject: string; source: string; page: string; follow: string[] };
export type SosFiling = { id: string; raceId: string; name: string; filed: string; sourceUrl: string };

function officialUrl(value: unknown, domain: string): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === domain || url.hostname.endsWith(`.${domain}`)) ? url.href : null;
  } catch {
    return null;
  }
}

function candidateTargets(id: string): string[] {
  const person = kyPerson(id)?.person;
  return [...new Set([id, ...(person ? [person.id, ...person.alsoFecIds] : [])])].map((value) => `candidate:${value}`);
}

export function fecReportEvents(rows: FinanceDirect[]): AlertEvent[] {
  return rows.flatMap((row) => {
    const { candidateId, raceId, fileNumber, committeeId } = row;
    const name = kyPerson(candidateId)?.person.name ?? row.name;
    const source = officialUrl(row.sourceUrl, "fec.gov");
    if (row.scope !== "period" || !raceId || !isFederalRaceIdFor(state, raceId) || !name || !source ||
        !/^C\d{8}$/.test(committeeId ?? "") || !/^\d+$/.test(fileNumber ?? "") || !federalCandidateId.test(candidateId)) return [];
    return [{
      id: `fec:${committeeId}:${fileNumber}`,
      subject: `New FEC report: ${name}`,
      source,
      page: withBasePath(`/candidates/${kyPerson(candidateId)?.person.id ?? candidateId}`),
      follow: [`race:${raceId}`, ...candidateTargets(candidateId)],
    }];
  });
}

function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&(?:quot|amp|apos|#39|#34|nbsp);/g, (entity) => ({
    "&quot;": '"', "&amp;": "&", "&apos;": "'", "&#39;": "'", "&#34;": '"', "&nbsp;": " ",
  })[entity] ?? entity).replace(/\s+/g, " ").trim();
}

export function parseSosFilings(html: string, listUrl: string): SosFiling[] {
  const year = /<option selected="selected"[^>]*>\s*(\d{4})[^<]*Election\s*<\/option>/i.exec(html)?.[1];
  if (!year || !html.includes('id="ctl00_MainContent_pOfficeResults"')) throw new Error("Unrecognized Kentucky SOS filing list");
  const active = html.split(/<summary[^>]*wdd-header/i)[0];
  const filings: SosFiling[] = [];
  for (const row of active.matchAll(/<tr\b[^>]*class="boldleft"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
    if (cells.length !== 6) throw new Error("Unrecognized Kentucky SOS filing row");
    const person = /<a\b[^>]*href="Default\.aspx\?cand=(\d+)"[^>]*>([\s\S]*?)<\/a>/i.exec(cells[0]);
    const office = plainText(cells[2]);
    const digits = houseDistrictDigitClass(state);
    const district = digits ? new RegExp(`[?;&]district=([${digits}])\\b`, "i").exec(cells[3])?.[1] : undefined;
    const raceId = office === "US Senator" ? `${year}-senate-${state.code}` : office === "US Representative" && district ? `${year}-house-${state.code}-0${district}` : null;
    const filed = plainText(cells[5]);
    if (!person || !raceId || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(filed)) continue;
    filings.push({ id: person[1], name: plainText(person[2]), raceId, filed, sourceUrl: new URL(`Default.aspx?cand=${person[1]}`, listUrl).href });
  }
  return filings;
}

function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function sosEvents(rows: SosFiling[], roster: PublicCandidate[] = []): AlertEvent[] {
  return rows.map((row) => {
    const filedName = nameKey(row.name);
    const matches = kyBallot(row.raceId)?.people.filter(({ name }) => nameKey(name) === filedName);
    const person = matches?.length === 1 ? matches[0] : null;
    const stored = person ? [] : roster.filter((candidate) => candidate.raceId === row.raceId && nameKey(candidate.displayName) === filedName);
    const candidate = stored.length === 1 ? stored[0] : null;
    const profile = person?.id ?? candidate?.candidateId;
    const candidateIds = candidate?.alternateFilings.map(({ candidateId }) => candidateId) ?? [];
    if (profile) candidateIds.unshift(profile);
    return {
      id: `sos:${row.id}`,
      subject: `New candidate filing: ${row.name}`,
      source: row.sourceUrl,
      page: withBasePath(profile ? `/candidates/${encodeURIComponent(profile)}` : `/races/${row.raceId}`),
      follow: [...new Set([`race:${row.raceId}`, ...candidateIds.flatMap(candidateTargets)])],
    };
  });
}

export function certifiedEvents(value: unknown): AlertEvent[] {
  if (!value || typeof value !== "object") return [];
  const document = value as Record<string, unknown>;
  const races = Array.isArray(value) ? value : document.races;
  if (!races || typeof races !== "object") return [];
  return Object.entries(races).flatMap(([key, item]: [string, unknown]) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const raceId = typeof row.raceId === "string" ? row.raceId : key;
    const source = officialUrl(row.sourceUrl ?? document.sourceUrl, "ky.gov");
    if (!isFederalRaceIdFor(state, raceId) || row.status !== "certified" || !source) return [];
    const primary = row.election === "primary";
    if (primary && (typeof row.party !== "string" || !row.party)) return [];
    if (row.election != null && row.election !== "general" && !primary) return [];
    const candidateIds = Array.isArray(row.candidates) ? row.candidates.flatMap((candidate) => {
      const id = candidate?.candidateId;
      return typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id) ? [id] : [];
    }) : [];
    if (!primary) candidateIds.push(...(kyBallot(raceId)?.people.map(({ id }) => id) ?? []));
    return [{
      id: primary ? `certified:${raceId}:primary:${row.party}` : `certified:${raceId}`,
      subject: "Certified results posted",
      source,
      page: withBasePath(`/races/${raceId}`),
      follow: [...new Set([`race:${raceId}`, ...candidateIds.flatMap(candidateTargets)])],
    }];
  });
}

export function mergeEvents(events: AlertEvent[]): AlertEvent[] {
  const byId = new Map<string, AlertEvent>();
  for (const event of events) {
    const current = byId.get(event.id);
    if (current) current.follow = [...new Set([...current.follow, ...event.follow])];
    else byId.set(event.id, { ...event });
  }
  return [...byId.values()];
}
