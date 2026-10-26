import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DEFAULT_TABLE_NAME,
  createDynamoRepository,
  tableNameFromEnv,
} from "../src/lib/data/repository";

test("table name defaults to candate-voter when unset or blank", () => {
  assert.equal(DEFAULT_TABLE_NAME, "candate-voter");
  assert.equal(tableNameFromEnv({}), "candate-voter");
  assert.equal(tableNameFromEnv({ CANDATE_TABLE_NAME: undefined }), "candate-voter");
  assert.equal(tableNameFromEnv({ CANDATE_TABLE_NAME: "   " }), "candate-voter");
});

test("an explicit table name is trimmed and used as-is", () => {
  assert.equal(
    tableNameFromEnv({ CANDATE_TABLE_NAME: "  other-table  " }),
    "other-table",
  );
});

test("repository creation does not require CANDATE_TABLE_NAME", () => {
  const previous = process.env.CANDATE_TABLE_NAME;
  delete process.env.CANDATE_TABLE_NAME;
  try {
    const repo = createDynamoRepository();
    assert.equal(typeof repo.getRace, "function");
    assert.equal(tableNameFromEnv(), "candate-voter");
  } finally {
    if (previous === undefined) delete process.env.CANDATE_TABLE_NAME;
    else process.env.CANDATE_TABLE_NAME = previous;
  }
});

test("Amplify build exposes the table name to Next SSR and not the FEC key", () => {
  const spec = readFileSync("amplify.yml", "utf8");
  const copy = spec
    .split("\n")
    .find((line) => line.includes("grep") && line.includes(".env.production"));
  assert.ok(copy);
  assert.match(copy, /\^CANDATE_TABLE_NAME=/);
  assert.match(copy, /\^CANDATE_CYCLES=/);
  assert.match(copy, /\^NEXT_PUBLIC_/);
  assert.equal(copy.includes("FEC_API_KEY"), false);
});
