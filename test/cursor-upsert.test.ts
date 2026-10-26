import assert from "node:assert/strict";
import test from "node:test";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { buildSetExpression } from "../src/lib/data/expressions";
import { toWatermarkItem } from "../src/lib/data/items";
import { createDynamoRepository } from "../src/lib/data/repository";
import { runIngest } from "../src/lib/ingest/run";
import type { IngestWatermark } from "../src/lib/types";
import type { FetchedForm2Page } from "../src/lib/fec/client";

const writtenAt = "2026-10-26T05:00:00.000Z";

function cursor(overrides: Partial<IngestWatermark> = {}): IngestWatermark {
  return {
    source: "fec-efile-form2",
    lastLoadTimestamp: "2026-10-25 18:29:15",
    lastRunAt: writtenAt,
    lastStatus: "success",
    lastError: null,
    pagesFetched: 1,
    filingsUpserted: 0,
    skipped: 0,
    updatedAt: writtenAt,
    ...overrides,
  };
}

function attributesOf(item: Record<string, unknown>): Record<string, unknown> {
  const attributes = { ...item };
  delete attributes.pk;
  delete attributes.sk;
  return attributes;
}

test("watermark upsert expression always sets updatedAt", () => {
  const item = toWatermarkItem(cursor());
  const expression = buildSetExpression(attributesOf(item));
  assert.equal(expression.ExpressionAttributeValues[":updatedAt"], writtenAt);
  assert.match(expression.UpdateExpression, /#updatedAt = :updatedAt/);
  assert.match(
    expression.UpdateExpression,
    /#createdAt = if_not_exists\(#createdAt, :updatedAt\)/,
  );
  assert.equal(item.pk, "INGEST#F2");
  assert.equal(item.sk, "WATERMARK");
});

test("watermark falls back to lastRunAt when updatedAt is blank", () => {
  const item = toWatermarkItem(cursor({ updatedAt: "  ", lastRunAt: writtenAt }));
  const expression = buildSetExpression(attributesOf(item));
  assert.equal(expression.ExpressionAttributeValues[":updatedAt"], writtenAt);
});

test("saveWatermark and other ingest upserts send updatedAt", async () => {
  const updates: UpdateCommand["input"][] = [];
  const client = {
    send: async (command: unknown) => {
      if (command instanceof GetCommand) return {};
      if (command instanceof UpdateCommand) {
        updates.push(command.input);
        return {};
      }
      throw new Error("Unexpected DynamoDB command");
    },
  } as unknown as DynamoDBDocumentClient;

  const repo = createDynamoRepository({
    tableName: "candate-voter",
    client,
  });

  await repo.saveWatermark(cursor());

  const page: FetchedForm2Page = {
    page: 1,
    pages: 1,
    perPage: 100,
    results: [
      {
        candidate_id: "H4CA12019",
        candidate_first_name: "Jane",
        candidate_last_name: "Doe",
        candidate_office: "H",
        candidate_party: "DEM",
        candidate_district: "12",
        election_state: "CA",
        election_year: "2026",
        file_number: 1,
        load_timestamp: "2026-01-01 00:00:00",
        pdf_url: "https://docquery.fec.gov/pdf/1.pdf",
      },
    ],
  };

  await runIngest({
    repo,
    fec: {
      async *iterateForm2() {
        yield page;
      },
    },
    now: () => new Date(writtenAt),
  });

  assert.ok(updates.length >= 4);
  for (const update of updates) {
    const updatedAt = update.ExpressionAttributeValues?.[":updatedAt"];
    assert.equal(typeof updatedAt, "string");
    assert.ok(updatedAt && String(updatedAt).length > 0);
  }

  const watermarkWrites = updates.filter(
    (update) => update.Key?.pk === "INGEST#F2" && update.Key?.sk === "WATERMARK",
  );
  assert.ok(watermarkWrites.length >= 2);
  for (const update of watermarkWrites) {
    assert.equal(update.ExpressionAttributeValues?.[":updatedAt"], writtenAt);
    assert.equal(update.ExpressionAttributeValues?.[":entityType"], "ingestWatermark");
  }
});
