import calendar from "../../../data/ky-election-calendar.json";
import counties from "../../../data/ky-counties.json";
import { shortMoney } from "@/lib/finance/model";
import { dayLabel } from "@/lib/format";
import { stanceIssues } from "@/lib/site/stances";
import { stateConfig } from "@/lib/states";
import { lastName } from "./party";
import { allRaces, defaultPair, stanceFor, type PersonView, type RaceView } from "./people";
import { RESULTS_SOURCE, RESULTS_VISIBLE, winnerName } from "./results-gate";

export type AskLink = { label: string; href: string };
export type AskSource = { label: string; url: string };

export type AskAnswer = {
  found: boolean;
  /** Bold opening, then plain text. */
  lead: [string, string?];
  people?: Array<{ person: PersonView; status: string }>;
  groups?: Array<{ title: string; href: string; people: PersonView[] }>;
  stances?: Array<{ person: PersonView; text: string | null }>;
  bars?: Array<{ person: PersonView; value: number | null }>;
  sources: AskSource[];
  next: AskLink[];
};

/** Checked in order: specific topics before broad words like "cost" and "prices". */
const ISSUE_WORDS: Array<[string, RegExp]> = [
  ["health", /health|medicaid|medicare|insurance|\baca\b|hospital/],
  ["data", /data cent|utilit|electric|power bill|energy/],
  ["immigration", /immigra|border|deport|asylum/],
  ["debt", /national debt|federal debt|deficit/],
  ["cost", /cost of living|prices|inflation|afford|gas|fuel|cost/],
];

const FILINGS_SOURCES = (): AskSource[] => [
  { label: `${stateConfig().filings.name}, candidate filings`, url: stateConfig().filings.href },
  { label: "Clerk of the House, 2026 nominations", url: "https://clerk.house.gov/member_info/electionInfo/2026/120-nominations.pdf" },
];

function racePath(race: RaceView): string {
  return `/races/${race.raceId}`;
}

function comparePath(race: RaceView): string {
  const pair = defaultPair(race);
  return pair ? `/races/${race.raceId}/compare?a=${pair[0].id}&b=${pair[1].id}` : racePath(race);
}

