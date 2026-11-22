import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import officeholders from "../data/ky-congressional-officeholders.json";
import { KY_FEDERAL_RACES, resultCandidateMatches, type CertifiedResult, type PendingResult, type CertifiedCandidate } from "../src/lib/site/certified-results";
import { kyBallot } from "../src/lib/site/ky-ballot";

type Election = "primary" | "general";
type Report = { raceId: string; parties: string; pages: { number: number; lines: string[] }[] };
const senateTitle = /^(?:United States|U\.?S\.?) Senator$/i;
const houseTitle = /^(?:United States|U\.?S\.?) Representative(?: in Congress)?$/i;
const districtTitle = /^([1-6])(?:st|nd|rd|th) Congressional District$/i;
const countyRow = /^([a-z][a-z .'-]*?)\s+([\d,]+(?:\s+[\d,]+)*)$/i;
const partyLabels = /Write[- ]In\b|Independent\b|[A-Za-z][A-Za-z '-]*? Party\b/gi;
const extractionArtifacts: Record<string, string> = { "FA RIS": "FARIS", "CA TLETT": "CATLETT", "SH ELLEY": "SHELLEY" };

function splitParties(line: string) {
  const labels = line.match(partyLabels) ?? [];
  return labels.join(" ") === line ? labels.map((label) => /^write/i.test(label) ? "Write-in" : label) : [];
}

function reportsFromText(text: string, election: Election, year: number) {
  const reports: Report[] = [];
  const pageBanner = new RegExp(`^Commonwealth of Kentucky .+ Secretary of State ${year} ${election} Election Results$`, "i");
  let current: Report | undefined;
  for (const [index, page] of text.split("\f").entries()) {
    const [banner, title, ...body] = page.split(/\r?\n/).map((line) => line.trim().replace(/\s+/g, " ")).filter(Boolean);
    if (!banner) continue;
    if (!pageBanner.test(banner)) {
      current = undefined;
      continue;
    }
    const district = body[0]?.match(districtTitle)?.[1];
    let raceId: string | undefined;
    if (senateTitle.test(title)) raceId = KY_FEDERAL_RACES[0];
    if (houseTitle.test(title) && district) {
      raceId = KY_FEDERAL_RACES[Number(district)];
      body.shift();
    }
    if (raceId) {
      const parties = body.shift() ?? "";
      current = { raceId, parties, pages: [{ number: index + 1, lines: body }] };
      reports.push(current);
    } else if (countyRow.test(title) && current) {
      current.pages.push({ number: index + 1, lines: [title, ...body] });
    } else {
      current = undefined;
    }
  }
  return reports;
}

function candidateNames(lines: string[]) {
  if (!lines.length || lines.length % 2 !== 0) throw new Error("Incomplete candidate header");
  const names: string[] = [];
  for (let index = 0; index < lines.length; index += 2) {
    const [given, rawSurname] = lines.slice(index, index + 2);
    if (!/^[A-Za-z][A-Za-z .,'’"“”-]*$/.test(given) || !/^(?:Mc)?[A-Z][A-Z .,'’\-]*$/.test(rawSurname)) {
      throw new Error(`Unexpected candidate header: ${given} / ${rawSurname}`);
    }
    const surname = (extractionArtifacts[rawSurname] ?? rawSurname).toLowerCase()
      .replace(/\b[a-z]|(?<=\bmc)[a-z]/g, (letter) => letter.toUpperCase());
    names.push(`${given} ${surname}`);
  }
  if (new Set(names).size !== names.length) throw new Error("Duplicate candidate name");
  return names;
}

function matchRoster(raceId: string, candidate: CertifiedCandidate) {
  const person = kyBallot(raceId)?.people.find((row) => resultCandidateMatches(candidate, row));
  if (person && person.party === candidate.party) return { ...candidate, candidateId: person.id };
  const district = Number(raceId.slice(-2));
  const member = officeholders.find((row) => row.district === district && resultCandidateMatches(candidate, row));
  const id = member?.fecIds.find((candidateId) => candidateId.startsWith("H"));
  return id ? { ...candidate, candidateId: id } : candidate;
}

function parseReport(report: Report, election: Election) {
  const [opening, ...continuations] = report.pages;
  const firstCounty = opening.lines.findIndex((line) => countyRow.test(line));
  if (firstCounty < 0) throw new Error("Missing county rows");
  const header = opening.lines.slice(0, firstCounty);
  const names = candidateNames(header);
  const affiliations = splitParties(report.parties);
  const expectedAffiliations = election === "primary" ? 1 : names.length;
  if (affiliations.length !== expectedAffiliations) throw new Error("Candidate and party columns do not align");
  const counties = new Set<string>();
  const sums = names.map(() => 0);
  let totals: number[] | undefined;
  for (const page of [{ ...opening, lines: opening.lines.slice(firstCounty) }, ...continuations]) {
    const repeatedHeader = page.lines.findIndex((line) => !countyRow.test(line));
    const rows = repeatedHeader < 0 ? page.lines : page.lines.slice(0, repeatedHeader);
    const tail = repeatedHeader < 0 ? [] : page.lines.slice(repeatedHeader);
    if (tail[0] && splitParties(tail[0]).length && tail.shift() !== report.parties) throw new Error(`Party columns changed on page ${page.number}`);
    if (tail.length > 0 && tail.join("\n") !== header.join("\n")) throw new Error(`Candidate header changed on page ${page.number}`);
    for (const line of rows) {
      const match = line.match(countyRow);
      if (!match || totals) throw new Error(`Unexpected row after totals on page ${page.number}`);
      const [, label, cells] = match;
      const values = cells.split(/\s+/).map((cell) => /^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(cell) ? Number(cell.replaceAll(",", "")) : NaN);
      if (values.length !== names.length || values.some((value) => !Number.isSafeInteger(value))) throw new Error(`Invalid totals or column count for ${label}`);
      if (/^total votes$/i.test(label)) {
        totals = values;
      } else {
        const county = label.toLowerCase();
        if (counties.has(county)) throw new Error(`Duplicate county: ${label}`);
        counties.add(county);
        for (const [index, votes] of values.entries()) sums[index] += votes;
      }
    }
  }
  if (counties.size === 0 || (report.raceId === KY_FEDERAL_RACES[0] && counties.size !== 120)) throw new Error(`Unexpected county count: ${counties.size}`);
  if (!totals || totals.some((votes, index) => votes !== sums[index])) throw new Error("County sums disagree with the printed totals");
  const highest = Math.max(...totals);
  if (highest === 0 || totals.filter((votes) => votes === highest).length !== 1) throw new Error("The certified winner requires manual verification");
  const candidates = names.map((name, index) => matchRoster(report.raceId, {
    name, party: affiliations[election === "primary" ? 0 : index], votes: sums[index], winner: sums[index] === highest,
  }));
  return { candidates, party: affiliations[0], countyCount: counties.size };
}

export function readSbeReports(text: string, election: Election, year = 2026) {
  const reports = reportsFromText(text, election, year);
  const seen = new Set<string>();
  const verified = [];
  const rejected = [];
  for (const report of reports) {
    const { raceId, parties, pages } = report;
    const key = election === "primary" ? `${raceId}:${parties}` : raceId;
    if (seen.has(key)) throw new Error(`Duplicate contest: ${key}`);
    seen.add(key);
    try {
      verified.push({ raceId, ...parseReport(report, election), pages: pages.map((page) => page.number) });
    } catch (error) {
      rejected.push(`${key} (pages ${pages[0].number}–${pages.at(-1)?.number}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { verified, rejected };
}

function officialSource(raw: string) {
  const source = new URL(raw);
  if (source.protocol !== "https:" || source.hostname !== "elect.ky.gov" || !/\.pdf$/i.test(source.pathname) || /unofficial/i.test(decodeURIComponent(source.pathname))) {
    throw new Error("Use the official State Board of Elections certification PDF URL");
  }
  return source;
}

export function importResults(text: string, election: Election, certificationDate: string | null, sourceUrl: string, retrievedAt: string) {
  officialSource(sourceUrl);
  const title = new RegExp(`^Official 2026 ${election} Election Results\\s*$`, "im");
  if (!title.test(text) || /\bunofficial\b/i.test(text)) throw new Error("Expected the official 2026 election results PDF");
  const earliestDate = election === "general" ? "2026-11-03" : "2026-05-19";
  if (certificationDate) {
    const date = new Date(certificationDate);
    if (!/^2026-\d\d-\d\d$/.test(certificationDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== certificationDate || certificationDate < earliestDate || certificationDate > retrievedAt) {
      throw new Error("Use the verified certification date");
    }
  } else if (election === "general") {
    throw new Error("The general election import requires the verified certification date");
  }
  const { verified, rejected } = readSbeReports(text, election);
  if (verified.length === 0) throw new Error(`No reconciled Kentucky federal contests: ${rejected.join("; ")}`);
  if (election === "general" && verified.length !== KY_FEDERAL_RACES.length) {
    throw new Error(`Expected seven reconciled general contests, found ${verified.length}. ${rejected.join("; ")}`);
  }
  const results: CertifiedResult[] = verified.map(({ raceId, party, pages, countyCount, candidates }) => {
    const base = { raceId, status: "certified" as const, sourceUrl, retrievedAt, candidates, sourcePages: pages, countyCount };
    if (election === "primary") return { ...base, election, party, certificationDate };
    const missing = kyBallot(raceId)?.people.filter((person) => person.role !== "write-in" && !candidates.some((candidate) => resultCandidateMatches(candidate, person)));
    if (missing?.length) throw new Error(`Verify omitted ballot candidates for ${raceId}: ${missing.map((person) => person.name).join(", ")}`);
    if (!certificationDate) throw new Error("Missing certification date");
    return { ...base, election, certificationDate };
  });
  return { results, rejected };
}

async function main() {
  const [election, pdfOrUrl, date, localPdfSource] = process.argv.slice(2);
  if ((election !== "primary" && election !== "general") || !pdfOrUrl || !date) {
    throw new Error("Usage: tsx scripts/import-certified-results.ts <primary|general> <certification PDF URL or local file> <YYYY-MM-DD or unknown for primary> [official URL for local file]");
  }
  const remote = pdfOrUrl.startsWith("https://");
  const origin = remote ? pdfOrUrl : localPdfSource;
  if (!origin) throw new Error("Provide the official SBE PDF URL alongside a local copy");
  const source = officialSource(origin);
  const scratch = await mkdtemp(join(tmpdir(), "ky-certified-results-"));
  try {
    let pdf = pdfOrUrl;
    if (remote) {
      const response = await fetch(source, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`Could not fetch the SBE PDF (HTTP ${response.status})`);
      officialSource(response.url);
      pdf = join(scratch, "certification.pdf");
      await writeFile(pdf, Buffer.from(await response.arrayBuffer()));
    }
    const text = execFileSync(process.env.PDFTOTEXT ?? "pdftotext", ["-raw", resolve(pdf), "-"], { encoding: "utf8" });
    const retrievedAt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", dateStyle: "short" }).format(new Date());
    const { results: fresh, rejected } = importResults(text, election, date === "unknown" ? null : date, source.href, retrievedAt);
    for (const problem of rejected) console.warn(`Skipped ${problem}`);
    const path = resolve("data/ky-certified-results.json");
    const existing: (CertifiedResult | PendingResult)[] = JSON.parse(await readFile(path, "utf8"));
    const kept = existing.filter((record) => record.election !== election);
    const staged = `${path}.${process.pid}.tmp`;
    try {
      await writeFile(staged, `${JSON.stringify([...kept, ...fresh], null, 2)}\n`, { flag: "wx" });
      await rename(staged, path);
    } finally {
      await rm(staged, { force: true });
    }
    console.log(`Imported ${fresh.length} certified ${election} contests with reconciled county totals.`);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
