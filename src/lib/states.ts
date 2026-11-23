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
  /**
   * How this state's shape is fitted and labeled. Other states use
   * {@link GENERIC_MAP_HINTS}. Kentucky's values are the ones the map used
   * before they lived here.
   */
  readonly mapHints: MapHints;
};

export type MapHints = {
  /** Padding when the districts are fitted into the map view. */
  readonly fitPad: number;
  /** Scale longitude by the state's middle latitude so the shape stays proportional. */
  readonly localLatitude: boolean;
  /** District codes whose numbers use the compact label. */
  readonly compactLabelDistricts: readonly string[];
  /** Skip the shared House legend. Kentucky's map has its own instruction. */
  readonly hideHouseLegend: boolean;
};

/** Fit used for any postal code that is not an enabled state entry. */
export const GENERIC_MAP_HINTS: MapHints = {
  fitPad: 20,
  localLatitude: false,
  compactLabelDistricts: [],
  hideHouseLegend: false,
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
    mapHints: {
      fitPad: 4,
      localLatitude: true,
      compactLabelDistricts: ["03"],
      hideHouseLegend: true,
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

/** Map fit and label rules for a postal code. Unknown codes keep the generic fit. */
export function mapHintsFor(postal: string): MapHints {
  return isStateCode(postal) ? STATES[postal].mapHints : GENERIC_MAP_HINTS;
}

/**
 * Character class for House district numbers 1 through N, when N is 2–9.
 * At-large states and states with 10 or more districts return null.
 */
export function houseDistrictDigitClass(state: StateConfig): string | null {
  if (state.houseDistricts < 2 || state.houseDistricts > 9) return null;
  return `1-${state.houseDistricts}`;
}

/**
 * House district digit named in a question, such as "District 3" or "district 03".
 * The capture is the same one the Kentucky Ask check used: one digit, 1 through
 * the state's House count.
 */
export function mentionedHouseDistrict(message: string, state: StateConfig = stateConfig()): string | null {
  const digits = houseDistrictDigitClass(state);
  if (!digits) return null;
  const match = new RegExp(`\\bdistrict\\s+0?([${digits}])\\b`, "i").exec(message);
  return match?.[1] ?? null;
}
