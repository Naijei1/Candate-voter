/**
 * Domain records stored in the single DynamoDB table `candate-voter`.
 * Key layout and access helpers live in `src/lib/data/`.
 * FEC ingest maps `/v1/efile/form2/` into these shapes.
 *
 * Party is the affiliation code a filing reported. This model has no
 * score, rating, ranking, or endorsement attributes.
 */

export type FederalOffice = "president" | "senate" | "house";

/** One federal contest. Identified by `raceId`. */
export type Race = {
  raceId: string;
  office: FederalOffice;
  /** Election year as reported on the filing. */
  cycle: number | null;
  /** Postal state for Senate and House. Null for President. */
  state: string | null;
  /**
   * House district, two digits (`00` is at-large).
   * Null for President and Senate.
   */
  district: string | null;
  title: string;
  jurisdiction: string;
  /** Public page that lists candidates for this contest. */
  sourceUrl: string | null;
  /** ISO-8601 time our system last wrote this record. */
  updatedAt: string | null;
};

/** A person on a race, keyed by FEC candidate id when the filing has one. */
export type Candidate = {
  candidateId: string;
  raceId: string;
  displayName: string;
  /** Name string as printed on the filing, before display normalization. */
  nameAsFiled: string | null;
  office: FederalOffice;
  /** Party code as reported on the filing. Not an endorsement. */
  partyAffiliation: string | null;
  /** FEC candidate id. Null when the filing did not include one. */
  fecCandidateId: string | null;
  /** Candidate profile or, if there is no FEC id, the filing document. */
  sourceUrl: string | null;
  /**
   * Normalized FEC `load_timestamp` of the filing that last updated this
   * row. Older filings do not overwrite a newer one.
   */
  sourceLoadedAt: string | null;
  /** ISO-8601 time our system last wrote this record. */
  updatedAt: string | null;
};

/**
 * One retrieved Form 2 filing. Keyed by FEC `file_number` under its candidate.
 * The efile Form 2 feed does not include a submission timestamp; `filedAt`
 * stays null until a source provides one. `fecLoadTimestamp` is when FEC
 * loaded the electronic filing.
 */
export type Filing = {
  filingId: string;
  candidateId: string;
  raceId: string;
  formType: "F2";
  fecFilingId: string | null;
  imageNumber: string | null;
  /** When the filing was submitted, if the source says so. */
  filedAt: string | null;
  /** Normalized FEC load timestamp (`YYYY-MM-DD HH:MM:SS`). */
  fecLoadTimestamp: string | null;
  sourceUrl: string | null;
  /** ISO-8601 time our worker stored this copy. */
  retrievedAt: string | null;
  /** ISO-8601 time our system last wrote this record. */
  updatedAt: string | null;
};

/** Cursor for `/v1/efile/form2/` incremental ingest. */
export type IngestWatermark = {
  source: "fec-efile-form2";
  /** Inclusive lower bound already safe to re-read (`>=` on the FEC API). */
  lastLoadTimestamp: string | null;
  lastRunAt: string | null;
  lastStatus: "running" | "success" | "error";
  lastError: string | null;
  pagesFetched: number;
  filingsUpserted: number;
  skipped: number;
  /** ISO-8601 time our system last wrote this cursor. */
  updatedAt: string;
};
