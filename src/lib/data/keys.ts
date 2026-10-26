import type { FederalOffice } from "../types";

/**
 * Single-table key layout for `candate-voter`.
 *
 * Table keys: `pk` (HASH), `sk` (RANGE).
 * GSI `gsi1`: `gsi1pk` (HASH), `gsi1sk` (RANGE), projection ALL.
 *
 * | Access | Operation |
 * | --- | --- |
 * | Get race | GetItem `pk=RACE#<raceId>`, `sk=META` |
 * | List races in a cycle | Query gsi1 `gsi1pk=CYCLE#<year>` |
 * | Get candidate | GetItem `pk=CAND#<candidateId>`, `sk=META` |
 * | List candidates in a race | Query gsi1 `gsi1pk=RACE#<raceId>` |
 * | List a candidate's filings | Query `pk=CAND#<candidateId>`, `sk` begins_with `FILING#` |
 * | Read or write the ingest cursor | Get/Update `pk=INGEST#F2`, `sk=WATERMARK` |
 *
 * Upserts are UpdateItem on those keys, so repeating a filing is idempotent.
 */

export const TABLE_KEYS = {
  partition: "pk",
  sort: "sk",
} as const;

export const GSI1 = {
  name: "gsi1",
  partition: "gsi1pk",
  sort: "gsi1sk",
} as const;

export const ENTITY_META_SK = "META";
export const FILING_SK_PREFIX = "FILING#";
export const INGEST_PK = "INGEST#F2";
export const INGEST_SK = "WATERMARK";

export function racePk(raceId: string): string {
  return `RACE#${raceId}`;
}

export function candidatePk(candidateId: string): string {
  return `CAND#${candidateId}`;
}

export function filingSk(filingId: string): string {
  return `${FILING_SK_PREFIX}${filingId}`;
}

export function cycleGsiPk(cycle: number): string {
  return `CYCLE#${cycle}`;
}

/**
 * Sort races inside a cycle by office, then state, then district.
 * President uses `US` / `00` so the sort key stays fixed-width-ish and
 * the stored race can still keep a null state.
 */
export function raceGsiSk(input: {
  office: FederalOffice;
  state: string | null;
  district: string | null;
  raceId: string;
}): string {
  const state = input.state ?? "US";
  const district = input.district ?? "00";
  return `${input.office}#${state}#${district}#${input.raceId}`;
}

export function candidateGsiSk(candidateId: string): string {
  return `CAND#${candidateId}`;
}
