/**
 * States the site covers. Kentucky is the only enabled state.
 *
 * Everything that differs by state lives here: district count, time zones,
 * election dates, official results pages and map files. Pages and helpers
 * read these values instead of repeating Kentucky constants.
 *
 * Adding a state means adding an entry here *and* its ballot, results and
 * map data. Leave `enabled: false` until that data is verified.
 */

export type StateCode = "KY";

export type OfficialLink = { readonly href: string; readonly label: string };

export type StateConfig = {
  readonly code: StateCode;
  readonly name: string;
  /** Lowercase path segment, as in `/states/ky`. */
  readonly slug: string;
  /** Two-digit Census FIPS code. */
  readonly fips: string;
  readonly enabled: boolean;
  /** U.S. House seats. A single at-large seat uses district `00`. */
  readonly houseDistricts: number;
  /** IANA zones the state spans, earliest poll closing first. */
  readonly timeZones: readonly [string, ...string[]];
  /** Zone for timestamps shown on the site. */
  readonly displayTimeZone: string;
  /** Local poll closing time, 24-hour `HH:MM`. */
  readonly pollsClose: string;
  /** General election day, `YYYY-MM-DD`, for the current cycle. */
  readonly generalElection: string;
  readonly cycle: number;
  readonly results: {
    /** Unofficial election-night page. */
    readonly live: OfficialLink;
    /** Certified results page linked as “See official results”. */
    readonly official: OfficialLink;
    /** Short name used beside certified totals. */
    readonly sourceName: string;
  };
  /** Secretary of State candidate filing list. */
  readonly filings: { readonly name: string; readonly href: string };
  readonly map: {
    /** Congressional districts, 120th Congress lines. */
    readonly districts: string;
    readonly counties: string;
  };
};

export const STATES = {
  KY: {
    code: "KY",
    name: "Kentucky",
    slug: "ky",
    fips: "21",
    enabled: true,
    houseDistricts: 6,
    timeZones: ["America/New_York", "America/Chicago"],
    displayTimeZone: "America/New_York",
    pollsClose: "18:00",
    generalElection: "2026-11-03",
    cycle: 2026,
    results: {
      live: { href: "https://vrsws.sos.ky.gov/liveresults/", label: "Election night results" },
      official: { href: "https://elect.ky.gov/results/2020-2029/Pages/2026.aspx", label: "State Board of Elections results" },
      sourceName: "KY State Board of Elections",
    },
    filings: {
      name: "Kentucky Secretary of State",
      href: "https://web.sos.ky.gov/candidatefilings/Default.aspx?id=3",
    },
    map: {
      districts: "/geo/cd120/KY.json",
      counties: "/geo/counties/KY.json",
    },
  },
} as const satisfies Record<StateCode, StateConfig>;

/** The state the site shows today. */
export const DEFAULT_STATE: StateCode = "KY";

export function stateConfig(code: StateCode = DEFAULT_STATE): StateConfig {
  return STATES[code];
}

export function isStateCode(value: string): value is StateCode {
  return Object.prototype.hasOwnProperty.call(STATES, value);
}

export function enabledStates(): StateConfig[] {
  return Object.values(STATES).filter((state) => state.enabled);
}

/** Two-digit House district codes, `01` to `NN`, or `00` for an at-large seat. */
export function houseDistrictCodes(state: StateConfig): string[] {
  if (state.houseDistricts === 1) return ["00"];
  return Array.from({ length: state.houseDistricts }, (_, index) => String(index + 1).padStart(2, "0"));
}

/** Senate race first, then House districts in order. */
export function federalRaceIds(state: StateConfig, cycle = state.cycle): string[] {
  return [
    `${cycle}-senate-${state.code}`,
    ...houseDistrictCodes(state).map((district) => `${cycle}-house-${state.code}-${district}`),
  ];
}

/** True for `{year}-senate-ST` and `{year}-house-ST-DD` ids inside the state's districts. */
export function isFederalRaceIdFor(state: StateConfig, raceId: string): boolean {
  const match = /^\d{4}-(?:senate-([A-Z]{2})|house-([A-Z]{2})-(\d{2}))$/.exec(raceId);
  if (!match) return false;
  if (match[1]) return match[1] === state.code;
  return match[2] === state.code && houseDistrictCodes(state).includes(match[3]);
}

export function statePath(state: StateConfig): string {
  return `/states/${state.slug}`;
}
