import {
  ENTITY_META_SK,
  GSI1,
  INGEST_PK,
  INGEST_SK,
  TABLE_KEYS,
  candidateGsiSk,
  candidatePk,
  cycleGsiPk,
  filingSk,
  raceGsiSk,
  racePk,
} from "./keys";
import type {
  Candidate,
  FederalOffice,
  Filing,
  IngestWatermark,
  Race,
} from "../types";

export const SCHEMA_VERSION = 1;

const OFFICES: readonly FederalOffice[] = ["president", "senate", "house"];

export type RaceItem = {
  pk: string;
  sk: typeof ENTITY_META_SK;
  gsi1pk: string;
  gsi1sk: string;
  entityType: "race";
  schemaVersion: typeof SCHEMA_VERSION;
} & Race;

export type CandidateItem = {
  pk: string;
  sk: typeof ENTITY_META_SK;
  gsi1pk: string;
  gsi1sk: string;
  entityType: "candidate";
  schemaVersion: typeof SCHEMA_VERSION;
} & Candidate;

export type FilingItem = {
  pk: string;
  sk: string;
  entityType: "filing";
  schemaVersion: typeof SCHEMA_VERSION;
} & Filing;

export type WatermarkItem = {
  pk: typeof INGEST_PK;
  sk: typeof INGEST_SK;
  entityType: "ingestWatermark";
  schemaVersion: typeof SCHEMA_VERSION;
} & IngestWatermark;

function isOffice(value: unknown): value is FederalOffice {
  return typeof value === "string" && OFFICES.includes(value as FederalOffice);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStatus(value: unknown): IngestWatermark["lastStatus"] {
  if (value === "running" || value === "success" || value === "error") {
    return value;
  }
  return "error";
}

export function toRaceItem(race: Race): RaceItem {
  if (race.cycle == null) {
    throw new Error(`Race ${race.raceId} is missing a cycle`);
  }
  return {
    [TABLE_KEYS.partition]: racePk(race.raceId),
    [TABLE_KEYS.sort]: ENTITY_META_SK,
    [GSI1.partition]: cycleGsiPk(race.cycle),
    [GSI1.sort]: raceGsiSk({
      office: race.office,
      state: race.state,
      district: race.district,
      raceId: race.raceId,
    }),
    entityType: "race",
    schemaVersion: SCHEMA_VERSION,
    ...race,
    cycle: race.cycle,
  };
}

export function toCandidateItem(candidate: Candidate): CandidateItem {
  const { partyLabel, ...stored } = candidate;
  return {
    [TABLE_KEYS.partition]: candidatePk(candidate.candidateId),
    [TABLE_KEYS.sort]: ENTITY_META_SK,
    [GSI1.partition]: racePk(candidate.raceId),
    [GSI1.sort]: candidateGsiSk(candidate.candidateId),
    entityType: "candidate",
    schemaVersion: SCHEMA_VERSION,
    ...stored,
    ...(partyLabel ? { partyLabel } : {}),
  };
}

export function toFilingItem(filing: Filing): FilingItem {
  return {
    [TABLE_KEYS.partition]: candidatePk(filing.candidateId),
    [TABLE_KEYS.sort]: filingSk(filing.filingId),
    entityType: "filing",
    schemaVersion: SCHEMA_VERSION,
    ...filing,
  };
}

export function toWatermarkItem(watermark: IngestWatermark): WatermarkItem {
  const updatedAt = nonEmpty(watermark.updatedAt) ?? nonEmpty(watermark.lastRunAt);
  if (!updatedAt) {
    throw new Error("Ingest watermark is missing updatedAt");
  }
  return {
    [TABLE_KEYS.partition]: INGEST_PK,
    [TABLE_KEYS.sort]: INGEST_SK,
    entityType: "ingestWatermark",
    schemaVersion: SCHEMA_VERSION,
    ...watermark,
    updatedAt,
  };
}

function nonEmpty(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  return text.length > 0 ? text : null;
}

export function fromRaceItem(item: Record<string, unknown>): Race | null {
  if (item.entityType !== "race" || !isOffice(item.office)) return null;
  const raceId = asString(item.raceId);
  const title = asString(item.title);
  const jurisdiction = asString(item.jurisdiction);
  if (!raceId || !title || !jurisdiction) return null;
  return {
    raceId,
    office: item.office,
    cycle: asNumber(item.cycle),
    state: asString(item.state),
    district: asString(item.district),
    title,
    jurisdiction,
    sourceUrl: asString(item.sourceUrl),
    updatedAt: asString(item.updatedAt),
  };
}

export function fromCandidateItem(
  item: Record<string, unknown>,
): Candidate | null {
  if (item.entityType !== "candidate" || !isOffice(item.office)) return null;
  const candidateId = asString(item.candidateId);
  const raceId = asString(item.raceId);
  const displayName = asString(item.displayName);
  if (!candidateId || !raceId || !displayName) return null;
  return {
    candidateId,
    raceId,
    displayName,
    nameAsFiled: asString(item.nameAsFiled),
    office: item.office,
    partyAffiliation: asString(item.partyAffiliation),
    partyLabel: asString(item.partyLabel),
    fecCandidateId: asString(item.fecCandidateId),
    sourceUrl: asString(item.sourceUrl),
    sourceLoadedAt: asString(item.sourceLoadedAt),
    updatedAt: asString(item.updatedAt),
  };
}

export function fromFilingItem(item: Record<string, unknown>): Filing | null {
  if (item.entityType !== "filing" || item.formType !== "F2") return null;
  const filingId = asString(item.filingId);
  const candidateId = asString(item.candidateId);
  const raceId = asString(item.raceId);
  if (!filingId || !candidateId || !raceId) return null;
  return {
    filingId,
    candidateId,
    raceId,
    formType: "F2",
    fecFilingId: asString(item.fecFilingId),
    imageNumber: asString(item.imageNumber),
    filedAt: asString(item.filedAt),
    fecLoadTimestamp: asString(item.fecLoadTimestamp),
    sourceUrl: asString(item.sourceUrl),
    retrievedAt: asString(item.retrievedAt),
    updatedAt: asString(item.updatedAt),
  };
}

export function fromWatermarkItem(
  item: Record<string, unknown>,
): IngestWatermark | null {
  if (item.entityType !== "ingestWatermark") return null;
  return {
    source: "fec-efile-form2",
    lastLoadTimestamp: asString(item.lastLoadTimestamp),
    lastRunAt: asString(item.lastRunAt),
    lastStatus: asStatus(item.lastStatus),
    lastError: asString(item.lastError),
    pagesFetched: asNumber(item.pagesFetched) ?? 0,
    filingsUpserted: asNumber(item.filingsUpserted) ?? 0,
    skipped: asNumber(item.skipped) ?? 0,
    updatedAt: asString(item.updatedAt) ?? asString(item.lastRunAt) ?? "",
  };
}
