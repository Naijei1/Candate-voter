import { AsyncLocalStorage } from "node:async_hooks";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { buildSetExpression } from "./expressions";
import {
  ENTITY_META_SK,
  FILING_SK_PREFIX,
  GSI1,
  INGEST_PK,
  INGEST_SK,
  TABLE_KEYS,
  candidatePk,
  cycleGsiPk,
  racePk,
} from "./keys";
import {
  fromCandidateItem,
  fromFilingItem,
  fromRaceItem,
  fromWatermarkItem,
  toCandidateItem,
  toFilingItem,
  toRaceItem,
  toWatermarkItem,
} from "./items";
import type { Candidate, Filing, IngestWatermark, Race } from "../types";
import { raceMatchesCycle } from "./cycle-match";
import { dropRosterRead, primeRosterRead, rosterCacheKey } from "./roster-cache";

export type CandidateUpsertResult = "applied" | "kept-newer";

export type VoterRepository = {
  upsertRace(race: Race): Promise<void>;
  upsertCandidate(candidate: Candidate): Promise<CandidateUpsertResult>;
  upsertFiling(filing: Filing): Promise<void>;
  getRace(raceId: string): Promise<Race | null>;
  listRacesByCycle(cycle: number): Promise<Race[]>;
  getCandidate(candidateId: string): Promise<Candidate | null>;
  listCandidatesForRace(raceId: string): Promise<Candidate[]>;
  listFilingsForCandidate(candidateId: string): Promise<Filing[]>;
  getWatermark(): Promise<IngestWatermark | null>;
  saveWatermark(watermark: IngestWatermark): Promise<void>;
  /**
   * Hide a duplicate candidate from reads. The row stays in the table.
   * Filings are not moved by this call.
   */
  markCandidateSuperseded(candidateId: string, supersededBy: string): Promise<void>;
};

const CANDIDATE_MONOTONIC =
  "attribute_not_exists(#sourceLoadedAt) OR #sourceLoadedAt <= :sourceLoadedAt";

type DocumentClient = DynamoDBDocumentClient;

let cached: { client: DocumentClient; tableName: string } | null = null;

const readAbort = new AsyncLocalStorage<AbortSignal>();

/** Table reads inside `work` stop when `signal` aborts. */
export function runWithReadAbort<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
  return readAbort.run(signal, work);
}

/**
 * Start the Dynamo credential and TLS handshake during process boot.
 * No-op outside Amplify compute so `next build` does not call the table.
 */
export function warmTableReads(): void {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.AWS_EXECUTION_ENV) return;
  try {
    void createDynamoRepository()
      .getWatermark()
      .catch(() => {});
  } catch {
    // The request path still reads. A boot failure must not crash the route.
  }
}

/** Public table name. Not a secret. Used when `CANDATE_TABLE_NAME` is unset. */
export const DEFAULT_TABLE_NAME = "candate-voter";

/**
 * Resolve the DynamoDB table.
 *
 * A non-empty `CANDATE_TABLE_NAME` wins. Otherwise this returns
 * `candate-voter`. Amplify WEB_COMPUTE does not pass console environment
 * variables into the Next.js server unless `amplify.yml` copies them into
 * `.env.production` before `next build`. The fallback still selects the
 * public table when that file is absent. This function does not read
 * `FEC_API_KEY`.
 */
export function tableNameFromEnv(
  env: Record<string, string | undefined> = process.env,
): string {
  const name = env.CANDATE_TABLE_NAME?.trim();
  return name || DEFAULT_TABLE_NAME;
}

export function createDynamoRepository(
  options: { tableName?: string; client?: DocumentClient } = {},
): VoterRepository {
  const tableName = options.tableName ?? tableNameFromEnv();
  const client = options.client ?? getSharedClient();
  return new DynamoVoterRepository(client, tableName);
}

function getSharedClient(): DocumentClient {
  const tableName = tableNameFromEnv();
  if (cached && cached.tableName === tableName) return cached.client;
  const region =
    process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
  const base = new DynamoDBClient({ region, maxAttempts: 5 });
  const client = DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  });
  cached = { client, tableName };
  return client;
}

class DynamoVoterRepository implements VoterRepository {
  readonly liveReads = true;

  constructor(
    private readonly client: DocumentClient,
    private readonly tableName: string,
  ) {}

  async upsertRace(race: Race): Promise<void> {
    dropRosterRead(rosterCacheKey("race", race.raceId));
    await this.update(toRaceItem(race));
  }

  async upsertCandidate(candidate: Candidate): Promise<CandidateUpsertResult> {
    dropRosterRead(rosterCacheKey("candidates", candidate.raceId));
    try {
      await this.update(toCandidateItem(candidate), CANDIDATE_MONOTONIC);
      return "applied";
    } catch (error) {
      if (isConditionFailure(error)) return "kept-newer";
      throw error;
    }
  }

  async upsertFiling(filing: Filing): Promise<void> {
    await this.update(toFilingItem(filing));
  }

  async getRace(raceId: string): Promise<Race | null> {
    const item = await this.get({
      pk: racePk(raceId),
      sk: ENTITY_META_SK,
    });
    const race = item ? fromRaceItem(item) : null;
    primeRosterRead(rosterCacheKey("race", raceId), race);
    return race;
  }

