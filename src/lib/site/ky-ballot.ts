import type { FinanceDirect } from "@/lib/finance/model";
import { candidateTotalsUrl } from "@/lib/finance/model";

/** Kentucky November 3, 2026 federal ballot. Checked November 3, 2026. */
export const KY_BALLOT_CHECKED = "2026-11-03";

export const KY_BALLOT_SOURCES = [
  {
    name: "Kentucky Secretary of State, 2026 General Election candidate filings",
    url: "https://web.sos.ky.gov/candidatefilings/Default.aspx?id=3",
    note: "List All Candidates for the 2026 General Election. Retrieved November 3, 2026.",
  },
  {
    name: "Clerk of the U.S. House, nominees for November 3, 2026",
    url: "https://clerk.house.gov/member_info/electionInfo/2026/120-nominations.pdf",
    note: "Published October 8, 2026. A star marks a current House member. Footnotes name who is not on the ballot.",
  },
  {
    name: "OpenFEC candidate and committee totals, 2026 cycle",
    url: "https://api.open.fec.gov/v1/candidates/totals/",
    note: "Retrieved November 3, 2026. Coverage ends October 14, 2026 on every total that was returned.",
  },
] as const;

export const KY_POLLS = {
  hours: "6:00 a.m. to 6:00 p.m. local time",
  hoursUrl: "https://elect.ky.gov/Frequently-Asked-Questions/Pages/Election-Day-Information.aspx",
  lookupUrl: "https://www.govote.ky.gov",
  lookupLabel: "govote.ky.gov",
  noticeUrl: "https://govoteky.com",
} as const;

export type KyFinance = {
  receipts: number;
  disbursements: number;
  cash: number | null;
  debts: number | null;
  coverageStart: string | null;
  coverageEnd: string;
  report: string;
  sourceLabel: "FEC candidate totals" | "FEC committee report";
  sourceUrl: string;
  committeeId: string | null;
};

export type KyPerson = {
  id: string;
  name: string;
  party: string;
  role: "nominee" | "write-in";
  fecCandidateId: string | null;
  alsoFecIds: string[];
  holdsOffice: boolean;
  finance: KyFinance | null;
};

export type KyRace = {
  raceId: string;
  note: string | null;
  people: KyPerson[];
};

const END = "2026-10-14";

function money(
  id: string,
  receipts: number,
  disbursements: number,
  cash: number | null,
  debts: number | null,
  coverageStart: string | null,
  sourceLabel: KyFinance["sourceLabel"] = "FEC candidate totals",
  committeeId: string | null = null,
): KyFinance {
  return {
    receipts,
    disbursements,
    cash,
    debts,
    coverageStart,
    coverageEnd: END,
    report: "PRE-GENERAL",
    sourceLabel,
    sourceUrl: committeeId
      ? `https://www.fec.gov/data/committee/${committeeId}/`
      : candidateTotalsUrl(id, 2026),
    committeeId,
  };
}

const SENATE: KyRace = {
  raceId: "2026-senate-KY",
  note: "Mitch McConnell is not a candidate.",
  people: [
    {
      id: "S6KY00286",
      name: "Andy Barr",
      party: "Republican Party",
      role: "nominee",
      fecCandidateId: "S6KY00286",
      alsoFecIds: [],
      holdsOffice: false,
      finance: money(
        "S6KY00286",
        12476747.89,
        14615968.43,
        1553857.1,
        0,
        null,
        "FEC committee report",
        "C00467571",
      ),
    },
    {
      id: "S6KY00385",
      name: "Charles Booker",
      party: "Democratic Party",
      role: "nominee",
      fecCandidateId: "S6KY00385",
      alsoFecIds: [],
      holdsOffice: false,
      finance: money("S6KY00385", 1936323.82, 1632724.93, 303598.89, 130576.87, "2025-10-01"),
    },
    {
      id: "S6KY00377",
      name: "Christopher Campbell",
      party: "Kentucky Party",
      role: "nominee",
      fecCandidateId: "S6KY00377",
      alsoFecIds: [],
      holdsOffice: false,
      finance: money("S6KY00377", 0, 0, 0, null, "2026-09-30"),
    },
    {
      id: "sos-ky-2026-murphy",
      name: "Thomas Michael Murphy",
      party: "Write-in",
      role: "write-in",
      fecCandidateId: null,
      alsoFecIds: [],
      holdsOffice: false,
      finance: null,
    },
  ],
};