function nameWords(name: string): string {
  return name
    .toLowerCase()
    .replace(/"[^"]*"/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Names a question may use: John "Drew" Williams is "john drew williams", "john williams" or "drew williams". */
function fullNames(name: string): string[] {
  const stripped = nameWords(name);
  const last = lastName(name).toLowerCase();
  const first = stripped.split(" ")[0];
  const nickname = name.match(/"([^"]+)"/)?.[1]?.toLowerCase();
  return [...new Set([name.toLowerCase().replace(/"/g, ""), stripped, `${first} ${last}`, ...(nickname ? [`${nickname} ${last}`] : [])])];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fecSource(person: PersonView): AskSource {
  return { label: `${person.name}, FEC candidate totals`, url: `https://www.fec.gov/data/candidate/${person.funding?.candidateId ?? person.id}/` };
}

function statusLine(person: PersonView): string {
  return person.role;
}

/** Answers questions from the site's own records. Returns a plain "no answer" when nothing matches. */
export function answerQuestion(raw: string): AskAnswer {
  const races = allRaces();
  const state = stateConfig();
  const people = races.flatMap((race) => race.people.map((person) => ({ person, race })));
  const q = raw.toLowerCase().replace(/[’']/g, "'");

  const districtMatch = q.match(/(?:district|\bd|ky-?)\s*#?([1-9])\b/) ?? q.match(/\b([1-9])(?:st|nd|rd|th)\s+district/);
  const race = /senat/.test(q)
    ? (races.find((row) => row.office === "senate") ?? null)
    : districtMatch
      ? (races.find((row) => row.district && Number(row.district) === Number(districtMatch[1])) ?? null)
      : null;

  const mentions = (phrase: string) => new RegExp(`\\b${escapeRegExp(phrase)}\\b`).test(q);
  const byFullName = people.filter(({ person }) => fullNames(person.name).some(mentions));
  const bySurname = people.filter(({ person }) => mentions(lastName(person.name).toLowerCase()) && !byFullName.some((row) => lastName(row.person.name) === lastName(person.name)));
  const surnameInRace = race ? bySurname.filter((row) => row.race.raceId === race.raceId) : [];
  const named = [...byFullName, ...(surnameInRace.length ? surnameInRace : bySurname)];
  const shared = named.filter((row) => named.some((other) => other !== row && lastName(other.person.name) === lastName(row.person.name)));
  const county = [...counties].sort((a, b) => b.name.length - a.name.length).find((row) => new RegExp(`\\b${escapeRegExp(row.name.toLowerCase())}\\s+county\\b`).test(q));
  const issueId = ISSUE_WORDS.find(([, words]) => words.test(q))?.[0];

  if (/where (do|can|should|will) i vote|where to vote|polling (place|location)|precinct|voting location|register to vote|am i registered/.test(q)) {
    return {
      found: false,
      lead: [`Look up where you vote on the ${state.voterInfo.label}.`, `The state of ${state.name} runs it.`],
      sources: [{ label: state.voterInfo.label, url: state.voterInfo.href }],
      next: [{ label: "My races", href: "/ballot" }],
    };
  }

  if (shared.length > 0) {
    const surname = lastName(shared[0].person.name);
    return {
      found: false,
      lead: [`${shared.length} candidates are named ${surname}.`, "Ask again with a full name."],
      people: shared.map(({ person, race: home }) => ({ person, status: home.title })),
      sources: [],
      next: shared.map(({ person }) => ({ label: person.name, href: `/candidates/${person.id}` })),
    };
  }

  if (/debate|transcript|speech|said in|town hall/.test(q)) {
    const target = race ?? named[0]?.race ?? null;
    return {
      found: false,
      lead: [`We have no debate transcripts or speech records${target ? ` for ${target.title}` : ""}.`, "We won’t summarize what a candidate said without a source."],
      sources: [],
      next: target
        ? [
            { label: "Their published positions", href: `${racePath(target)}?tab=issues` },
            { label: "Statements on file", href: `${racePath(target)}?tab=news` },
          ]
        : [{ label: "Search", href: "/search" }],
    };
  }

  const asksResult = /\bwho\s+won\b|\bwinners?\b|\bwho\s+(?:is|was|got)\s+(?:the\s+)?elected\b|\bresults?\b/.test(q);
  if (asksResult && !RESULTS_VISIBLE) {
    return {
      found: false,
      lead: ["We don’t show winners yet.", "The state publishes the official results."],
      sources: [],
      next: [{ label: "See official results", href: state.results.official.href }],
    };
  }
  if (asksResult) {
    const scope = race ? [race] : named[0] ? [named[0].race] : races;
    const won = scope.flatMap((row) => {
      const name = winnerName(row.raceId);
      const person = name ? row.people.find((item) => nameWords(item.name).includes(nameWords(name).split(" ").at(-1) ?? "")) : null;
      return person ? [{ race: row, person }] : [];
    });
    const sources = [{ label: RESULTS_SOURCE.label, url: RESULTS_SOURCE.url }];
    if (won.length === 0) return { found: false, lead: ["No winner is marked for this race."], sources, next: [{ label: "My races", href: "/ballot" }] };
    if (won.length === 1) {
      return {
        found: true,
        lead: [`Won: ${won[0].person.name},`, `${won[0].race.title}.`],
        sources,
        next: [
          { label: won[0].person.name, href: `/candidates/${won[0].person.id}` },
          { label: won[0].race.title, href: racePath(won[0].race) },
        ],
      };
    }
    return {
      found: true,
      lead: [`Won, in ${won.length} ${state.name} races:`],
      people: won.map((row) => ({ person: row.person, status: `Won: ${row.race.title}` })),
      sources,
      next: [{ label: "My races", href: "/ballot" }],
    };
  }

  if (/poll|ahead|leading|winning|odds/.test(q)) {
    return {
      found: false,
      lead: ["No qualifying polls are available", `for ${state.name}’s ${state.cycle} federal races, so we can’t say who is ahead.`],
      sources: [],
      next: [{ label: "My races", href: "/ballot" }],
    };
  }

  if (county) {
    const districts = county.districts.map((code) => races.find((row) => row.district === code)).filter((row): row is RaceView => Boolean(row));
    const scope = [races.find((row) => row.office === "senate"), ...districts].filter((row): row is RaceView => Boolean(row));
    return {
      found: true,
      lead: [
        `${county.name} County votes in ${scope.length} federal races:`,
        `${scope.map((row) => row.title).join(" and ")}${districts.length > 1 ? ". The county is split, so your street address decides your House district" : ""}.`,
      ],
      groups: scope.map((row) => ({ title: row.title, href: racePath(row), people: row.people })),
      sources: [{ label: "Census Bureau, 120th Congress district files", url: county.districtSource }],
      next: [{ label: `Save ${county.name} County as my races`, href: `/ballot?county=${encodeURIComponent(county.name)}` }],
    };
  }

  if (issueId && (named.length > 0 || race)) {
    const who = named.length > 0 ? named.map((row) => row.person) : race!.people;
    const label = (stanceIssues().find((issue) => issue.id === issueId)?.label ?? issueId).toLowerCase();
    const rows = who.map((person) => ({ person, stance: stanceFor(person.id, issueId) }));
    const has = rows.filter((row) => row.stance);
    const target = named[0]?.race ?? race!;
    const lead: AskAnswer["lead"] =
      named.length === 1
        ? rows[0].stance
          ? [`${named[0].person.name} on ${label}:`, rows[0].stance.text]
          : [`We have no sourced statement from ${named[0].person.name} on ${label}.`]
        : [`${has.length} of ${rows.length} candidates`, `have a sourced statement on ${label}.`];
    return {
      found: has.length > 0,
      lead,
      stances: named.length === 1 ? undefined : rows.map((row) => ({ person: row.person, text: row.stance?.text ?? null })),
      sources: has.map((row) => ({ label: `${row.stance!.sourceName}, ${dayLabel(row.stance!.sourceDate)}`, url: row.stance!.sourceUrl })),
      next: [{ label: `Compare ${target.title} candidates`, href: comparePath(target) }],
    };
  }

  if (/rais|money|cash|spen|fund|donat|fec|dollar|\$/.test(q) && (named.length > 0 || race)) {
    if (named.length === 1 && !/each|all|every|who|most/.test(q)) {
      const { person, race: home } = named[0];
      const funding = person.funding;
      const next = [{ label: `${home.title} campaign finance`, href: `${racePath(home)}?tab=money` }];
      if (!funding || funding.status !== "ok" || funding.receipts == null) {
        return { found: false, lead: [`${person.name} has no campaign report on file with the FEC.`], sources: [], next };
      }
      return {
        found: true,
        lead: [
          `${person.name} raised ${shortMoney(funding.receipts)},`,
          `spent ${shortMoney(funding.disbursements ?? 0)} and had ${shortMoney(funding.cash ?? 0)} on hand${funding.coverageEnd ? ` through ${dayLabel(funding.coverageEnd)}` : ""}.`,
        ],
        sources: [fecSource(person)],
        next: [{ label: `Who gives to ${lastName(person.name)}`, href: `/finance/candidates/${person.id}` }, ...next],
      };
    }
    const target = race ?? named[0].race;
    const key = /cash|left|bank/.test(q) ? "cash" : /spen/.test(q) ? "disbursements" : "receipts";
    const heading = { cash: "Cash on hand", disbursements: "Money spent", receipts: "Money raised" }[key];
    const reported = target.people.filter((person) => person.funding?.status === "ok");
    const end = reported.find((person) => person.funding?.coverageEnd)?.funding?.coverageEnd;
    return {
      found: reported.length > 0,
      lead: [`${heading} by each ${target.title} campaign,`, `as reported to the FEC${end ? ` through ${dayLabel(end)}` : ""}.`],
      bars: target.people.map((person) => ({ person, value: person.funding?.status === "ok" ? (person.funding[key] ?? null) : null })).sort((a, b) => (b.value ?? -1) - (a.value ?? -1)),
      sources: reported.map(fecSource),
      next: [{ label: `${target.title} campaign finance`, href: `${racePath(target)}?tab=money` }],
    };
  }

  if (race || named.length > 0) {
    if (named.length === 1 && !race && !/running|who|candidates/.test(q)) {
      const { person, race: home } = named[0];
      const article = /nominee/.test(person.role) ? "the" : "a";
      return {
        found: true,
        lead: [person.name, `is ${article} ${article === "the" ? person.role : person.role.toLowerCase()} for ${home.title}.`],
        people: [{ person, status: statusLine(person) }],
        sources: [],
        next: [
          { label: `${lastName(person.name)}’s profile`, href: `/candidates/${person.id}` },
          { label: `Everyone running for ${home.title}`, href: racePath(home) },
        ],
      };
    }
    const target = race ?? named[0].race;
    return {
      found: true,
      lead: [`${target.people.length} candidates are running for ${target.title}.`, target.subtitle ?? undefined],
      people: target.people.map((person) => ({ person, status: statusLine(person) })),
      sources: FILINGS_SOURCES(),
      next: [{ label: `Compare ${target.title} candidates`, href: comparePath(target) }],
    };
  }

  if (/when|date|certif|count|jan|sworn|term/.test(q)) {
    const general = calendar.find((row) => row.label === "General election");
    const certify = calendar.find((row) => /certification/i.test(row.label));
    const terms = calendar.find((row) => /term/i.test(row.label));
    const parts = [
      certify ? `The deadline to certify the count was ${dayLabel(certify.date)}.` : null,
      terms ? `New terms begin ${dayLabel(terms.date)}.` : null,
      "We don’t show vote counts; the state publishes them.",
    ].filter(Boolean);
    return {
      found: true,
      lead: [`${state.name} voted on ${dayLabel(general?.date ?? state.generalElection)}.`, parts.join(" ")],
      sources: general ? [{ label: `${general.sourceName}, ${state.cycle} calendar`, url: general.sourceUrl }] : [],
      next: [{ label: "See official results", href: state.results.official.href }],
    };
  }

  return {
    found: false,
    lead: ["We don’t have a sourced answer to that.", `Ask about a ${state.name} Senate or House race: who is running, money raised, where a candidate stands, or your county.`],
    sources: [],
    next: [],
  };
}

export function raceQuestions(race: RaceView): string[] {
  const name = race.office === "senate" ? "Senate" : race.short;
  return [`Where do the ${name} candidates stand on health care?`, `How much has each ${name} candidate raised?`];
}