  async listRacesByCycle(cycle: number): Promise<Race[]> {
    const items = await this.queryAll({
      IndexName: GSI1.name,
      KeyConditionExpression: "#gsi1pk = :gsi1pk",
      ExpressionAttributeNames: { "#gsi1pk": GSI1.partition },
      ExpressionAttributeValues: { ":gsi1pk": cycleGsiPk(cycle) },
    });
    return items.flatMap((item) => {
      const race = fromRaceItem(item);
      return race && raceMatchesCycle(race, cycle) ? [race] : [];
    });
  }

  async getCandidate(candidateId: string): Promise<Candidate | null> {
    const item = await this.get({
      pk: candidatePk(candidateId),
      sk: ENTITY_META_SK,
    });
    return item ? fromCandidateItem(item) : null;
  }

  async listCandidatesForRace(raceId: string): Promise<Candidate[]> {
    const items = await this.queryAll({
      IndexName: GSI1.name,
      KeyConditionExpression: "#gsi1pk = :gsi1pk",
      ExpressionAttributeNames: { "#gsi1pk": GSI1.partition },
      ExpressionAttributeValues: { ":gsi1pk": racePk(raceId) },
    });
    const candidates = items.flatMap((item) => {
      const candidate = fromCandidateItem(item);
      return candidate ? [candidate] : [];
    });
    primeRosterRead(rosterCacheKey("candidates", raceId), candidates);
    return candidates;
  }

  async listFilingsForCandidate(candidateId: string): Promise<Filing[]> {
    const items = await this.queryAll({
      KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :prefix)",
      ExpressionAttributeNames: {
        "#pk": TABLE_KEYS.partition,
        "#sk": TABLE_KEYS.sort,
      },
      ExpressionAttributeValues: {
        ":pk": candidatePk(candidateId),
        ":prefix": FILING_SK_PREFIX,
      },
    });
    return items.flatMap((item) => {
      const filing = fromFilingItem(item);
      return filing ? [filing] : [];
    });
  }

  async getWatermark(): Promise<IngestWatermark | null> {
    const item = await this.get(
      { pk: INGEST_PK, sk: INGEST_SK },
      { consistent: true },
    );
    const watermark = item ? fromWatermarkItem(item) : null;
    primeRosterRead(rosterCacheKey("watermark"), watermark);
    return watermark;
  }

  async saveWatermark(watermark: IngestWatermark): Promise<void> {
    dropRosterRead(rosterCacheKey("watermark"));
    await this.update(toWatermarkItem(watermark));
  }

  async markCandidateSuperseded(
    candidateId: string,
    supersededBy: string,
  ): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: candidatePk(candidateId), sk: ENTITY_META_SK },
        UpdateExpression: "SET #supersededBy = :supersededBy",
        ExpressionAttributeNames: {
          "#supersededBy": "supersededBy",
          "#pk": "pk",
        },
        ExpressionAttributeValues: { ":supersededBy": supersededBy },
        ConditionExpression: "attribute_exists(#pk)",
      }),
    );
  }

  private async update(
    item: Record<string, unknown>,
    conditionExpression?: string,
  ): Promise<void> {
    const pk = item.pk;
    const sk = item.sk;
    if (typeof pk !== "string" || typeof sk !== "string") {
      throw new Error("Item is missing pk or sk");
    }
    const attributes = { ...item };
    delete attributes.pk;
    delete attributes.sk;
    const expression = buildSetExpression(attributes);
    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk, sk },
        UpdateExpression: expression.UpdateExpression,
        ExpressionAttributeNames: expression.ExpressionAttributeNames,
        ExpressionAttributeValues: expression.ExpressionAttributeValues,
        ...(conditionExpression
          ? { ConditionExpression: conditionExpression }
          : {}),
      }),
    );
  }

  private async get(
    key: { pk: string; sk: string },
    options: { consistent?: boolean } = {},
  ): Promise<Record<string, unknown> | null> {
    const signal = readAbort.getStore();
    throwIfAborted(signal);
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: key,
        ConsistentRead: options.consistent ?? false,
      }),
      signal ? { abortSignal: signal } : {},
    );
    return asRecord(result.Item);
  }

  private async queryAll(input: {
    IndexName?: string;
    KeyConditionExpression: string;
    ExpressionAttributeNames: Record<string, string>;
    ExpressionAttributeValues: Record<string, unknown>;
  }): Promise<Record<string, unknown>[]> {
    const items: Record<string, unknown>[] = [];
    let startKey: Record<string, unknown> | undefined;
    const signal = readAbort.getStore();
    do {
      throwIfAborted(signal);
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: input.IndexName,
          KeyConditionExpression: input.KeyConditionExpression,
          ExpressionAttributeNames: input.ExpressionAttributeNames,
          ExpressionAttributeValues: input.ExpressionAttributeValues,
          ExclusiveStartKey: startKey,
        }),
        signal ? { abortSignal: signal } : {},
      );
      for (const item of result.Items ?? []) {
        const record = asRecord(item);
        if (record) items.push(record);
      }
      startKey = result.LastEvaluatedKey;
    } while (startKey);
    return items;
  }
}

export function isLiveRepository(repo: object): boolean {
  return "liveReads" in repo && (repo as { liveReads?: boolean }).liveReads === true;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  throw error;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isConditionFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "ConditionalCheckFailedException"
  );
}