const HOUSE: KyRace[] = [
  {
    raceId: "2026-house-KY-01",
    note: null,
    people: [
      person("H6KY01110", "James R. Comer", "Republican Party", true, money("H6KY01110", 2318360.81, 3904151.06, 1623432.27, null, "2025-01-01")),
      person("H6KY01169", 'John "Drew" Williams', "Democratic Party", false, money("H6KY01169", 223179.9, 213880.62, 7976.68, null, "2025-04-01")),
    ],
  },
  {
    raceId: "2026-house-KY-02",
    note: null,
    people: [
      person("H8KY02031", "S. Brett Guthrie", "Republican Party", true, money("H8KY02031", 5986647.25, 4905596.15, 1447295.54, null, "2025-01-01")),
      person("H6KY02068", "Megan Wingfield", "Democratic Party", false, money("H6KY02068", 9584.49, 7832.25, 1270.59, null, "2025-04-01")),
      person("H8KY02106", "Thomas A. Loecken", "Independent", false, null),
    ],
  },
  {
    raceId: "2026-house-KY-03",
    note: null,
    people: [
      person("H2KY03206", "Morgan McGarvey", "Democratic Party", true, money("H2KY03206", 1998328.22, 1327899.66, 1933845.66, null, "2025-01-01")),
      person("H6KY03223", "Maria Teresa Rodriguez", "Republican Party", false, money("H6KY03223", 84148.7, 43767.87, 40280.83, null, "2026-01-01")),
    ],
  },
  {
    raceId: "2026-house-KY-04",
    note: "Thomas Massie lost the primary and is not on this ballot.",
    people: [
      person("H6KY04171", "Ed Gallrein", "Republican Party", false, money("H6KY04171", 4095784.14, 3662248.65, 433535.49, 0, "2025-10-01")),
      person("H6KY04189", "Melissa Claire Strange", "Democratic Party", false, money("H6KY04189", 157330.4, 123485.44, 40742.09, 20000, "2025-10-01")),
      person("H6KY04205", "Jeremy Todd", "Libertarian Party", false, money("H6KY04205", 30837.92, 27448.9, 3389.02, 0, "2026-04-01"), ["H6KY04213"]),
      writeIn("sos-ky-2026-peter-williams", "Peter Harmon Williams"),
    ],
  },
  {
    raceId: "2026-house-KY-05",
    note: null,
    people: [
      person("H0KY05015", "Hal Rogers", "Republican Party", true, money("H0KY05015", 1026113.99, 1295441.73, 701923.99, 0, "2025-01-01")),
      person("H6KY05152", "Ned Pillersdorf", "Democratic Party", false, money("H6KY05152", 377088.72, 270619.74, 106493.98, 0, "2025-04-01")),
      person("H2KY05185", "Gerardo Serrano", "Independent", false, null),
      person("H6KY05202", "Mikel Wein", "Independent", false, money("H6KY05202", 4250, 1338.22, 2911.78, 4000, "2026-01-01")),
      person("H2KY05136", "Billy Ray Wilson", "Write-in", false, null, [], "write-in"),
    ],
  },
  {
    raceId: "2026-house-KY-06",
    note: "Andy Barr is not running for this House seat. He is a Senate nominee.",
    people: [
      person("H6KY06192", "Ralph Alvarado", "Republican Party", false, money("H6KY06192", 2307369.27, 2126557.77, 180811.5, 0, "2025-07-01")),
      person("H6KY06184", "Zach Dembo", "Democratic Party", false, money("H6KY06184", 3205461.88, 2585132.32, 620329.56, 0, "2025-06-13")),
      person("H6KY06234", "Jay J Bowman", "Independent", false, money("H6KY06234", 18957.81, 18183.45, 215.73, 0, "2025-10-21")),
      person("H6KY06242", "Pete Lynch", "Kentucky Party", false, null),
      person("H6KY06283", "Robert Quigley", "Write-in", false, null, [], "write-in"),
    ],
  },
];

function person(
  id: string,
  name: string,
  party: string,
  holdsOffice: boolean,
  finance: KyFinance | null,
  alsoFecIds: string[] = [],
  role: KyPerson["role"] = "nominee",
): KyPerson {
  return {
    id,
    name,
    party,
    role,
    fecCandidateId: id,
    alsoFecIds,
    holdsOffice,
    finance,
  };
}

function writeIn(id: string, name: string): KyPerson {
  return {
    id,
    name,
    party: "Write-in",
    role: "write-in",
    fecCandidateId: null,
    alsoFecIds: [],
    holdsOffice: false,
    finance: null,
  };
}

const RACES = [SENATE, ...HOUSE];

export function kyBallot(raceId: string): KyRace | null {
  return RACES.find((race) => race.raceId === raceId) ?? null;
}

export function kyPerson(id: string): { race: KyRace; person: KyPerson } | null {
  for (const race of RACES) {
    const person = race.people.find(
      (row) => row.id === id || row.fecCandidateId === id || row.alsoFecIds.includes(id),
    );
    if (person) return { race, person };
  }
  return null;
}

export function kyBallotIds(race: KyRace): Set<string> {
  return new Set(
    race.people.flatMap((person) => [person.fecCandidateId, person.id, ...person.alsoFecIds].filter((id): id is string => Boolean(id))),
  );
}

export function rosterMoney(raceId: string, person: KyPerson): FinanceDirect | null {
  if (!person.finance || !person.fecCandidateId) return null;
  const row = person.finance;
  return {
    scope: "cycle",
    candidateId: person.fecCandidateId,
    raceId,
    name: person.name,
    committeeId: row.committeeId,
    committeeName: row.committeeId === "C00467571" ? "ANDY BARR FOR SENATE, INC." : null,
    cycle: 2026,
    receipts: row.receipts,
    disbursements: row.disbursements,
    cashOnHand: row.cash,
    debts: row.debts,
    coverageStart: row.coverageStart,
    coverageEnd: row.coverageEnd,
    fileNumber: null,
    sourceUrl: row.sourceUrl,
    sourceLabel: row.sourceLabel,
    updatedAt: `${KY_BALLOT_CHECKED}T00:00:00Z`,
  };
}

export function calendarDay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
