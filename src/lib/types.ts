/**
 * Target records for a later DynamoDB model.
 * Nothing here is stored yet. FEC ingest is a separate worker.
 */

export type FederalOffice = "president" | "senate" | "house";

/** One federal contest. PK: raceId. */
export type Race = {
  raceId: string;
  office: FederalOffice;
  /** Election cycle year once filings are loaded. Null in the skeleton. */
  cycle: number | null;
  /** Postal state for Senate and House. Null for President. */
  state: string | null;
  /** House district label. Null for President and Senate. */
  district: string | null;
  title: string;
  jurisdiction: string;
  /** ISO-8601 time this record was written by our system. */
  updatedAt: string | null;
};

/** A person on a race. PK: candidateId. Query by raceId. */
export type Candidate = {
  candidateId: string;
  raceId: string;
  displayName: string;
  office: FederalOffice;
  /** Party string as reported by a filing source. Not an endorsement. */
  partyAffiliation: string | null;
  /** FEC candidate id, once Form 2 ingest maps it. */
  fecCandidateId: string | null;
  updatedAt: string | null;
};

/**
 * One retrieved filing. PK: filingId. Query by candidateId.
 * MVP ingest is FEC Form 2 (Statement of Candidacy) only.
 */
export type Filing = {
  filingId: string;
  candidateId: string;
  raceId: string;
  formType: "F2";
  fecFilingId: string | null;
  /** When the filing was submitted, according to the source. */
  filedAt: string | null;
  sourceUrl: string | null;
  /** When our worker stored this copy. */
  retrievedAt: string | null;
};
