/**
 * Kentucky's two U.S. senators and seven statewide constitutional officers.
 * Every name, party, and term below was checked on an official site on
 * 2026-11-19. Photos are used only when the license is clear (U.S. Congress
 * official portraits are public domain). State officers have no stored photo,
 * so the card shows initials.
 */

export const KY_STATEWIDE_CHECKED = "2026-11-19";

export type StatewideSource = { name: string; url: string };

export type StatewideOfficial = {
  id: string;
  office: string;
  name: string;
  party: "Republican Party" | "Democratic Party";
  /** Plain-language term line. */
  term: string;
  /** Optional extra fact, cited by `noteSource`. */
  note: string | null;
  officialSite: string;
  photo: { src: string; credit: string; sourceUrl: string; license: string } | null;
  sources: StatewideSource[];
};

const SENATE_LIST: StatewideSource = {
  name: "U.S. Senate",
  url: "https://www.senate.gov/states/KY/intro.htm",
};

const RESULTS_2023: StatewideSource = {
  name: "Board of Elections",
  url: "https://elect.ky.gov/results/2020-2029/Documents/Certification%20of%20Election%20Results%20for%202023%20General%20Election%20Final.pdf",
};

const CONSTITUTION_95: StatewideSource = {
  name: "KY Constitution §95",
  url: "https://apps.legislature.ky.gov/law/constitution/Constitution/ViewConstitution?rsn=103",
};

const STATE_TERM = "Elected Nov 7, 2023 for four years. Next election in November 2027.";

export const KY_SENATORS: readonly StatewideOfficial[] = [
  {
    id: "M000355",
    office: "U.S. Senator",
    name: "Mitch McConnell",
    party: "Republican Party",
    term: "Term ends January 2027. Did not run in 2026.",
    note: null,
    officialSite: "https://www.mcconnell.senate.gov/",
    photo: {
      src: "/photos/ky/statewide/M000355.jpg",
      credit: "Official portrait, Biographical Directory of the U.S. Congress",
      sourceUrl: "https://bioguide.congress.gov/bioguide/photo/M/M000355.jpg",
      license: "Public domain",
    },
    sources: [
      SENATE_LIST,
      { name: "Senate Class II", url: "https://www.senate.gov/senators/Class_II.htm" },
      { name: "2026 filings", url: "https://web.sos.ky.gov/candidatefilings/Default.aspx?id=3" },
    ],
  },
  {
    id: "P000603",
    office: "U.S. Senator",
    name: "Rand Paul",
    party: "Republican Party",
    term: "Term ends January 2029.",
    note: null,
    officialSite: "https://www.paul.senate.gov/",
    photo: {
      src: "/photos/ky/statewide/P000603.jpg",
      credit: "Official portrait, Biographical Directory of the U.S. Congress",
      sourceUrl: "https://bioguide.congress.gov/bioguide/photo/P/P000603.jpg",
      license: "Public domain",
    },
    sources: [
      SENATE_LIST,
      { name: "Senate Class III", url: "https://www.senate.gov/senators/Class_III.htm" },
    ],
  },
];

export const KY_CONSTITUTIONAL_OFFICERS: readonly StatewideOfficial[] = [
  {
    id: "ky-governor",
    office: "Governor",
    name: "Andy Beshear",
    party: "Democratic Party",
    term: STATE_TERM,
    note: "Second consecutive term. Term-limited in 2027.",
    officialSite: "https://governor.ky.gov/",
    photo: null,
    sources: [
      { name: "Governor’s office", url: "https://governor.ky.gov/about/gubernatorial-history" },
      { name: "KY Constitution §71", url: "https://apps.legislature.ky.gov/law/constitution/Constitution/ViewConstitution?rsn=79" },
      RESULTS_2023,
      CONSTITUTION_95,
    ],
  },
  {
    id: "ky-lt-governor",
    office: "Lieutenant Governor",
    name: "Jacqueline Coleman",
    party: "Democratic Party",
    term: STATE_TERM,
    note: "Elected on the governor’s ticket.",
    officialSite: "https://ltgovernor.ky.gov/",
    photo: null,
    sources: [
      { name: "Lieutenant governor’s office", url: "https://ltgovernor.ky.gov/" },
      RESULTS_2023,
      CONSTITUTION_95,
    ],
  },
  {
    id: "ky-attorney-general",
    office: "Attorney General",
    name: "Russell Coleman",
    party: "Republican Party",
    term: STATE_TERM,
    note: null,
    officialSite: "https://www.ag.ky.gov/",
    photo: null,
    sources: [{ name: "Attorney general’s office", url: "https://www.ag.ky.gov/" }, RESULTS_2023, CONSTITUTION_95],
  },
  {
    id: "ky-secretary-of-state",
    office: "Secretary of State",
    name: "Michael G. Adams",
    party: "Republican Party",
    term: STATE_TERM,
    note: null,
    officialSite: "https://www.sos.ky.gov/",
    photo: null,
    sources: [
      { name: "Secretary of state’s office", url: "https://www.sos.ky.gov/sos-office/Pages/default.aspx" },
      RESULTS_2023,
      CONSTITUTION_95,
    ],
  },
  {
    id: "ky-treasurer",
    office: "State Treasurer",
    name: "Mark H. Metcalf",
    party: "Republican Party",
    term: STATE_TERM,
    note: null,
    officialSite: "https://treasury.ky.gov/",
    photo: null,
    sources: [{ name: "Kentucky State Treasury", url: "https://treasury.ky.gov/" }, RESULTS_2023, CONSTITUTION_95],
  },
  {
    id: "ky-auditor",
    office: "Auditor of Public Accounts",
    name: "Allison Ball",
    party: "Republican Party",
    term: STATE_TERM,
    note: null,
    officialSite: "https://www.auditor.ky.gov/",
    photo: null,
    sources: [{ name: "Auditor of Public Accounts", url: "https://www.auditor.ky.gov/" }, RESULTS_2023, CONSTITUTION_95],
  },
  {
    id: "ky-agriculture",
    office: "Commissioner of Agriculture",
    name: "Jonathan Shell",
    party: "Republican Party",
    term: STATE_TERM,
    note: null,
    officialSite: "https://www.kyagr.com/",
    photo: null,
    sources: [{ name: "Kentucky Department of Agriculture", url: "https://www.kyagr.com/" }, RESULTS_2023, CONSTITUTION_95],
  },
];

export function kyStatewide(): { senators: readonly StatewideOfficial[]; officers: readonly StatewideOfficial[] } {
  return { senators: KY_SENATORS, officers: KY_CONSTITUTIONAL_OFFICERS };
}
